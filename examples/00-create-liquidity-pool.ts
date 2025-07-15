import {
	Connection,
	Keypair,
	PublicKey,
	Transaction,
	SystemProgram,
	sendAndConfirmTransaction,
	BBA_DALTON_UNIT
} from '@bbachain/web3.js'
import {
	createInitializeInstruction,
	CurveType,
	Fees,
	SwapCurve,
	PROGRAM_ID,
	createDefaultFees,
	createConstantProductCurve
} from '../src'
import {
	createMint,
	mintTo,
	TOKEN_PROGRAM_ID,
	createInitializeAccountInstruction,
	createSetAuthorityInstruction,
	AuthorityType
} from '@bbachain/spl-token'
import BN from 'bn.js'

/**
 * Helper function to create a token account manually
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
 * Example: Create a new liquidity pool for token swap
 *
 * This example demonstrates:
 * 1. Creating two test tokens (Token A and Token B)
 * 2. Creating a new token swap pool
 * 3. Adding initial liquidity to the pool
 */

async function createLiquidityPoolExample() {
	// Connect to BBAChain testnet
	const connection = new Connection('https://api-testnet.bbachain.com', 'confirmed')

	// Generate keypairs
	const payer = Keypair.generate()
	const authority = Keypair.generate()

	console.log('Payer:', payer.publicKey.toBase58())
	console.log('Authority:', authority.publicKey.toBase58())

	// Airdrop BBA to payer for transactions
	console.log('Requesting airdrop...')
	try {
		const airdropSignature = await connection.requestAirdrop(payer.publicKey, BBA_DALTON_UNIT)
		await connection.confirmTransaction(airdropSignature)
		console.log('Airdrop completed successfully')
	} catch (error) {
		console.error('Airdrop failed:', error)
		throw error
	}

	// Step 1: Create Token A and Token B mints
	console.log('\n=== Creating Token Mints ===')

	const tokenAMint = await createMint(
		connection,
		payer,
		authority.publicKey, // mint authority
		null, // freeze authority
		6 // decimals
	)

	const tokenBMint = await createMint(connection, payer, authority.publicKey, null, 6)

	console.log('Token A Mint:', tokenAMint.toBase58())
	console.log('Token B Mint:', tokenBMint.toBase58())

	// Step 2: Create pool mint for LP tokens (will need to be transferred to swap authority)
	console.log('\n=== Creating Pool Mint ===')

	// Create pool mint with temporary authority, then transfer to swap authority
	const poolMint = await createMint(
		connection,
		payer,
		authority.publicKey, // Temporary authority
		null,
		6
	)

	console.log('Pool Mint:', poolMint.toBase58())

	// Step 3: Create token swap account
	const tokenSwapAccount = Keypair.generate()

	// Derive swap authority PDA
	const [swapAuthority, bumpSeed] = await PublicKey.findProgramAddress(
		[tokenSwapAccount.publicKey.toBuffer()],
		PROGRAM_ID
	)

	console.log('\n=== Swap Account Details ===')
	console.log('Token Swap Account:', tokenSwapAccount.publicKey.toBase58())
	console.log('Swap Authority:', swapAuthority.toBase58())
	console.log('Bump Seed:', bumpSeed)

	// Transfer pool mint authority to swap authority
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

	// Step 4: Create token accounts owned by swap authority (manual creation)
	console.log('\n=== Creating Pool Token Accounts ===')

	const tokenAAccount = await createTokenAccountManual(connection, payer, tokenAMint, swapAuthority)

	const tokenBAccount = await createTokenAccountManual(connection, payer, tokenBMint, swapAuthority)

	// Step 7: Create fee account and destination account (NOT owned by swap authority)
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

	console.log('Pool Fee Account:', poolFeeAccount.toBase58())
	console.log('User Pool Account:', userPoolAccount.toBase58())

	// Step 5: Create user token accounts for initial deposit (manual creation)
	console.log('\n=== Creating User Token Accounts ===')

	const userTokenAAccount = await createTokenAccountManual(connection, payer, tokenAMint, payer.publicKey)

	const userTokenBAccount = await createTokenAccountManual(connection, payer, tokenBMint, payer.publicKey)

	console.log('User Token A Account:', userTokenAAccount.toBase58())
	console.log('User Token B Account:', userTokenBAccount.toBase58())

	// Step 6: Mint initial tokens to user
	console.log('\n=== Minting Initial Tokens ===')

	const tokenAAmount = 1000000000 // 1,000 tokens (6 decimals)
	const tokenBAmount = 2000000000 // 2,000 tokens (6 decimals)

	await mintTo(connection, payer, tokenAMint, userTokenAAccount, authority, tokenAAmount)

	await mintTo(connection, payer, tokenBMint, userTokenBAccount, authority, tokenBAmount)

	console.log(`Token A: ${tokenAAmount / 1e6} tokens minted`)
	console.log(`Token B: ${tokenBAmount / 1e6} tokens minted`)

	// Step 6.5: Add tokens to pool accounts before initialization
	console.log('\n=== Adding Initial Tokens to Pool Accounts ===')

	// Add some tokens to pool accounts (required for initialization)
	const poolTokenAAmount = 1000 * 1e6 // 1000 tokens
	const poolTokenBAmount = 2000 * 1e6 // 2000 tokens

	await mintTo(connection, payer, tokenAMint, tokenAAccount, authority, poolTokenAAmount)

	await mintTo(connection, payer, tokenBMint, tokenBAccount, authority, poolTokenBAmount)

	console.log(`Pool Token A: ${poolTokenAAmount / 1e6} tokens added`)
	console.log(`Pool Token B: ${poolTokenBAmount / 1e6} tokens added`)

	// Step 7: Configure fees and curve
	console.log('\n=== Configuring Pool ===')

	console.log('Trade Fee: 0.25%')
	console.log('Owner Fee: 0.05%')
	console.log('Curve Type: Constant Product (Uniswap-style)')

	// Step 8: Validate token accounts before initialization
	console.log('\n=== Validating Token Account Data ===')

	// Check token A account
	const tokenAAccountInfo = await connection.getAccountInfo(tokenAAccount)
	console.log('Token A Account Info:')
	console.log('  Owner:', tokenAAccountInfo?.owner.toBase58())
	console.log('  Data length:', tokenAAccountInfo?.data.length)
	console.log('  Executable:', tokenAAccountInfo?.executable)

	// Check token B account
	const tokenBAccountInfo = await connection.getAccountInfo(tokenBAccount)
	console.log('Token B Account Info:')
	console.log('  Owner:', tokenBAccountInfo?.owner.toBase58())
	console.log('  Data length:', tokenBAccountInfo?.data.length)
	console.log('  Executable:', tokenBAccountInfo?.executable)

	// Check pool mint
	const poolMintInfo = await connection.getAccountInfo(poolMint)
	console.log('Pool Mint Info:')
	console.log('  Owner:', poolMintInfo?.owner.toBase58())
	console.log('  Data length:', poolMintInfo?.data.length)
	console.log('  Executable:', poolMintInfo?.executable)

	// Check fee account
	const poolFeeAccountInfo = await connection.getAccountInfo(poolFeeAccount)
	console.log('Pool Fee Account Info:')
	console.log('  Owner:', poolFeeAccountInfo?.owner.toBase58())
	console.log('  Data length:', poolFeeAccountInfo?.data.length)
	console.log('  Executable:', poolFeeAccountInfo?.executable)

	// Check destination account
	const userPoolAccountInfo = await connection.getAccountInfo(userPoolAccount)
	console.log('User Pool Account Info:')
	console.log('  Owner:', userPoolAccountInfo?.owner.toBase58())
	console.log('  Data length:', userPoolAccountInfo?.data.length)
	console.log('  Executable:', userPoolAccountInfo?.executable)

	// Step 9: Create initialize instruction using the library
	console.log('\n=== Preparing Pool Initialization ===')

	// Create fees and curve using helper functions
	const fees = createDefaultFees()
	const swapCurve = createConstantProductCurve()

	console.log('Trade Fee: 0.25%')
	console.log('Owner Fee: 0.05%')
	console.log('Curve Type: Constant Product (Uniswap-style)')

	// Create initialize instruction using the fixed library
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
		programId: PROGRAM_ID
	})

	console.log('Token swap account space:', swapAccountSpace)
	console.log('Rent exempt amount:', await connection.getMinimumBalanceForRentExemption(swapAccountSpace))

	// Step 9: Send initialize transaction
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
		console.log('Swap account created:', swapAccountInfo !== null)
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
	}

	console.log('\n🎉 Pool initialization completed!')

	return {
		tokenSwapAccount: tokenSwapAccount.publicKey.toBase58(),
		swapAuthority: swapAuthority.toBase58(),
		tokenAMint: tokenAMint.toBase58(),
		tokenBMint: tokenBMint.toBase58(),
		poolMint: poolMint.toBase58(),
		tokenAAccount: tokenAAccount.toBase58(),
		tokenBAccount: tokenBAccount.toBase58(),
		poolFeeAccount: poolFeeAccount.toBase58(),
		userPoolAccount: userPoolAccount.toBase58()
	}
}

