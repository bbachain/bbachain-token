'use client'

import {
	createAssociatedTokenAccountInstruction,
	createInitializeMintInstruction,
	createMintToInstruction,
	getAssociatedTokenAddress,
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
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTransactionToast } from '../common/ui-layout'
import { CreateBBATokenPayload } from '@/lib/validation'
import { uploadIconToPinata, uploadMetadataToPinata } from '@/lib/function'
import { createCreateMetadataAccountInstruction, createUpdateMetadataAccountInstruction, Metadata, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import axios from 'axios'
import { CreateTokenResponse, GetTokenMetadataResponse, GetTokenResponse, MetadataURI } from '@/lib/response'
import { TokenListProps } from '../tokens/columns'

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
			console.log(tokenAccounts.value)
			console.log(token2022Accounts.value)
			return [...tokenAccounts.value, ...token2022Accounts.value]
		}
	})
}

export async function geTokenMetadata({
	connection,
	mintAddress
}: {
	connection: Connection
	mintAddress: PublicKey
}): Promise<GetTokenMetadataResponse> {
	try {
		// Convert string to PublicKey

		// Use fetchMetadata to get the on-chain metadata
		const [metadataPda] = PublicKey.findProgramAddressSync(
			[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
			PROGRAM_ID
		)

		const accountInfo = await connection.getAccountInfo(metadataPda)
		if (!accountInfo?.data) {
			throw new Error(`No metadata found for mint address ${mintAddress.toString()}`)
		}

		const [metadata] = Metadata.deserialize(accountInfo.data)
		console.log('### metadata', metadata)

		if (!metadata)
			return {
				name: null,
				symbol: null,
				metadataLink: null,
				metadataURI: null,
				mintAddress: mintAddress.toString()
			}

		const { name, symbol, uri: metadataUri } = metadata.data

		let uriData = null

		if (metadataUri) {
			try {
				const response = await axios.get<MetadataURI>(metadataUri)
				uriData = response.data
			} catch (uriError) {
				console.error('Error fetching URI data:', uriError)
			}
		}

		return {
			name,
			symbol,
			metadataLink: metadataUri,
			metadataURI: uriData,
			mintAddress: mintAddress.toString()
		}
	} catch (error) {
		console.error('Error getting token metadata:', error)
		return {
			name: null,
			symbol: null,
			metadataLink: null,
			metadataURI: null,
			mintAddress: ''
		}
	}
}

export function useGetTokenMetadataQueries({ address }: { address: PublicKey }) {
	const { connection } = useConnection()
	const tokenAccounts = useGetTokenAccounts({ address })

	const tokenMetadataQueries = useQueries({
		queries: (tokenAccounts.data ?? []).map((account) => {
			const mint = account.account.data.parsed.info.mint
			const mintKey = new PublicKey(mint)

			return {
				queryKey: ['get-token-metadata-combined', { endpoint: connection.rpcEndpoint, mintKey }],
				queryFn: async () => {
					try {
						const [metadata, signatures] = await Promise.all([
							geTokenMetadata({ connection, mintAddress: mintKey }),
							connection.getSignaturesForAddress(mintKey)
						])

						const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0

						return {
							mintAddress: metadata.mintAddress,
							name: metadata.name,
							symbol: metadata.symbol,
							date: blockTime,
							metadataLink: metadata.metadataLink,
							metadataURI: metadata.metadataURI
						} satisfies GetTokenResponse
					} catch (err) {
						console.error(`Error fetching metadata for mint ${mint}:`, err)
						return undefined
					}
				},
				enabled: true
			}
		}),
		combine: (results) => ({
			data: results
				.map((r) => r.data)
				.filter((r): r is GetTokenResponse => !!r?.mintAddress && typeof r.date === 'number'),
			isPending: results.some((r) => r.isPending)
		})
	})

	return tokenMetadataQueries
}

export function useGetTokenMetadataDetail({ mintAddress }: { mintAddress: PublicKey }) {
	const { connection } = useConnection()
	return useQuery({
		queryKey: ['get-token-metadata-detail', { endpoint: connection.rpcEndpoint, mintAddress }],
		queryFn: async () => {
			try {
				const [metadata, signatures] = await Promise.all([
					geTokenMetadata({ connection, mintAddress }),
					connection.getSignaturesForAddress(mintAddress)
				])

				const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0

				return {
					mintAddress: metadata.mintAddress,
					name: metadata.name,
					symbol: metadata.symbol,
					date: blockTime,
					metadataLink: metadata.metadataLink,
					metadataURI: metadata.metadataURI
				} satisfies GetTokenResponse
			} catch (err) {
				console.error(`Error fetching metadata for mint ${mintAddress}:`, err)
				return undefined
			}
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
	const { publicKey, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()

	return useMutation<CreateTokenResponse, Error, CreateBBATokenPayload>({
		mutationKey: ['token-creator', { endpoint: connection.rpcEndpoint }],
		mutationFn: async (input: CreateBBATokenPayload) => {
			if (!publicKey) throw new Error('Wallet not connected')
			try {
				// Get the latest blockhash to use in our transaction
				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const latestBlockhash = await connection.getLatestBlockhash()
				const mintKeypair = Keypair.generate()
				const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey)

				const mappedPayload = {
					...input,
					description: input.description === '' ? null : input.description,
					custom_decimals: Number(input.custom_decimals),
					token_supply: Number(input.token_supply)
				}

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
						mappedPayload.custom_decimals,
						address,
						null,
						TOKEN_PROGRAM_ID
					),
					createAssociatedTokenAccountInstruction(publicKey, tokenATA, publicKey, mintKeypair.publicKey),
					createMintToInstruction(
						mintKeypair.publicKey,
						tokenATA,
						publicKey, // mint authority
						mappedPayload.token_supply * Math.pow(10, mappedPayload.custom_decimals)
					)
				)
				createAccountTx.recentBlockhash = latestBlockhash.blockhash
				createAccountTx.feePayer = address

				// Paritially sign the transaction with the mint keypair
				createAccountTx.partialSign(mintKeypair)
				const createSignature = await sendTransaction(createAccountTx, connection)

				await connection.confirmTransaction({ signature: createSignature, ...latestBlockhash }, 'confirmed')

				// Create the metadata account
				const [metadataPda] = PublicKey.findProgramAddressSync(
					[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
					PROGRAM_ID
				)

				const iconUri = await uploadIconToPinata(mappedPayload.token_icon)
				const ipfsUri = await uploadMetadataToPinata(mappedPayload, iconUri)

				const data = {
					name: mappedPayload.token_name,
					symbol: mappedPayload.token_symbol,
					uri: ipfsUri,
					sellerFeeBasisPoints: 0,
					creators: null,
					collection: null,
					uses: null
				}

				const ix = createCreateMetadataAccountInstruction(
					{
						metadata: metadataPda,
						mint: mintKeypair.publicKey,
						mintAuthority: address,
						payer: address,
						updateAuthority: address
					},
					{ createMetadataAccountArgs: { data, isMutable: true, collectionDetails: null } }
				)

				const metadataTx = new Transaction().add(ix)

				const metadataSignature = await sendTransaction(metadataTx, connection)

				await connection.confirmTransaction({ signature: metadataSignature, ...latestBlockhash }, 'confirmed')

				// // create update token metadata instruction
				// const updateMetadataIx = createUpdateMetadataAccountInstruction(
				// 	{
				// 		metadata: metadataPda,
				// 		updateAuthority: address
				// 	},
				// 	{
				// 		updateMetadataAccountArgs: {
				// 			data: {
				// 				name: "Fake Tether",
				// 				symbol: "FUSDT",
				// 				uri: 'https://ipfs.io/ipfs/bafkreic73yqcbupuneupdrptiodllkd2cool7ljidnglharg3rmfaulhuq',
				// 				sellerFeeBasisPoints: 0,
				// 				creators: null,
				// 				collection: null,
				// 				uses: null
				// 			},
				// 			updateAuthority: address,
				// 			primarySaleHappened: false,
				// 			isMutable: false,
				// 		}
				// 	}
				// )
				// const updateMetadataTx = new Transaction().add(updateMetadataIx)
				// const updateMetadataSignature = await sendTransaction(updateMetadataTx, connection)
				// await connection.confirmTransaction({ signature: updateMetadataSignature, ...latestBlockhash }, 'confirmed')

				return {
					mintAddress: mintKeypair.publicKey.toBase58(),
					accountAddress: address.toBase58(),
					metadataAddress: metadataPda.toBase58(),
					metadata: {
						name: mappedPayload.token_name,
						symbol: mappedPayload.token_symbol,
						uri: ipfsUri,
						iconUri,
						description: mappedPayload.description,
						decimals: mappedPayload.custom_decimals
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
