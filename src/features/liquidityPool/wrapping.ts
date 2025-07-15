import {
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
	createSyncNativeInstruction,
	createCloseAccountInstruction,
	TOKEN_PROGRAM_ID,
	NATIVE_MINT
} from '@bbachain/spl-token'
import { Connection, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'

import { isNativeBBA, getNativeBBAToken } from '@/staticData/tokens'

import { MintInfo } from './types'

export interface WrappingResult {
	wrappedToken: MintInfo
	wrappedAmount: number
	transaction?: Transaction
	unwrapRequired: boolean
}

export interface WrappingParams {
	connection: Connection
	userPublicKey: PublicKey
	token: MintInfo
	amount: number
}

/**
 * Check if a token needs preparation for pool operations (BBA needs token account setup)
 */
export function needsWrapping(token: MintInfo): boolean {
	return isNativeBBA(token.address)
}

/**
 * Alias for needsWrapping - check if token needs preparation for pool operations
 */
export function needsPreparation(token: MintInfo): boolean {
	return needsWrapping(token) // Keep backward compatibility
}

/**
 * Prepare token for pool operations - ensure BBA token account exists for pools
 */
export async function prepareTokenForPool(params: WrappingParams): Promise<WrappingResult> {
	const { connection, userPublicKey, token, amount } = params

	// If it's not BBA, no preparation needed
	if (!isNativeBBA(token.address)) {
		return {
			wrappedToken: token,
			wrappedAmount: amount,
			unwrapRequired: false
		}
	}

	console.log('🔄 Preparing BBA for pool operations (ensuring token account exists)...')

	// For BBAChain, NATIVE_MINT is both native and wrapped BBA
	const bbaMint = NATIVE_MINT
	const userBBATokenAccount = await getAssociatedTokenAddress(bbaMint, userPublicKey)

	// Convert BBA amount to daltons (smallest unit)
	const amountInDaltons = Math.floor(amount * Math.pow(10, token.decimals))

	console.log('💰 BBA preparation details:', {
		nativeAmount: amount,
		amountInDaltons,
		bbaTokenAccount: userBBATokenAccount.toBase58(),
		bbaMint: bbaMint.toBase58()
	})

	// Create transaction for token account setup
	const transaction = new Transaction()

	// Check if BBA token account exists, create if not
	const accountInfo = await connection.getAccountInfo(userBBATokenAccount)
	if (!accountInfo) {
		console.log('📝 Creating BBA token account for pool operations...')
		const createAccountIx = createAssociatedTokenAccountInstruction(
			userPublicKey,
			userBBATokenAccount,
			userPublicKey,
			bbaMint
		)
		transaction.add(createAccountIx)

		// Transfer native BBA to token account
		console.log('💸 Adding native BBA transfer instruction...')
		const transferIx = SystemProgram.transfer({
			fromPubkey: userPublicKey,
			toPubkey: userBBATokenAccount,
			daltons: amountInDaltons
		})
		transaction.add(transferIx)

		// Sync native (this converts the transferred BBA to token balance)
		console.log('🔄 Adding sync native instruction...')
		const syncIx = createSyncNativeInstruction(userBBATokenAccount)
		transaction.add(syncIx)

		return {
			wrappedToken: token, // Token info stays the same (NATIVE_MINT)
			wrappedAmount: amount,
			transaction,
			unwrapRequired: false // No unwrapping needed since it's the same token
		}
	} else {
		console.log('✅ BBA token account already exists, no preparation needed')
		return {
			wrappedToken: token,
			wrappedAmount: amount,
			unwrapRequired: false
		}
	}
}

/**
 * Clean up BBA token account (optional - converts remaining token balance back to native)
 */
export async function createCleanupTransaction(connection: Connection, userPublicKey: PublicKey): Promise<Transaction> {
	console.log('🔄 Creating cleanup transaction for BBA token account...')

	const bbaTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, userPublicKey)

	const transaction = new Transaction()

	// Close the BBA token account to convert remaining balance back to native BBA
	const closeAccountIx = createCloseAccountInstruction(
		bbaTokenAccount,
		userPublicKey, // Destination for native BBA
		userPublicKey // Owner
	)

	transaction.add(closeAccountIx)

	console.log('💰 Cleanup details:', {
		bbaTokenAccount: bbaTokenAccount.toBase58()
	})

	return transaction
}

/**
 * Estimate the cost of BBA token account preparation (rent for account creation)
 */
export async function estimatePreparationCost(connection: Connection): Promise<number> {
	// Cost includes rent for creating BBA token account if it doesn't exist
	// Plus minimal transaction fees
	const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(165) // Account data size for token account
	const estimatedTxFee = 5000 // Estimated transaction fee in daltons

	return rentExemptBalance + estimatedTxFee
}

/**
 * Check if user has sufficient balance for BBA token preparation (including fees)
 */
export async function canAffordPreparation(
	connection: Connection,
	userPublicKey: PublicKey,
	bbaAmount: number
): Promise<{ canAfford: boolean; required: number; available: number; shortfall: number }> {
	const userBalance = await connection.getBalance(userPublicKey)
	const preparationCost = await estimatePreparationCost(connection)
	const amountInDaltons = Math.floor(bbaAmount * Math.pow(10, 9))
	const totalRequired = amountInDaltons + preparationCost

	return {
		canAfford: userBalance >= totalRequired,
		required: totalRequired,
		available: userBalance,
		shortfall: Math.max(0, totalRequired - userBalance)
	}
}

// Backward compatibility aliases
export const estimateWrappingCost = estimatePreparationCost
export const canAffordWrapping = canAffordPreparation
