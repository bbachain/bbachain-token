'use client'

import {
	createInitializeMintInstruction,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID
} from '@bbachain/spl-token'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import {
	BBA_DALTON_UNIT,
	Connection,
	Keypair,
	PublicKey,
	SystemProgram,
	Transaction,
	TransactionMessage,
	TransactionSignature,
	VersionedTransaction
} from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTransactionToast } from '../ui/ui-layout'
import { CreateBBATokenPayload } from '@/lib/validation'
import { uploadIconToPinata, uploadMetadataToPinata } from '@/lib/function'

export function useGetBalance({ address }: { address: PublicKey }) {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
		queryFn: () => connection.getBalance(address)
	})
}

export function useGetSignatures({ address }: { address: PublicKey }) {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }],
		queryFn: () => connection.getSignaturesForAddress(address)
	})
}

export function useGetTokenAccounts({ address }: { address: PublicKey }) {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['get-token-accounts', { endpoint: connection.rpcEndpoint, address }],
		queryFn: async () => {
			const [tokenAccounts, token2022Accounts] = await Promise.all([
				connection.getParsedTokenAccountsByOwner(address, {
					programId: TOKEN_PROGRAM_ID
				}),
				connection.getParsedTokenAccountsByOwner(address, {
					programId: TOKEN_2022_PROGRAM_ID
				})
			])
			return [...tokenAccounts.value, ...token2022Accounts.value]
		}
	})
}

export function useTransferBBA({ address }: { address: PublicKey }) {
	const { connection } = useConnection()
	const transactionToast = useTransactionToast()
	const wallet = useWallet()
	const client = useQueryClient()

	return useMutation({
		mutationKey: ['transfer-bba', { endpoint: connection.rpcEndpoint, address }],
		mutationFn: async (input: { destination: PublicKey; amount: number }) => {
			let signature: TransactionSignature = ''
			try {
				const { transaction, latestBlockhash } = await createTransaction({
					publicKey: address,
					destination: input.destination,
					amount: input.amount,
					connection
				})

				// Send transaction and await for signature
				signature = await wallet.sendTransaction(transaction, connection)

				// Send transaction and await for signature
				await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

				console.log(signature)
				return signature
			} catch (error: unknown) {
				console.log('error', `Transaction failed! ${error}`, signature)

				return
			}
		},
		onSuccess: (signature) => {
			if (signature) {
				transactionToast(signature)
			}
			return Promise.all([
				client.invalidateQueries({
					queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }]
				})
			])
		},
		onError: (error) => {
			toast.error(`Transaction failed! ${error}`)
		}
	})
}

export function useRequestAirdrop({ address }: { address: PublicKey }) {
	const { connection } = useConnection()
	const client = useQueryClient()

	return useMutation({
		mutationKey: ['airdrop', { endpoint: connection.rpcEndpoint, address }],
		mutationFn: async (amount: number = 1) => {
			const [latestBlockhash, signature] = await Promise.all([
				connection.getLatestBlockhash(),
				connection.requestAirdrop(address, amount * BBA_DALTON_UNIT)
			])

			await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')
			return signature
		},
		onSuccess: (signature) => {
			return Promise.all([
				client.invalidateQueries({
					queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }]
				})
			])
		}
	})
}

async function createTransaction({
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
}> {
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

export function useTokenCreator({ address }: { address: PublicKey }) {
	const wallet = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()

	return useMutation({
		mutationKey: ['token-creator', { endpoint: connection.rpcEndpoint }],
		mutationFn: async (input: CreateBBATokenPayload) => {
			try {
				// Get the latest blockhash to use in our transaction
				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const latestBlockhash = await connection.getLatestBlockhash()
				const mintKeypair = Keypair.generate()
				const programId = new PublicKey('metabUBuFKTWPWAAARaQdNXUH6Sxk5tFGQjGEgWCvaX')

				// Create instructions to create a new mint account
				const createAccountTx = new Transaction().add(
					SystemProgram.createAccount({
						fromPubkey: address,
						newAccountPubkey: mintKeypair.publicKey,
						space: MINT_SIZE,
						daltons,
						programId: TOKEN_PROGRAM_ID
					}),
					createInitializeMintInstruction(
						mintKeypair.publicKey,
						Number(input.custom_decimals),
						address,
						null,
						TOKEN_PROGRAM_ID
					)
				)
				createAccountTx.recentBlockhash = latestBlockhash.blockhash
				createAccountTx.feePayer = address

				// Paritially sign the transaction with the mint keypair
				createAccountTx.partialSign(mintKeypair)
				const createSignature = await wallet.sendTransaction(createAccountTx, connection)

				await connection.confirmTransaction({ signature: createSignature, ...latestBlockhash }, 'confirmed')

				// Create the metadata account
				const [metadataPda] = PublicKey.findProgramAddressSync(
					[Buffer.from('metadata'), mintKeypair.publicKey.toBuffer()],
					programId
				)

				const iconUri = await uploadIconToPinata(input.token_icon)

				console.log('icon uri', iconUri)

				const ipfsUri = await uploadMetadataToPinata(input, iconUri)

				console.log('ipfs uri:', ipfsUri)

				// Prepare the metadata
				const nameBuffer = Buffer.from(input.token_name, 'utf8')
				const symbolBuffer = Buffer.from(input.token_symbol, 'utf8')
				const uriBuffer = Buffer.from(ipfsUri, 'utf8')
				const instructionData = Buffer.concat([
					Buffer.from([0]), // Variant 0 = Initialize
					Buffer.from(new Uint32Array([nameBuffer.length]).buffer), // Name length (u32)
					nameBuffer,
					Buffer.from(new Uint32Array([symbolBuffer.length]).buffer), // Symbol length (u32)
					symbolBuffer,
					Buffer.from(new Uint32Array([uriBuffer.length]).buffer), // URI length (u32)
					uriBuffer
				] as any)

				const metadataTx = new Transaction().add({
					keys: [
						{ pubkey: metadataPda, isSigner: false, isWritable: true },
						{ pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
						{ pubkey: address, isSigner: true, isWritable: true },
						{ pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
					],
					programId,
					data: instructionData
				})
				metadataTx.recentBlockhash = latestBlockhash.blockhash
				metadataTx.feePayer = address

				const metadataSignature = await wallet.sendTransaction(metadataTx, connection)

				await connection.confirmTransaction({ signature: metadataSignature, ...latestBlockhash }, 'confirmed')

				return {
					mintAddress: mintKeypair.publicKey.toBase58(),
					accountAddress: address.toBase58(),
					metadataAddress: metadataPda.toBase58(),
					metadata: {
						name: input.token_name,
						symbol: input.token_symbol,
						uri: ipfsUri,
						iconUri,
						description: input.description,
						decimals: input.custom_decimals
					},
					signature: metadataSignature
				}
			} catch (error: unknown) {
				throw new Error(`Transaction failed! ${error}`)
			}
		},
		onSuccess: () => {
			return Promise.all([
				client.invalidateQueries({
					queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }]
				})
			])
		}
	})
}
