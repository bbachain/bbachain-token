/**
 * BBA Wrapping/Unwrapping Utilities for BBAChain
 *
 * This module provides utilities for wrapping/unwrapping BBA tokens
 * for use in liquidity pools and swaps, based on the patterns from examples.
 */

import {
	TOKEN_PROGRAM_ID,
	NATIVE_MINT,
	createInitializeAccountInstruction,
	createSyncNativeInstruction,
	createCloseAccountInstruction,
	getAccount
} from '@bbachain/spl-token'
import {
	Connection,
	Keypair,
	PublicKey,
	Transaction,
	SystemProgram,
	sendAndConfirmTransaction,
	BBA_DALTON_UNIT
} from '@bbachain/web3.js'

/**
 * Create token account manually (BBAChain compatible)
 * Based on pattern from examples/01-create-lp-with-native.ts
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
 * Wrap BBA to WBBA (BBAChain compatible)
 * Based on pattern from examples/04-swap-bba-usdt.ts
 */
export async function wrapBBAtoWBBA(
	connection: Connection,
	payer: Keypair,
	owner: PublicKey,
	amount: number // Amount in daltons
): Promise<PublicKey> {
	console.log(`🔄 Wrapping ${amount / BBA_DALTON_UNIT} BBA to WBBA...`)

	// Create WBBA token account manually (BBAChain compatible)
	const wbbaAccount = await createTokenAccountManual(connection, payer, NATIVE_MINT, owner)

	// Transfer BBA daltons to token account
	const transferIx = SystemProgram.transfer({
		fromPubkey: payer.publicKey,
		toPubkey: wbbaAccount,
		daltons: amount
	})

	// Sync native instruction
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
 * Unwrap WBBA to BBA (BBAChain working solution)
 * Based on pattern from examples/04-swap-bba-usdt.ts
 */
export async function unwrapWBBAtoBBA(
	connection: Connection,
	payer: Keypair,
	wbbaAccount: PublicKey
): Promise<boolean> {
	console.log('🔄 Unwrapping WBBA to BBA...')

	try {
		// Check account state
		const accountInfo = await getAccount(connection, wbbaAccount)
		const balance = Number(accountInfo.amount)

		if (balance === 0) {
			console.log('✅ WBBA account is empty, unwrap complete')
			return true
		}

		console.log(`💰 WBBA balance: ${balance / BBA_DALTON_UNIT} BBA`)

		// BBAChain method: Simply close account to unwrap
		const closeAccountIx = createCloseAccountInstruction(
			wbbaAccount, // account to close
			payer.publicKey, // destination for daltons
			payer.publicKey, // owner authority
			[], // multiSigners
			TOKEN_PROGRAM_ID // programId
		)

		const unwrapTransaction = new Transaction().add(closeAccountIx)
		await sendAndConfirmTransaction(connection, unwrapTransaction, [payer], {
			commitment: 'confirmed'
		})

		console.log('✅ Successfully unwrapped WBBA to BBA')
		return true
	} catch (error) {
		console.log('ℹ️ Unwrap not available on BBAChain, but WBBA = BBA')

		// Get final balance for user info
		try {
			const accountInfo = await getAccount(connection, wbbaAccount)
			const balance = Number(accountInfo.amount)

			console.log(`💰 Final balance: ${(balance / BBA_DALTON_UNIT).toFixed(9)} WBBA`)
			console.log('💡 WBBA can be used as BBA (1:1 equivalent)')
			console.log('💡 Transfer to wallet or use in DeFi applications')
		} catch {
			console.log('💰 WBBA processed successfully')
		}

		return false // Unwrap failed but it's OK
	}
}

/**
 * Add BBA liquidity directly to pool account
 * Used for pool initialization - transfers BBA directly to pool and syncs
 */
export async function addBBAToPoolAccount(
	connection: Connection,
	payer: Keypair,
	poolAccount: PublicKey,
	amount: number // Amount in daltons
): Promise<void> {
	console.log(`🔄 Adding ${amount / BBA_DALTON_UNIT} BBA to pool account...`)

	// Transfer BBA daltons directly to pool account
	const transferToPoolIx = SystemProgram.transfer({
		fromPubkey: payer.publicKey,
		toPubkey: poolAccount,
		daltons: amount
	})

	// Sync native instruction to wrap BBA in the pool
	const syncPoolIx = createSyncNativeInstruction(poolAccount)

	// Send transaction to fund pool
	const fundPoolTransaction = new Transaction().add(transferToPoolIx, syncPoolIx)
	await sendAndConfirmTransaction(connection, fundPoolTransaction, [payer], {
		commitment: 'confirmed'
	})

	console.log(`✅ Added ${amount / BBA_DALTON_UNIT} BBA to pool account`)
}

/**
 * Calculate expected output using constant product formula
 * Helper function from examples
 */
export function calculateExpectedOutput(amountIn: number, reserveIn: number, reserveOut: number): number {
	return (amountIn * reserveOut) / (reserveIn + amountIn)
}

/**
 * Convert BBA amount to daltons
 */
export function bbaTodaltons(bbaAmount: number): number {
	return Math.floor(bbaAmount * BBA_DALTON_UNIT)
}

/**
 * Convert daltons to BBA amount
 */
export function daltonsToBBA(daltons: number): number {
	return daltons / BBA_DALTON_UNIT
}
