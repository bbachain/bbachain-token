/**
 * Enhanced Liquidity Pool Utilities for BBAChain
 * Based on examples 00-create-liquidity-pool.ts and 01-create-lp-with-native.ts
 */

import {
	TOKEN_PROGRAM_ID,
	NATIVE_MINT,
	createInitializeAccountInstruction,
	createSyncNativeInstruction,
	createSetAuthorityInstruction,
	AuthorityType,
	createMint,
	mintTo
} from '@bbachain/spl-token'
import {
	createInitializeInstruction,
	PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID,
	createDefaultFees,
	createConstantProductCurve,
	CurveType,
	Fees,
	SwapCurve
} from '@bbachain/spl-token-swap'
import {
	Connection,
	Keypair,
	PublicKey,
	SystemProgram,
	Transaction,
	sendAndConfirmTransaction,
	BBA_DALTON_UNIT
} from '@bbachain/web3.js'
import BN from 'bn.js'

import { isNativeBBA } from '@/staticData/tokens'

import { MintInfo } from './types'

/**
 * Enhanced token account creation with manual control
 * Based on examples pattern for better authority control
 */
export async function createTokenAccountManual(
	connection: Connection,
	payer: Keypair,
	mint: PublicKey,
	owner: PublicKey
): Promise<PublicKey> {
	const tokenAccount = Keypair.generate()

	// Get minimum balance for token account
	const tokenAccountSpace = 165 // Standard token account size
	const rentExemptAmount = await connection.getMinimumBalanceForRentExemption(tokenAccountSpace)

	// Create account instruction
	const createAccountIx = SystemProgram.createAccount({
		fromPubkey: payer.publicKey,
		newAccountPubkey: tokenAccount.publicKey,
		daltons: rentExemptAmount,
		space: tokenAccountSpace,
		programId: TOKEN_PROGRAM_ID
	})

	// Initialize token account instruction
	const initAccountIx = createInitializeAccountInstruction(tokenAccount.publicKey, mint, owner)

	// Send transaction
	const transaction = new Transaction().add(createAccountIx, initAccountIx)
	await sendAndConfirmTransaction(connection, transaction, [payer, tokenAccount], {
		commitment: 'confirmed'
	})

	return tokenAccount.publicKey
}

/**
 * Wrap BBA to WBBA (Wrapped BBA)
 * Based on 01-create-lp-with-native.ts example
 */
export async function wrapBBAtoWBBA(
	connection: Connection,
	payer: Keypair,
	owner: PublicKey,
	amount: number
): Promise<PublicKey> {
	console.log(`🔄 Wrapping ${amount / BBA_DALTON_UNIT} BBA to WBBA...`)

	// Create WBBA token account using NATIVE_MINT
	const wbbaAccount = await createTokenAccountManual(connection, payer, NATIVE_MINT, owner)

	// Transfer BBA to the token account
	const transferIx = SystemProgram.transfer({
		fromPubkey: payer.publicKey,
		toPubkey: wbbaAccount,
		daltons: amount
	})

	// Sync native instruction to wrap BBA
	const syncIx = createSyncNativeInstruction(wbbaAccount)

	// Send transaction
	const wrapTransaction = new Transaction().add(transferIx, syncIx)
	await sendAndConfirmTransaction(connection, wrapTransaction, [payer], {
		commitment: 'confirmed'
	})

	console.log(`✅ Wrapped ${amount / BBA_DALTON_UNIT} BBA to WBBA`)
	console.log(`✅ WBBA Account: ${wbbaAccount.toBase58()}`)

	return wbbaAccount
}

/**
 * Create pool mint with proper authority handling
 * Based on examples pattern for authority transfer
 */
export async function createPoolMint(
	connection: Connection,
	payer: Keypair,
	tempAuthority: Keypair,
	decimals: number = 9
): Promise<PublicKey> {
	const poolMint = await createMint(connection, payer, tempAuthority.publicKey, null, decimals)

	console.log(`✅ Pool mint created: ${poolMint.toBase58()}`)

	return poolMint
}

/**
 * Transfer pool mint authority to swap authority
 * Based on examples pattern for proper authority handling
 */
