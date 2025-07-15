/**
 * Create BBA/SHIB Liquidity Pool - BBAChain Native Token Liquidity Pool
 * Based on 00-create-liquidity-pool.ts pattern
 *
 * Process:
 * 1. Wrap BBA to WBBA (So1111111...12)
 * 2. Create SHIB token mint with 9 decimals
 * 3. Create pool mint for LP tokens
 * 4. Create token accounts using manual pattern
 * 5. Initialize token swap pool
 * 6. Add initial liquidity
 */

import {
	Connection,
	PublicKey,
	Keypair,
	BBA_DALTON_UNIT,
	Transaction,
	SystemProgram,
	sendAndConfirmTransaction
} from '@bbachain/web3.js'
import {
	TOKEN_PROGRAM_ID,
	createMint,
	mintTo,
	createInitializeAccountInstruction,
	createSetAuthorityInstruction,
	AuthorityType,
	NATIVE_MINT,
	createSyncNativeInstruction
} from '@bbachain/spl-token'
import {
	createInitializeInstruction,
	PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID,
	createDefaultFees,
	createConstantProductCurve
} from '../src'

// BBAChain configuration with NATIVE_MINT
// const connection = new Connection('http://localhost:8899', 'confirmed');
const connection = new Connection('https://api-testnet.bbachain.com', 'confirmed')

/**
 * Helper function to create token account manually following pattern from 00-create-liquidity-pool.ts
 */
async function createTokenAccountManual(
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
	await sendAndConfirmTransaction(connection, transaction, [payer, tokenAccount], { commitment: 'confirmed' })

	return tokenAccount.publicKey
}

/**
 * Helper function to wrap BBA to WBBA
 */