// Helper function to create a simple constant product pool with default settings
async function createSimplePool(
	connection: Connection,
	payer: Keypair,
	tokenAMint: PublicKey,
	tokenBMint: PublicKey
	// initialTokenAAmount: number,
	// initialTokenBAmount: number
) {
	console.log('Creating simple constant product pool...')

	const authority = payer // Use payer as authority for simplicity

	// Create pool mint
	const poolMint = await createMint(connection, payer, authority.publicKey, null, 6)

	// Create token swap account
	const tokenSwapAccount = Keypair.generate()
	const [swapAuthority] = await PublicKey.findProgramAddress([tokenSwapAccount.publicKey.toBuffer()], PROGRAM_ID)

	// Create pool token accounts using manual method
	const tokenAAccount = await createTokenAccountManual(connection, payer, tokenAMint, swapAuthority)

	const tokenBAccount = await createTokenAccountManual(connection, payer, tokenBMint, swapAuthority)

	const poolFeeAccount = await createTokenAccountManual(connection, payer, poolMint, swapAuthority)

	// Create user LP token account
	const userPoolAccount = await createTokenAccountManual(connection, payer, poolMint, payer.publicKey)

	// Default fees: 0.3% like Uniswap
	const fees: Fees = {
		tradeFeeNumerator: new BN(30),
		tradeFeeDenominator: new BN(10000),
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

	// Initialize pool
	const createAccountIx = SystemProgram.createAccount({
		fromPubkey: payer.publicKey,
		newAccountPubkey: tokenSwapAccount.publicKey,
		daltons: await connection.getMinimumBalanceForRentExemption(500),
		space: 500,
		programId: PROGRAM_ID
	})

	const initializeIx = createInitializeInstruction(
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

	const initTx = new Transaction().add(createAccountIx, initializeIx)
	await sendAndConfirmTransaction(connection, initTx, [payer, tokenSwapAccount])

	console.log(`✅ Pool created: ${tokenSwapAccount.publicKey.toBase58()}`)

	return {
		poolAddress: tokenSwapAccount.publicKey,
		swapAuthority,
		tokenAAccount,
		tokenBAccount,
		poolMint,
		poolFeeAccount
	}
}

// Run the example
if (require.main === module) {
	createLiquidityPoolExample()
		.then(() => {
			console.log('\n✅ Example completed successfully!')
			process.exit(0)
		})
		.catch((error) => {
			console.error('\n❌ Example failed:', error)
			console.error('\nStack trace:', error.stack)
			process.exit(1)
		})
}

export { createLiquidityPoolExample, createSimplePool }