export async function transferPoolMintAuthority(
	connection: Connection,
	payer: Keypair,
	poolMint: PublicKey,
	currentAuthority: Keypair,
	swapAuthority: PublicKey
): Promise<void> {
	console.log('🔄 Transferring pool mint authority to swap authority...')

	const setAuthorityIx = createSetAuthorityInstruction(
		poolMint,
		currentAuthority.publicKey,
		AuthorityType.MintTokens,
		swapAuthority
	)

	const setAuthorityTx = new Transaction().add(setAuthorityIx)
	await sendAndConfirmTransaction(connection, setAuthorityTx, [payer, currentAuthority])

	console.log('✅ Pool mint authority transferred to swap authority')
}

/**
 * Add initial liquidity to pool accounts
 * Handles both native BBA and regular SPL tokens
 */
export async function addInitialLiquidity(
	connection: Connection,
	payer: Keypair,
	authority: Keypair,
	tokenAMint: PublicKey,
	tokenBMint: PublicKey,
	tokenAAccount: PublicKey,
	tokenBAccount: PublicKey,
	tokenAAmount: number,
	tokenBAmount: number,
	tokenADecimals: number,
	tokenBDecimals: number
): Promise<void> {
	console.log('💰 Adding initial liquidity to pool accounts...')

	const tokenAAmountDaltons = Math.floor(tokenAAmount * Math.pow(10, tokenADecimals))
	const tokenBAmountDaltons = Math.floor(tokenBAmount * Math.pow(10, tokenBDecimals))

	// Handle native BBA (WBBA) differently
	if (isNativeBBA(tokenAMint.toBase58())) {
		console.log('🔄 Adding native BBA (WBBA) to pool vault...')

		// Transfer BBA daltons directly to WBBA vault
		const transferToVaultIx = SystemProgram.transfer({
			fromPubkey: payer.publicKey,
			toPubkey: tokenAAccount,
			daltons: tokenAAmountDaltons
		})

		// Sync native instruction to wrap BBA in the vault
		const syncVaultIx = createSyncNativeInstruction(tokenAAccount)

		// Send transaction to fund vault
		const fundVaultTransaction = new Transaction().add(transferToVaultIx, syncVaultIx)
		await sendAndConfirmTransaction(connection, fundVaultTransaction, [payer], {
			commitment: 'confirmed'
		})

		console.log(`✅ Added ${tokenAAmount} BBA to pool vault`)
	} else {
		// Regular SPL token - mint to pool account
		await mintTo(connection, payer, tokenAMint, tokenAAccount, authority, tokenAAmountDaltons)
		console.log(`✅ Added ${tokenAAmount} ${tokenAMint.toBase58().slice(0, 6)}... to pool account`)
	}

	if (isNativeBBA(tokenBMint.toBase58())) {
		console.log('🔄 Adding native BBA (WBBA) to pool vault...')

		// Transfer BBA daltons directly to WBBA vault
		const transferToVaultIx = SystemProgram.transfer({
			fromPubkey: payer.publicKey,
			toPubkey: tokenBAccount,
			daltons: tokenBAmountDaltons
		})

		// Sync native instruction to wrap BBA in the vault
		const syncVaultIx = createSyncNativeInstruction(tokenBAccount)

		// Send transaction to fund vault
		const fundVaultTransaction = new Transaction().add(transferToVaultIx, syncVaultIx)
		await sendAndConfirmTransaction(connection, fundVaultTransaction, [payer], {
			commitment: 'confirmed'
		})

		console.log(`✅ Added ${tokenBAmount} BBA to pool vault`)
	} else {
		// Regular SPL token - mint to pool account
		await mintTo(connection, payer, tokenBMint, tokenBAccount, authority, tokenBAmountDaltons)
		console.log(`✅ Added ${tokenBAmount} ${tokenBMint.toBase58().slice(0, 6)}... to pool account`)
	}

	console.log('✅ Initial liquidity added successfully')
}

/**
 * Enhanced pool creation with better validation and error handling
 * Based on examples 00-create-liquidity-pool.ts and 01-create-lp-with-native.ts
 */
export interface EnhancedPoolCreationParams {
	connection: Connection
	payer: Keypair
	authority: Keypair
	tokenAMint: PublicKey
	tokenBMint: PublicKey
	tokenAAmount: number
	tokenBAmount: number
	tokenADecimals: number
	tokenBDecimals: number
	feeTier: number // Fee tier in percentage (e.g., 0.25 for 0.25%)
	poolDecimals?: number
}

export interface EnhancedPoolCreationResult {
	tokenSwapAccount: PublicKey
	swapAuthority: PublicKey
	poolMint: PublicKey
	tokenAAccount: PublicKey
	tokenBAccount: PublicKey
	poolFeeAccount: PublicKey
	userPoolAccount: PublicKey
	signature: string
}