async function wrapBBAtoWBBA(
	connection: Connection,
	payer: Keypair,
	owner: PublicKey,
	amount: number
): Promise<PublicKey> {
	console.log('🔄 Wrapping BBA to WBBA...')

	// Create WBBA token account
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

async function createLiquidityPoolWithNative() {
	console.log('🚀 Starting BBA/SHIB liquidity pool creation (following 00-create-liquidity-pool.ts pattern)...\n')

	// 1. Create keypairs
	const payer = Keypair.generate()
	const authority = Keypair.generate()

	console.log('Payer:', payer.publicKey.toBase58())
	console.log('Authority:', authority.publicKey.toBase58())

	// 2. Airdrop BBA to payer
	console.log('💰 Requesting airdrop...')
	try {
		const airdropSignature = await connection.requestAirdrop(
			payer.publicKey,
			2 * BBA_DALTON_UNIT // Increased to 2 BBA for sufficient funds
		)
		await connection.confirmTransaction(airdropSignature)
		console.log('✅ Airdrop completed successfully')
	} catch (error) {
		console.error('❌ Airdrop failed:', error)
		throw error
	}

	// 3. Wrap BBA to WBBA
	console.log('\n=== Wrapping BBA to WBBA ===')
	const wrapAmount = 0.5 * BBA_DALTON_UNIT // 0.5 BBA for user
	const userWBBAAccount = await wrapBBAtoWBBA(connection, payer, payer.publicKey, wrapAmount)

	// 4. Create SHIB token mint
	console.log('\n=== Creating SHIB Token Mint ===')
	const shibMint = await createMint(
		connection,
		payer,
		authority.publicKey, // mint authority
		null, // freeze authority
		9 // 9 decimals
	)
	console.log('✅ SHIB Mint:', shibMint.toBase58())

	// 5. Create pool mint for LP tokens
	console.log('\n=== Creating Pool Mint ===')
	const poolMint = await createMint(
		connection,
		payer,
		authority.publicKey, // Temporary authority
		null,
		9
	)
	console.log('✅ Pool Mint:', poolMint.toBase58())

	// 6. Create token swap account
	console.log('\n=== Creating Token Swap Account ===')
	const tokenSwapAccount = Keypair.generate()

	// Derive swap authority PDA
	const [swapAuthority, bumpSeed] = await PublicKey.findProgramAddress(
		[tokenSwapAccount.publicKey.toBuffer()],
		TOKEN_SWAP_PROGRAM_ID
	)

	console.log('Token Swap Account:', tokenSwapAccount.publicKey.toBase58())
	console.log('Swap Authority:', swapAuthority.toBase58())
	console.log('Bump Seed:', bumpSeed)

	// 7. Transfer pool mint authority to swap authority
	console.log('\n=== Transferring Pool Mint Authority ===')
	const setAuthorityIx = createSetAuthorityInstruction(
		poolMint,
		authority.publicKey,
		AuthorityType.MintTokens,
		swapAuthority
	)

	const setAuthorityTx = new Transaction().add(setAuthorityIx)
	await sendAndConfirmTransaction(connection, setAuthorityTx, [payer, authority])
	console.log('✅ Pool mint authority transferred to swap authority')

	// 8. Create token accounts owned by swap authority (WBBA and SHIB vaults)
	console.log('\n=== Creating Pool Token Accounts ===')

	// WBBA vault (Token A) - using NATIVE_MINT
	const tokenAAccount = await createTokenAccountManual(connection, payer, NATIVE_MINT, swapAuthority)

	// SHIB vault (Token B)
	const tokenBAccount = await createTokenAccountManual(connection, payer, shibMint, swapAuthority)

	console.log('✅ WBBA Vault (Token A):', tokenAAccount.toBase58())
	console.log('✅ SHIB Vault (Token B):', tokenBAccount.toBase58())

	// 9. Create fee account and destination account
	console.log('\n=== Creating Fee & Destination Accounts ===')

	// Fee account: for collecting trading fees (owned by payer, NOT swap authority)
	const poolFeeAccount = await createTokenAccountManual(
		connection,
		payer,
		poolMint,
		payer.publicKey // Owner is payer, NOT swap authority
	)

	// Destination account: for initial pool token supply (owned by payer, NOT swap authority)
	const userPoolAccount = await createTokenAccountManual(
		connection,
		payer,
		poolMint,
		payer.publicKey // Owner is payer, NOT swap authority
	)

	console.log('✅ Pool Fee Account:', poolFeeAccount.toBase58())
	console.log('✅ User Pool Account:', userPoolAccount.toBase58())

	// 10. Create user SHIB account
	console.log('\n=== Creating User SHIB Account ===')

	// User SHIB account
	const userShibAccount = await createTokenAccountManual(connection, payer, shibMint, payer.publicKey)

	console.log('✅ User WBBA Account:', userWBBAAccount.toBase58())
	console.log('✅ User SHIB Account:', userShibAccount.toBase58())

	// 11. Mint initial SHIB tokens to user
	console.log('\n=== Minting Initial SHIB Tokens ===')
	const shibAmount = 1000000 * 10 ** 9 // 1M SHIB tokens
	await mintTo(connection, payer, shibMint, userShibAccount, authority, shibAmount)
	console.log(`✅ Minted ${shibAmount / 10 ** 9} SHIB tokens to user`)

	// 12. Add initial tokens to pool accounts for initialization
	console.log('\n=== Adding Initial Tokens to Pool Accounts ===')

	// Add SHIB to pool account
	const poolShibAmount = 50000 * 10 ** 9 // 50K SHIB
	await mintTo(connection, payer, shibMint, tokenBAccount, authority, poolShibAmount)
	console.log(`✅ Added ${poolShibAmount / 10 ** 9} SHIB to pool account`)

	// Add WBBA to pool vault - create WBBA directly in the vault
	console.log('🔄 Adding WBBA to pool vault...')
	const poolWBBAAmount = 0.2 * BBA_DALTON_UNIT // 0.2 BBA

	// Transfer BBA daltons directly to WBBA vault
	const transferToVaultIx = SystemProgram.transfer({
		fromPubkey: payer.publicKey,
		toPubkey: tokenAAccount,
		daltons: poolWBBAAmount
	})

	// Sync native instruction to wrap BBA in the vault
	const syncVaultIx = createSyncNativeInstruction(tokenAAccount)

	// Send transaction to fund vault
	const fundVaultTransaction = new Transaction().add(transferToVaultIx, syncVaultIx)
	await sendAndConfirmTransaction(connection, fundVaultTransaction, [payer], {
		commitment: 'confirmed'
	})

	console.log(`✅ Added ${poolWBBAAmount / BBA_DALTON_UNIT} WBBA to pool vault`)
	console.log('✅ Pool vault funded successfully')

	// 13. Validate token accounts before initialization
	console.log('\n=== Validating Token Account Data ===')

	// Check WBBA vault account
	const tokenAAccountInfo = await connection.getAccountInfo(tokenAAccount)
	console.log('WBBA Vault Account Info:')
	console.log('  Owner:', tokenAAccountInfo?.owner.toBase58())
	console.log('  Data length:', tokenAAccountInfo?.data.length)

	// Check SHIB vault account
	const tokenBAccountInfo = await connection.getAccountInfo(tokenBAccount)
	console.log('SHIB Vault Account Info:')
	console.log('  Owner:', tokenBAccountInfo?.owner.toBase58())
	console.log('  Data length:', tokenBAccountInfo?.data.length)

	// Check pool mint
	const poolMintInfo = await connection.getAccountInfo(poolMint)
	console.log('Pool Mint Info:')
	console.log('  Owner:', poolMintInfo?.owner.toBase58())
	console.log('  Data length:', poolMintInfo?.data.length)

	// 14. Configure fees and curve
	console.log('\n=== Configuring Pool ===')

	// Use default fees from library
	const fees = createDefaultFees()
	const swapCurve = createConstantProductCurve()

	console.log('✅ Trade Fee: 0.25%')
	console.log('✅ Owner Fee: 0.05%')
	console.log('✅ Curve Type: Constant Product (Uniswap-style)')

	// 15. Create initialize instruction
	console.log('\n=== Preparing Pool Initialization ===')

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

	console.log('✅ Initialize instruction created successfully')
	console.log('Instruction data length:', initializeInstruction.data.length)

	// Create account instruction for token swap account
	const swapAccountSpace = 324
	const createAccountInstruction = SystemProgram.createAccount({
		fromPubkey: payer.publicKey,
		newAccountPubkey: tokenSwapAccount.publicKey,
		daltons: await connection.getMinimumBalanceForRentExemption(swapAccountSpace),
		space: swapAccountSpace,
		programId: TOKEN_SWAP_PROGRAM_ID
	})

	console.log('Token swap account space:', swapAccountSpace)
	console.log('Rent exempt amount:', await connection.getMinimumBalanceForRentExemption(swapAccountSpace))

	// 16. Send initialize transaction
	console.log('\n=== Initializing Pool ===')

	const initTransaction = new Transaction().add(createAccountInstruction, initializeInstruction)

	// Send the actual transaction
	try {
		const signature = await sendAndConfirmTransaction(connection, initTransaction, [payer, tokenSwapAccount], {
			commitment: 'confirmed'
		})

		console.log('✅ Initialize transaction successful!')
		console.log('Signature:', signature)

		// Verify the swap account was created
		const swapAccountInfo = await connection.getAccountInfo(tokenSwapAccount.publicKey)
		console.log('✅ Swap account created:', swapAccountInfo !== null)
		console.log('Swap account data length:', swapAccountInfo?.data.length)
	} catch (error) {
		console.error('❌ Initialize transaction failed:', error)

		// Try simulation to see what the error is
		try {
			const simulationResult = await connection.simulateTransaction(initTransaction, [payer, tokenSwapAccount])
			console.log('Simulation logs:', simulationResult.value.logs)
		} catch (simError) {
			console.error('Simulation also failed:', simError)
		}
		throw error
	}

	// 17. Pool information
	console.log('\n📊 WBBA/SHIB Liquidity Pool Information:')
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
	console.log(`🏊 Pool Address: ${tokenSwapAccount.publicKey.toBase58()}`)
	console.log(`🪙 Token A (WBBA): ${NATIVE_MINT.toBase58()}`)
	console.log(`🪙 Token B (SHIB): ${shibMint.toBase58()}`)
	console.log(`🎟️  Pool Token: ${poolMint.toBase58()}`)
	console.log(`🏦 WBBA Vault: ${tokenAAccount.toBase58()}`)
	console.log(`🏦 SHIB Vault: ${tokenBAccount.toBase58()}`)
	console.log(`💰 Fee Account: ${poolFeeAccount.toBase58()}`)
	console.log(`👤 User Pool Account: ${userPoolAccount.toBase58()}`)
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

	console.log('\n🎯 How to use the pool:')
	console.log('1. Swap WBBA ↔ SHIB using pool address')
	console.log('2. Wrap BBA to WBBA before swapping')
	console.log('3. Add liquidity to earn trading fees')
	console.log('4. Remove liquidity using LP tokens')
	console.log('5. Pool automatically balances using constant product formula')

	console.log('\n⚠️  BBAChain Notes:')
	console.log('- Wrap BBA to WBBA (So1111111...12) before use')
	console.log('- WBBA operates as SPL token standard')
	console.log('- Pool operates as AMM standard with BBAChain testnet')
	console.log('- Unwrap WBBA to BBA after swap if needed')

	return {
		swapProgramAccount: tokenSwapAccount.publicKey,
		tokenAVault: tokenAAccount,
		tokenBVault: tokenBAccount,
		poolTokenMint: poolMint,
		wbbaAccount: userWBBAAccount,
		shibAccount: userShibAccount,
		poolTokenAccount: userPoolAccount,
		shibMint: shibMint,
		swapAuthority: swapAuthority
	}
}

// Improved demo swap function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function demoSwap(poolInfo: any) {
	console.log('\n🔄 Demo swap WBBA → SHIB...')

	try {
		console.log(`📊 Pool Address: ${poolInfo.swapProgramAccount.toBase58()}`)
		console.log(`🪙 WBBA → SHIB`)
		console.log('⚠️  Need WBBA balance in user account to perform swap')
		console.log('⚠️  Use TokenSwap library methods to perform actual swap')

		// Simulate swap calculation
		const swapAmount = 0.3 * BBA_DALTON_UNIT // 0.3 WBBA
		console.log(`Swap amount: ${swapAmount / BBA_DALTON_UNIT} WBBA`)

		// In production, use TokenSwap.swap() method
		console.log('✅ Swap demo completed (simulation only)')
	} catch (error) {
		console.error('❌ Swap demo error:', error.message)
	}
}

