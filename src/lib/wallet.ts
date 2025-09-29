'use client'

import {
	BBA_DALTON_UNIT,
	Blockhash,
	Connection,
	PublicKey,
	SystemProgram,
	Transaction,
	TransactionMessage,
	VersionedTransaction
} from '@bbachain/web3.js'

export const createTransaction = async ({
	publicKey,
	destination,
	amount,
	connection
}: {
	publicKey: PublicKey
	destination: PublicKey
	amount: number
	connection: Connection
}): Promise<{
	transaction: VersionedTransaction
	latestBlockhash: { blockhash: string; lastValidBlockHeight: number }
}> => {
	// Get the latest blockhash to use in our transaction
	const latestBlockhash = await connection.getLatestBlockhash()

	// Create instructions to send, in this case a simple transfer
	const instructions = [
		SystemProgram.transfer({
			fromPubkey: publicKey,
			toPubkey: destination,
			daltons: amount * BBA_DALTON_UNIT
		})
	]

	// Create a new TransactionMessage with version and compile it to legacy
	const messageLegacy = new TransactionMessage({
		payerKey: publicKey,
		recentBlockhash: latestBlockhash.blockhash,
		instructions
	}).compileToLegacyMessage()

	// Create a new VersionedTransaction which supports legacy and v0
	const transaction = new VersionedTransaction(messageLegacy)

	return {
		transaction,
		latestBlockhash
	}
}

// Enhanced retry configuration
const RETRY_CONFIG = {
	attempts: 3,
	delay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
	retryCondition: (error: any) => {
		// Retry on network errors, timeouts, and 5xx errors
		return !error.response || error.response.status >= 500 || error.code === 'NETWORK_ERROR'
	}
}

// Transaction helper with retry and delay
export const sendTransactionWithRetry = async (
	transaction: Transaction,
	connection: Connection,
	sendTransaction: any,
	options?: { signers?: any[]; skipPreflight?: boolean; preflightCommitment?: string }
) => {
	for (let attempt = 1; attempt <= RETRY_CONFIG.attempts; attempt++) {
		try {
			console.log(`📤 Sending transaction (attempt ${attempt}/${RETRY_CONFIG.attempts})...`)
			const signature = await sendTransaction(transaction, connection, options)
			console.log(`✅ Transaction sent successfully:`, signature)
			return signature
		} catch (error: any) {
			console.error(`❌ Transaction attempt ${attempt} failed:`, error)

			if (attempt === RETRY_CONFIG.attempts || !RETRY_CONFIG.retryCondition(error)) {
				throw error
			}

			// Wait before retry
			const delay = RETRY_CONFIG.delay(attempt - 1)
			console.log(`⏳ Waiting ${delay}ms before retry...`)
			await new Promise((resolve) => setTimeout(resolve, delay))
		}
	}
}

// Confirmation helper with timeout
export const confirmTransactionWithTimeout = async (
	connection: Connection,
	signature: string,
	latestBlockhash: Readonly<{
		blockhash: Blockhash
		lastValidBlockHeight: number
	}>,
	timeoutMs = 30000
) => {
	console.log(`⏳ Confirming transaction: ${signature}`)

	const timeoutPromise = new Promise((_, reject) => {
		setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeoutMs)
	})

	const confirmPromise = connection.confirmTransaction(
		{ signature, ...latestBlockhash },
		'confirmed'
	)

	const confirmation: any = await Promise.race([confirmPromise, timeoutPromise])

	if (confirmation.value?.err) {
		throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
	}

	console.log(`✅ Transaction confirmed: ${signature}`)
	return confirmation
}