export async function createEnhancedPool(params: EnhancedPoolCreationParams): Promise<EnhancedPoolCreationResult> {
	const {
		connection,
		payer,
		authority,
		tokenAMint,
		tokenBMint,
		tokenAAmount,
		tokenBAmount,
		tokenADecimals,
		tokenBDecimals,
		feeTier,
		poolDecimals = 9
	} = params

	console.log('🚀 Starting enhanced pool creation...')
	console.log('📊 Pool Configuration:', {
		tokenA: tokenAMint.toBase58(),
		tokenB: tokenBMint.toBase58(),
		tokenAAmount,
		tokenBAmount,
		feeTier: `${feeTier}%`,
		isNativeBBAPool: isNativeBBA(tokenAMint.toBase58()) || isNativeBBA(tokenBMint.toBase58())
	})

	// Step 1: Create pool mint
	const poolMint = await createPoolMint(connection, payer, authority, poolDecimals)

	// Step 2: Create token swap account
	const tokenSwapAccount = Keypair.generate()
	const [swapAuthority, bumpSeed] = await PublicKey.findProgramAddress(
		[tokenSwapAccount.publicKey.toBuffer()],
		TOKEN_SWAP_PROGRAM_ID
	)

	console.log('🔑 Swap Account Details:')
	console.log(`  Token Swap Account: ${tokenSwapAccount.publicKey.toBase58()}`)
	console.log(`  Swap Authority: ${swapAuthority.toBase58()}`)
	console.log(`  Bump Seed: ${bumpSeed}`)

	// Step 3: Transfer pool mint authority to swap authority
	await transferPoolMintAuthority(connection, payer, poolMint, authority, swapAuthority)

	// Step 4: Create token accounts owned by swap authority
	console.log('🏦 Creating pool token accounts...')

	const tokenAAccount = await createTokenAccountManual(connection, payer, tokenAMint, swapAuthority)
	const tokenBAccount = await createTokenAccountManual(connection, payer, tokenBMint, swapAuthority)

	console.log(`  Token A Account: ${tokenAAccount.toBase58()}`)
	console.log(`  Token B Account: ${tokenBAccount.toBase58()}`)

	// Step 5: Create fee account and destination account
	console.log('💰 Creating fee & destination accounts...')

	const poolFeeAccount = await createTokenAccountManual(connection, payer, poolMint, payer.publicKey)
	const userPoolAccount = await createTokenAccountManual(connection, payer, poolMint, payer.publicKey)

	console.log(`  Pool Fee Account: ${poolFeeAccount.toBase58()}`)
	console.log(`  User Pool Account: ${userPoolAccount.toBase58()}`)

	// Step 6: Add initial liquidity
	await addInitialLiquidity(
		connection,
		payer,
		authority,
		tokenAMint,
		tokenBMint,
		tokenAAccount,
		tokenBAccount,
		tokenAAmount,
		tokenBAmount,
		tokenADecimals,
		tokenBDecimals
	)

	// Step 7: Configure fees and curve
	console.log('🔧 Configuring pool parameters...')

	const feeNumerator = Math.floor(feeTier * 100) // Convert percentage to basis points
	const feeDenominator = 10000

	const fees: Fees = {
		tradeFeeNumerator: new BN(feeNumerator),
		tradeFeeDenominator: new BN(feeDenominator),
		ownerTradeFeeNumerator: new BN(0),
		ownerTradeFeeDenominator: new BN(0),
		ownerWithdrawFeeNumerator: new BN(0),
		ownerWithdrawFeeDenominator: new BN(0),
		hostFeeNumerator: new BN(0),
		hostFeeDenominator: new BN(0)
	}

	const swapCurve: SwapCurve = {
		curveType: CurveType.ConstantProduct,
		calculator: new Array(32).fill(0)
	}

	console.log(`  Trade Fee: ${feeTier}% (${feeNumerator}/${feeDenominator})`)
	console.log('  Curve Type: Constant Product')

	// Step 8: Create initialize instruction
	console.log('🔧 Creating initialize instruction...')

	const initializeInstruction = createInitializeInstruction(
		{
			tokenSwap: tokenSwapAccount.publicKey,
			authority: swapAuthority,
			tokenA: tokenAAccount,
			tokenB: tokenBAccount,
			poolMint: poolMint,
			feeAccount: poolFeeAccount,
			destination: userPoolAccount,
			tokenProgram: TOKEN_PROGRAM_ID
		},
		{ fees, swapCurve }
	)

	// Step 9: Create account instruction for token swap account
	const swapAccountSpace = 324 // Standard token swap account size
	const createAccountInstruction = SystemProgram.createAccount({
		fromPubkey: payer.publicKey,
		newAccountPubkey: tokenSwapAccount.publicKey,
		daltons: await connection.getMinimumBalanceForRentExemption(swapAccountSpace),
		space: swapAccountSpace,
		programId: TOKEN_SWAP_PROGRAM_ID
	})

	// Step 10: Send initialize transaction
	console.log('🚀 Initializing pool...')

	const initTransaction = new Transaction().add(createAccountInstruction, initializeInstruction)

	const signature = await sendAndConfirmTransaction(connection, initTransaction, [payer, tokenSwapAccount], {
		commitment: 'confirmed'
	})

	console.log('✅ Pool initialization successful!')
	console.log(`  Signature: ${signature}`)

	// Verify the swap account was created
	const swapAccountInfo = await connection.getAccountInfo(tokenSwapAccount.publicKey)
	console.log(`  Swap account created: ${swapAccountInfo !== null}`)
	console.log(`  Swap account data length: ${swapAccountInfo?.data.length}`)

	return {
		tokenSwapAccount: tokenSwapAccount.publicKey,
		swapAuthority,
		poolMint,
		tokenAAccount,
		tokenBAccount,
		poolFeeAccount,
		userPoolAccount,
		signature
	}
}