// Main execution
async function main() {
	try {
		console.log('🌟 BBAChain WBBA/SHIB Liquidity Pool Demo (BBAChain Testnet)')
		console.log('═══════════════════════════════════════════════════════════')
		console.log(`🔗 NATIVE_MINT: ${NATIVE_MINT.toBase58()}`)
		console.log(`🌐 Connection: ${connection.rpcEndpoint}`)
		console.log('═══════════════════════════════════════════════════════════\n')

		const poolInfo = await createLiquidityPoolWithNative()
		await demoSwap(poolInfo)

		console.log('\n🎉 Demo completed successfully!')
		console.log('💡 For production use:')
		console.log('   1. Wrap BBA to WBBA before swapping')
		console.log('   2. Fund WBBA vault account with WBBA tokens')
		console.log('   3. Use TokenSwap library methods for swapping')
		console.log('   4. Add/remove liquidity according to AMM protocol')
		console.log('   5. Unwrap WBBA to BBA after swap')
	} catch (error) {
		console.error('❌ Error:', error)
		console.error('Stack trace:', error.stack)
		process.exit(1)
	}
}

// Execute if run directly
if (require.main === module) {
	main()
}

export { createLiquidityPoolWithNative, demoSwap, createTokenAccountManual, wrapBBAtoWBBA }