/**
 * Validate pool creation parameters
 * Based on examples validation patterns
 */
export function validatePoolCreationParams(params: EnhancedPoolCreationParams): void {
	const { tokenAMint, tokenBMint, tokenAAmount, tokenBAmount, tokenADecimals, tokenBDecimals, feeTier } = params

	// Check if tokens are different
	if (tokenAMint.equals(tokenBMint)) {
		throw new Error('Token A and Token B must be different')
	}

	// Check if amounts are valid
	if (tokenAAmount <= 0 || tokenBAmount <= 0) {
		throw new Error('Token amounts must be greater than zero')
	}

	// Check if decimals are valid
	if (tokenADecimals < 0 || tokenADecimals > 18 || tokenBDecimals < 0 || tokenBDecimals > 18) {
		throw new Error('Token decimals must be between 0 and 18')
	}

	// Check if fee tier is valid
	if (feeTier < 0.01 || feeTier > 10) {
		throw new Error('Fee tier must be between 0.01% and 10%')
	}

	console.log('✅ Pool creation parameters validation passed')
}

/**
 * Get pool creation summary
 */
export function getPoolCreationSummary(result: EnhancedPoolCreationResult, params: EnhancedPoolCreationParams): void {
	const { tokenAMint, tokenBMint } = params

	console.log('\n📊 Pool Creation Summary:')
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
	console.log(`🏊 Pool Address: ${result.tokenSwapAccount.toBase58()}`)
	console.log(`🔑 Swap Authority: ${result.swapAuthority.toBase58()}`)
	console.log(`🪙 Token A: ${tokenAMint.toBase58()}`)
	console.log(`🪙 Token B: ${tokenBMint.toBase58()}`)
	console.log(`🎟️  Pool Token: ${result.poolMint.toBase58()}`)
	console.log(`🏦 Token A Vault: ${result.tokenAAccount.toBase58()}`)
	console.log(`🏦 Token B Vault: ${result.tokenBAccount.toBase58()}`)
	console.log(`💰 Fee Account: ${result.poolFeeAccount.toBase58()}`)
	console.log(`👤 User Pool Account: ${result.userPoolAccount.toBase58()}`)
	console.log(`📝 Transaction: ${result.signature}`)
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

	if (isNativeBBA(tokenAMint.toBase58()) || isNativeBBA(tokenBMint.toBase58())) {
		console.log('\n⚠️  Native BBA Pool Notes:')
		console.log('- This pool involves native BBA (WBBA)')
		console.log('- BBA is automatically wrapped when deposited')
		console.log('- Unwrap WBBA to BBA after swapping if needed')
	}

	console.log('\n💡 Next Steps:')
	console.log('1. Add more liquidity to improve trading depth')
	console.log('2. Start trading using the swap interface')
	console.log('3. Monitor pool performance and fees')
	console.log('4. Consider adding to farming programs')
}
