'use client'

import {
	AuthorityType,
	createAssociatedTokenAccountInstruction,
	createBurnInstruction,
	createInitializeMintInstruction,
	createMintToInstruction,
	createSetAuthorityInstruction,
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
import {
	BurnTokenPayload,
	CreateBBATokenPayload,
	CreateMessagePayload,
	MintNFTPayload,
	UploadCollectionPayload
} from '@/lib/validation'
import { uploadIconToPinata, uploadMetadataToPinata } from '@/lib/function'
import {
	createCreateMetadataAccountInstruction,
	createUpdateMetadataAccountInstruction,
	Metadata,
	PROGRAM_ID
} from '@bbachain/spl-token-metadata'
import { getMint, setAuthority } from '@bbachain/spl-token'
import axios from 'axios'
import {
	CreateTokenResponse,
	GetNFTResponse,
	GetTokenResponse,
	MetadataURI,
	UpdateMetadataPayload,
	UploadToMetadataPayload,
	NFTMetadataContent
} from '@/lib/types'
import BN from 'bn.js'

export function useMintSupply({ mintAddress }: { mintAddress: PublicKey }) {
	const { publicKey, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation({
		mutationKey: ['mint-supply', { endpoint: connection.rpcEndpoint, mintAddress }],
		mutationFn: async (payload: BurnTokenPayload) => {
			if (!publicKey) throw new Error('Wallet not connected')
			const latestBlockhash = await connection.getLatestBlockhash()
			const amount = BigInt(Math.floor(parseFloat(payload.amount) * Math.pow(10, payload.decimals)))
			const tokenAccount = await getAssociatedTokenAddress(mintAddress, publicKey)

			const mintIx = createMintToInstruction(
				mintAddress,
				tokenAccount,
				publicKey,
				amount,
				[], // no multi-signers
				TOKEN_PROGRAM_ID
			)

			const mintTx = new Transaction().add(mintIx)
			mintTx.recentBlockhash = latestBlockhash.blockhash
			mintTx.feePayer = publicKey

			const mintSignature = await sendTransaction(mintTx, connection)
			await connection.confirmTransaction({ signature: mintSignature, ...latestBlockhash }, 'confirmed')
			return { message: `Successfully mint ${payload.amount} tokens to your account` }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: ['get-token-data-detail', { endpoint: connection.rpcEndpoint, mintAddress }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, publicKey }]
				})
			])
	})
}

export function useBurnToken({ mintAddress }: { mintAddress: PublicKey }) {
	const { publicKey, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation({
		mutationKey: ['burn-token', { endpoint: connection.rpcEndpoint, mintAddress }],
		mutationFn: async (payload: BurnTokenPayload) => {
			if (!publicKey) throw new Error('Wallet not connected')
			const latestBlockhash = await connection.getLatestBlockhash()
			const amount = BigInt(Math.floor(parseFloat(payload.amount) * Math.pow(10, payload.decimals)))
			const tokenAccount = await getAssociatedTokenAddress(mintAddress, publicKey)

			const burnIx = createBurnInstruction(tokenAccount, mintAddress, publicKey, amount, [], TOKEN_PROGRAM_ID)

			const burnTx = new Transaction().add(burnIx)
			burnTx.recentBlockhash = latestBlockhash.blockhash
			burnTx.feePayer = publicKey

			const burnSignature = await sendTransaction(burnTx, connection)
			await connection.confirmTransaction({ signature: burnSignature, ...latestBlockhash }, 'confirmed')
			return { message: `Successfully burn ${payload.amount} tokens from your account` }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: ['get-token-data-detail', { endpoint: connection.rpcEndpoint, mintAddress }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, publicKey }]
				})
			])
	})
}

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

export async function geTokenMetadata({ connection, mintAddress }: { connection: Connection; mintAddress: PublicKey }) {
	try {
		// Convert string to PublicKey

		// Use fetchMetadata to get the on-chain metadata
		const [metadataPda] = PublicKey.findProgramAddressSync(
			[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
			PROGRAM_ID
		)

		console.log('pda metadata ', metadataPda.toBase58())

		const accountInfo = await connection.getAccountInfo(metadataPda)
		if (!accountInfo?.data) {
			return {
				metadataAddress: metadataPda.toBase58(),
				name: null,
				symbol: null,
				collection: null,
				collectionDetails: null,
				uses: null,
				creators: null,
				sellerFeeBasisPoints: 0,
				metadataLink: null,
				metadataURI: null
			}
		}

		const [metadata] = Metadata.deserialize(accountInfo.data)
		console.log('### metadata', metadata)

		if (!metadata)
			return {
				metadataAddress: metadataPda.toBase58(),
				name: null,
				symbol: null,
				collection: null,
				collectionDetails: null,
				uses: null,
				creators: null,
				sellerFeeBasisPoints: 0,
				metadataLink: null,
				metadataURI: null
			}

		const { name, symbol, uri: metadataUri, collection, uses, creators, sellerFeeBasisPoints } = metadata.data

		let uriData = null

		if (metadataUri) {
			try {
				const response = await axios.get(metadataUri)
				uriData = response.data
			} catch (uriError) {
				console.error('Error fetching URI data:', uriError)
			}
		}

		return {
			metadataAddress: metadataPda.toBase58(),
			name: name.replace(/\0/g, ''),
			symbol: symbol.replace(/\0/g, ''),
			collection,
			collectionDetails: metadata.collectionDetails,
			uses,
			creators,
			sellerFeeBasisPoints,
			metadataLink: metadataUri.replace(/\0/g, ''),
			metadataURI: uriData
		}
	} catch (error) {
		console.error('Error getting token metadata:', error)
		return {
			metadataAddress: '',
			name: null,
			symbol: null,
			collection: null,
			collectionDetails: null,
			uses: null,
			creators: null,
			sellerFeeBasisPoints: 0,
			metadataLink: null,
			metadataURI: null
		}
	}
}

export async function getParsedTokenMetadata(connection: Connection, mintKey: PublicKey) {
	// Default values
	let name = null
	let symbol = null
	let collection = null
	let collectionDetails = null
	let uses = null
	let creators = null
	let sellerFeeBasisPoints = 0
	let metadataAddress: string = ''
	let metadataLink = null
	let metadataURI = null
	let immutableMetadata = false

	try {
		const metadata = await geTokenMetadata({ connection, mintAddress: mintKey })

		if (metadata) {
			metadataAddress = new PublicKey(metadata.metadataAddress).toBase58()
			metadataLink = metadata.metadataLink ?? null
			metadataURI = metadata.metadataURI
			name = metadata.name
			symbol = metadata.symbol
			collection = metadata.collection
			collectionDetails = metadata.collectionDetails
			uses = metadata.uses
			creators = metadata.creators
			sellerFeeBasisPoints = metadata.sellerFeeBasisPoints

			try {
				const metadataAccount = await Metadata.fromAccountAddress(connection, new PublicKey(metadata.metadataAddress))
				immutableMetadata = !metadataAccount.isMutable
			} catch (e) {
				console.warn('Could not fetch immutability info:', e)
			}
		}
	} catch (e) {
		console.warn('Could not fetch token metadata:', e)
	}

	return {
		name,
		symbol,
		collection,
		collectionDetails,
		uses,
		creators,
		sellerFeeBasisPoints,
		metadataAddress,
		metadataLink,
		metadataURI,
		immutableMetadata
	}
}

export function useGetTokenDataQueries({ address }: { address: PublicKey }) {
	const { connection } = useConnection()
	const tokenAccounts = useGetTokenAccounts({ address })

	const tokenMetadataQueries = useQueries({
		queries: (tokenAccounts.data ?? []).map((account) => {
			const mint = account.account.data.parsed.info.mint
			const mintKey = new PublicKey(mint)

			console.log(account)

			return {
				queryKey: ['get-token-data', { endpoint: connection.rpcEndpoint, mintKey }],
				queryFn: async () => {
					try {
						const [signatures, mintAccountInfo] = await Promise.all([
							connection.getSignaturesForAddress(mintKey),
							getMint(connection, mintKey)
						])

						console.log('signature nih', signatures)
						console.log('account info nih', mintAccountInfo)

						const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0
						const decimals = mintAccountInfo.decimals
						const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

						if (decimals === 0 && supply === 1) return null

						const parsedMetadata = await getParsedTokenMetadata(connection, mintKey)

						const revokeMint = mintAccountInfo.mintAuthority === null
						const revokeFreeze = mintAccountInfo.freezeAuthority === null

						const authoritiesState = {
							revoke_freeze: revokeFreeze,
							revoke_mint: revokeMint,
							immutable_metadata: parsedMetadata.immutableMetadata
						}

						if (!parsedMetadata) {
							return {
								mintAddress: mintKey.toBase58(),
								name: null,
								symbol: null,
								decimals,
								supply,
								metadataAddress: '',
								metadataLink: '',
								metadataURI: null,
								authoritiesState,
								date: blockTime
							} satisfies GetTokenResponse
						}

						return {
							mintAddress: mintKey.toBase58(),
							name: parsedMetadata.name,
							symbol: parsedMetadata.symbol,
							decimals,
							supply,
							metadataAddress: parsedMetadata.metadataAddress,
							metadataLink: parsedMetadata.metadataLink,
							metadataURI: parsedMetadata.metadataURI,
							authoritiesState,
							date: blockTime
						} satisfies GetTokenResponse
					} catch (err) {
						console.error(`Error fetching metadata for mint ${mint}:`, err)
						return null
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

export function useGetTokenDataDetail({ mintAddress }: { mintAddress: PublicKey }) {
	const { connection } = useConnection()
	return useQuery({
		queryKey: ['get-token-data-detail', { endpoint: connection.rpcEndpoint, mintAddress }],
		queryFn: async () => {
			try {
				const [signatures, mintAccountInfo] = await Promise.all([
					connection.getSignaturesForAddress(mintAddress),
					getMint(connection, mintAddress)
				])

				const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0
				const decimals = mintAccountInfo.decimals
				const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

				const parsedMetadata = await getParsedTokenMetadata(connection, mintAddress)

				const revokeMint = mintAccountInfo.mintAuthority === null
				const revokeFreeze = mintAccountInfo.freezeAuthority === null

				const authoritiesState = {
					revoke_freeze: revokeFreeze,
					revoke_mint: revokeMint,
					immutable_metadata: parsedMetadata.immutableMetadata
				}

				if (!parsedMetadata) {
					return {
						mintAddress: mintAddress.toBase58(),
						name: null,
						symbol: null,
						decimals,
						supply,
						metadataAddress: '',
						metadataLink: '',
						metadataURI: null,
						authoritiesState,
						date: blockTime
					} satisfies GetTokenResponse
				}

				return {
					mintAddress: mintAddress.toBase58(),
					name: parsedMetadata.name,
					symbol: parsedMetadata.symbol,
					decimals,
					supply,
					metadataAddress: parsedMetadata.metadataAddress,
					metadataLink: parsedMetadata.metadataLink,
					metadataURI: parsedMetadata.metadataURI,
					authoritiesState,
					date: blockTime
				} satisfies GetTokenResponse
			} catch (err) {
				console.error(`Error fetching metadata for mint ${mintAddress}:`, err)
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
						address,
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

				console.log('Successfully create account', createAccountTx)

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

				const metadataPayload: UploadToMetadataPayload = {
					token_name: mappedPayload.token_name,
					token_symbol: mappedPayload.token_symbol,
					token_icon: iconUri,
					description: mappedPayload.description
				}

				const ipfsUri = await uploadMetadataToPinata(metadataPayload)

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

				// Revoke authorities (mint/freeze) and immutable metadata state if requested
				const revokeTx = new Transaction()

				if (mappedPayload.revoke_mint) {
					revokeTx.add(createSetAuthorityInstruction(mintKeypair.publicKey, address, AuthorityType.MintTokens, null))
				}

				if (mappedPayload.revoke_freeze) {
					revokeTx.add(createSetAuthorityInstruction(mintKeypair.publicKey, address, AuthorityType.FreezeAccount, null))
				}

				if (revokeTx.instructions.length > 0) {
					revokeTx.recentBlockhash = latestBlockhash.blockhash
					revokeTx.feePayer = address
					const revokeSignature = await sendTransaction(revokeTx, connection)
					await connection.confirmTransaction({ signature: revokeSignature, ...latestBlockhash }, 'confirmed')
				}

				if (mappedPayload.immutable_metadata) {
					const lockMetadataIx = createUpdateMetadataAccountInstruction(
						{
							metadata: metadataPda,
							updateAuthority: address
						},
						{
							updateMetadataAccountArgs: {
								data,
								updateAuthority: address,
								primarySaleHappened: false,
								isMutable: false
							}
						}
					)
					const lockTx = new Transaction().add(lockMetadataIx)
					const lockSignature = await sendTransaction(lockTx, connection)
					await connection.confirmTransaction({ signature: lockSignature, ...latestBlockhash }, 'confirmed')
				}

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

export function useRevokeAuthority({ mintAddress }: { mintAddress: PublicKey }) {
	const { publicKey, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation({
		mutationKey: ['change-authority', mintAddress],
		mutationFn: async (authorityType: AuthorityType) => {
			try {
				if (!publicKey) throw new Error('Wallet not connected')
				const revokeTx = createSetAuthorityInstruction(mintAddress, publicKey, authorityType, null)
				const revokeAuthority = new Transaction().add(revokeTx)
				const latestBlockhash = await connection.getLatestBlockhash()
				revokeAuthority.recentBlockhash = latestBlockhash.blockhash
				revokeAuthority.feePayer = publicKey
				const revokeSignature = await sendTransaction(revokeAuthority, connection)
				await connection.confirmTransaction({ signature: revokeSignature, ...latestBlockhash }, 'confirmed')
				return { message: `Successfully revoked ${authorityType === 0 ? 'Mint Authority' : 'Freeze Authority'}` }
			} catch (error: unknown) {
				throw new Error(`Revoke authority failed! ${error}`)
			}
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: ['get-token-data-detail', { endpoint: connection.rpcEndpoint, mintAddress }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, publicKey }]
				})
			])
	})
}

export function useLockMetadata({ mintAddress }: { mintAddress: PublicKey }) {
	const { publicKey, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation({
		mutationKey: ['lock-metadata', mintAddress],
		mutationFn: async () => {
			try {
				if (!publicKey) throw new Error('Wallet not connected')

				const [metadataPda] = PublicKey.findProgramAddressSync(
					[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
					PROGRAM_ID
				)

				const metadataAccount = await Metadata.fromAccountAddress(connection, metadataPda)
				const latestBlockhash = await connection.getLatestBlockhash()
				const lockMetadataIx = createUpdateMetadataAccountInstruction(
					{
						metadata: metadataPda,
						updateAuthority: publicKey
					},
					{
						updateMetadataAccountArgs: {
							data: metadataAccount.data,
							updateAuthority: publicKey,
							primarySaleHappened: false,
							isMutable: false
						}
					}
				)
				const lockTx = new Transaction().add(lockMetadataIx)
				const lockSignature = await sendTransaction(lockTx, connection)
				await connection.confirmTransaction({ signature: lockSignature, ...latestBlockhash }, 'confirmed')
				return { message: 'Successfully lock metadata' }
			} catch (error: unknown) {
				throw new Error(`Revoke authority failed! ${error}`)
			}
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: ['get-token-data-detail', { endpoint: connection.rpcEndpoint, mintAddress }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, publicKey }]
				})
			])
	})
}

export function useUpdateMetadata({ mintAddress }: { mintAddress: PublicKey }) {
	const { publicKey, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation({
		mutationKey: ['lock-metadata', mintAddress],
		mutationFn: async (data: UpdateMetadataPayload) => {
			try {
				if (!publicKey) throw new Error('Wallet not connected')

				console.log('Before metadataPda')

				const [metadataPda] = PublicKey.findProgramAddressSync(
					[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
					PROGRAM_ID
				)

				console.log('After metadataPda')

				let metadataAccount
				try {
					metadataAccount = await Metadata.fromAccountAddress(connection, metadataPda)
				} catch (err) {
					console.warn(`Metadata not found, creating new metadata...`)

					// Upload token icon to IPFS
					let iconUri = ''
					if (data.token_icon) {
						iconUri = await uploadIconToPinata(data.token_icon)
					}

					const uploadToIPFSPayload: UploadToMetadataPayload = {
						token_name: data.token_name,
						token_symbol: data.token_symbol,
						token_icon: iconUri,
						description: data.description
					}

					const ipfsUri = await uploadMetadataToPinata(uploadToIPFSPayload)

					const createData = {
						name: data.token_name,
						symbol: data.token_symbol,
						uri: ipfsUri,
						sellerFeeBasisPoints: 0,
						creators: null,
						collection: null,
						uses: null
					}

					const createIx = createCreateMetadataAccountInstruction(
						{
							metadata: metadataPda,
							mint: mintAddress,
							mintAuthority: publicKey,
							payer: publicKey,
							updateAuthority: publicKey
						},
						{
							createMetadataAccountArgs: {
								data: createData,
								isMutable: true,
								collectionDetails: null
							}
						}
					)

					const createTx = new Transaction().add(createIx)
					const latestBlockhash = await connection.getLatestBlockhash()
					const sig = await sendTransaction(createTx, connection)
					await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')

					return { message: 'Successfully created new metadata' }
				}

				const latestBlockhash = await connection.getLatestBlockhash()

				console.log('After Metadata 2')

				const uriData = await axios.get<MetadataURI>(metadataAccount.data.uri)
				let iconUri: string = uriData.data.image

				if (data.token_icon) {
					iconUri = await uploadIconToPinata(data.token_icon)
				}

				const uploadToIPFSPayload: UploadToMetadataPayload = {
					token_name: data.token_name,
					token_symbol: data.token_symbol,
					token_icon: iconUri,
					description: data.description
				}

				const ipfsUri = await uploadMetadataToPinata(uploadToIPFSPayload)

				const updatedData = {
					...metadataAccount.data,
					name: data.token_name,
					symbol: data.token_symbol,
					uri: ipfsUri
				}

				const updateMetadataIx = createUpdateMetadataAccountInstruction(
					{
						metadata: metadataPda,
						updateAuthority: publicKey
					},
					{
						updateMetadataAccountArgs: {
							data: updatedData,
							updateAuthority: publicKey,
							primarySaleHappened: false,
							isMutable: true
						}
					}
				)
				const updateTx = new Transaction().add(updateMetadataIx)
				const updateSignature = await sendTransaction(updateTx, connection)
				await connection.confirmTransaction({ signature: updateSignature, ...latestBlockhash }, 'confirmed')
				return { message: 'Successfully update metadata' }
			} catch (error: unknown) {
				throw new Error(`Failed! ${error}`)
			}
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: ['get-token-data-detail', { endpoint: connection.rpcEndpoint, mintAddress }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, publicKey }]
				})
			])
	})
}

export function useGetNFTDataQueries({ address }: { address: PublicKey }) {
	const { connection } = useConnection()
	const tokenAccounts = useGetTokenAccounts({ address })

	const NFTMetadataQueries = useQueries({
		queries: (tokenAccounts.data ?? []).map((account) => {
			const mint = account.account.data.parsed.info.mint
			const mintKey = new PublicKey(mint)

			return {
				queryKey: ['get-nft-data', { endpoint: connection.rpcEndpoint, mintKey }],
				queryFn: async () => {
					try {
						const [signatures, mintAccountInfo] = await Promise.all([
							connection.getSignaturesForAddress(mintKey),
							getMint(connection, mintKey)
						])

						const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0
						const decimals = mintAccountInfo.decimals
						const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

						if (decimals !== 0 && supply !== 1) return null

						console.log('account info ', mintAccountInfo)

						const parsedMetadata = await getParsedTokenMetadata(connection, mintKey)
						let collectionProps = null
						if (parsedMetadata.collection) {
							collectionProps = await getCollectionDetail({
								mintAddress: new PublicKey(parsedMetadata?.collection?.key ?? ''),
								connection
							})
						}

						console.log('parsed metadata ', parsedMetadata)

						if (parsedMetadata.collectionDetails) return null

						if (!parsedMetadata) {
							return {
								mintAddress: mintKey.toBase58(),
								name: null,
								symbol: null,
								collection: null,
								collectionName: '',
								uses: null,
								creators: null,
								sellerFeeBasisPoints: 0,
								decimals,
								supply,
								metadataAddress: '',
								metadataLink: '',
								metadataURI: null,
								date: blockTime
							} satisfies GetNFTResponse
						}

						return {
							mintAddress: mintKey.toBase58(),
							name: parsedMetadata.name,
							symbol: parsedMetadata.symbol,
							collection: parsedMetadata.collection,
							collectionName: collectionProps?.name ?? '-',
							uses: parsedMetadata.uses,
							creators: parsedMetadata.creators,
							sellerFeeBasisPoints: parsedMetadata.sellerFeeBasisPoints,
							decimals,
							supply,
							metadataAddress: parsedMetadata.metadataAddress,
							metadataLink: parsedMetadata.metadataLink,
							metadataURI: parsedMetadata.metadataURI,
							date: blockTime
						} satisfies GetNFTResponse
					} catch (err) {
						console.error(`Error fetching metadata for mint ${mint}:`, err)
						return null
					}
				},
				enabled: true
			}
		}),
		combine: (results) => ({
			data: results
				.map((r) => r.data)
				.filter((r): r is GetNFTResponse => !!r?.mintAddress && typeof r.date === 'number'),
			isPending: results.some((r) => r.isPending)
		})
	})

	return NFTMetadataQueries
}

export function useGetNFTDataDetail({ mintAddress }: { mintAddress: PublicKey }) {
	const { connection } = useConnection()
	return useQuery({
		queryKey: ['get-nft-data-detail', { endpoint: connection.rpcEndpoint, mintAddress }],
		queryFn: async () => {
			try {
				const [signatures, mintAccountInfo] = await Promise.all([
					connection.getSignaturesForAddress(mintAddress),
					getMint(connection, mintAddress)
				])

				const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0
				const decimals = mintAccountInfo.decimals
				const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

				const parsedMetadata = await getParsedTokenMetadata(connection, mintAddress)

				const metadataAddress = new PublicKey(parsedMetadata.metadataAddress)
				const getCollection = await getCollectionDetail({
					mintAddress: new PublicKey(parsedMetadata?.collection?.key ?? ''),
					connection
				})

				if (!parsedMetadata) {
					return {
						mintAddress: mintAddress.toBase58(),
						name: null,
						symbol: null,
						collection: null,
						collectionName: '',
						uses: null,
						creators: null,
						sellerFeeBasisPoints: 0,
						decimals,
						supply,
						metadataAddress: '',
						metadataLink: '',
						metadataURI: null,
						date: blockTime
					} satisfies GetNFTResponse
				}

				return {
					mintAddress: mintAddress.toBase58(),
					name: parsedMetadata.name,
					symbol: parsedMetadata.symbol,
					collection: parsedMetadata.collection,
					collectionName: getCollection?.name ?? '',
					uses: parsedMetadata.uses,
					creators: parsedMetadata.creators,
					sellerFeeBasisPoints: parsedMetadata.sellerFeeBasisPoints,
					decimals,
					supply,
					metadataAddress: metadataAddress.toBase58(),
					metadataLink: parsedMetadata.metadataLink,
					metadataURI: parsedMetadata.metadataURI as NFTMetadataContent,
					date: blockTime
				} satisfies GetNFTResponse
			} catch (err) {
				console.error(`Error fetching nft for mint ${mintAddress}:`, err)
			}
		}
	})
}

export function useMintNFTCreator() {
	const { publicKey, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()

	return useMutation({
		mutationKey: ['nft-creator', { endpoint: connection.rpcEndpoint }],
		mutationFn: async (payload: MintNFTPayload) => {
			if (!publicKey) throw new Error('Wallet not connected')
			try {
				// Create mint with decimals = 0 for NFT
				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const latestBlockhash = await connection.getLatestBlockhash()
				const mintKeypair = Keypair.generate()
				const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey)

				// Create instructions to create a new mint account
				const createAccountTx = new Transaction().add(
					SystemProgram.createAccount({
						fromPubkey: publicKey,
						newAccountPubkey: mintKeypair.publicKey,
						space: MINT_SIZE,
						daltons,
						programId: TOKEN_PROGRAM_ID
					}),
					createInitializeMintInstruction(
						mintKeypair.publicKey,
						0, // decimals
						publicKey,
						publicKey,
						TOKEN_PROGRAM_ID
					),
					createAssociatedTokenAccountInstruction(publicKey, tokenATA, publicKey, mintKeypair.publicKey),
					createMintToInstruction(
						mintKeypair.publicKey,
						tokenATA,
						publicKey, // mint authority
						1 // amount
					)
				)
				createAccountTx.recentBlockhash = latestBlockhash.blockhash
				createAccountTx.feePayer = publicKey

				console.log('Successfully create account', createAccountTx)

				// Paritially sign the transaction with the mint keypair
				createAccountTx.partialSign(mintKeypair)
				const createSignature = await sendTransaction(createAccountTx, connection)

				await connection.confirmTransaction({ signature: createSignature, ...latestBlockhash }, 'confirmed')

				const [metadataPda] = PublicKey.findProgramAddressSync(
					[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
					PROGRAM_ID
				)

				// Create metadata
				const data = {
					name: payload.name,
					symbol: payload.symbol,
					uri: payload.uri,
					sellerFeeBasisPoints: 500,
					creators: [{ address: publicKey, verified: true, share: 100 }],
					collection: payload.collection,
					uses: payload.uses
				}

				const metadataIx = createCreateMetadataAccountInstruction(
					{
						metadata: metadataPda,
						mint: mintKeypair.publicKey,
						mintAuthority: publicKey,
						payer: publicKey,
						updateAuthority: publicKey
					},
					{
						createMetadataAccountArgs: {
							data,
							isMutable: true,
							collectionDetails: null
						}
					}
				)

				// Send metadata transaction
				const metadataTx = new Transaction().add(metadataIx)
				metadataTx.recentBlockhash = latestBlockhash.blockhash
				metadataTx.feePayer = publicKey

				const signature = await sendTransaction(metadataTx, connection)
				await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

				return {
					mintAddress: mintKeypair.publicKey.toBase58(),
					metadataAddress: metadataPda.toBase58(),
					signature
				}
			} catch (error: unknown) {
				throw new Error(`NFT creation failed: ${error}`)
			}
		},
		onSuccess: () => {
			return Promise.all([
				client.invalidateQueries({
					queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address: publicKey }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address: publicKey }]
				})
			])
		}
	})
}

export function useMintCollectionCreator() {
	const { publicKey, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()

	return useMutation({
		mutationKey: ['collection-creator', { endpoint: connection.rpcEndpoint }],
		mutationFn: async (payload: UploadCollectionPayload) => {
			if (!publicKey) throw new Error('Wallet not connected')
			try {
				// Create mint with decimals = 0 for NFT
				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const latestBlockhash = await connection.getLatestBlockhash()
				const mintKeypair = Keypair.generate()
				const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey)

				// Create instructions to create a new mint account
				const createAccountTx = new Transaction().add(
					SystemProgram.createAccount({
						fromPubkey: publicKey,
						newAccountPubkey: mintKeypair.publicKey,
						space: MINT_SIZE,
						daltons,
						programId: TOKEN_PROGRAM_ID
					}),
					createInitializeMintInstruction(
						mintKeypair.publicKey,
						0, // decimals
						publicKey,
						publicKey,
						TOKEN_PROGRAM_ID
					),
					createAssociatedTokenAccountInstruction(publicKey, tokenATA, publicKey, mintKeypair.publicKey),
					createMintToInstruction(
						mintKeypair.publicKey,
						tokenATA,
						publicKey, // mint authority
						1 // amount
					)
				)
				createAccountTx.recentBlockhash = latestBlockhash.blockhash
				createAccountTx.feePayer = publicKey

				console.log('Successfully create account', createAccountTx)

				// Paritially sign the transaction with the mint keypair
				createAccountTx.partialSign(mintKeypair)
				const createSignature = await sendTransaction(createAccountTx, connection)

				await connection.confirmTransaction({ signature: createSignature, ...latestBlockhash }, 'confirmed')

				const [metadataPda] = PublicKey.findProgramAddressSync(
					[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
					PROGRAM_ID
				)

				// Create metadata
				const data = {
					name: payload.name,
					symbol: payload.symbol,
					uri: payload.metadata_uri,
					sellerFeeBasisPoints: Number(payload.royalities) ?? 500,
					creators: [{ address: publicKey, verified: true, share: 100 }],
					collection: null,
					uses: null
				}

				const metadataIx = createCreateMetadataAccountInstruction(
					{
						metadata: metadataPda,
						mint: mintKeypair.publicKey,
						mintAuthority: publicKey,
						payer: publicKey,
						updateAuthority: publicKey
					},
					{
						createMetadataAccountArgs: {
							data,
							isMutable: true,
							collectionDetails: {
								__kind: 'V1',
								size: new BN(0)
							}
						}
					}
				)

				// Send metadata transaction
				const metadataTx = new Transaction().add(metadataIx)
				metadataTx.recentBlockhash = latestBlockhash.blockhash
				metadataTx.feePayer = publicKey

				const signature = await sendTransaction(metadataTx, connection)
				await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

				return {
					mintAddress: mintKeypair.publicKey.toBase58(),
					metadataAddress: metadataPda.toBase58(),
					signature,
					data
				}
			} catch (error: unknown) {
				throw new Error(`Collection creation failed: ${error}`)
			}
		},
		onSuccess: () => {
			return Promise.all([
				client.invalidateQueries({
					queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address: publicKey }]
				}),
				client.invalidateQueries({
					queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address: publicKey }]
				})
			])
		}
	})
}

export function useGetCollectionDataQueries({ address }: { address: PublicKey }) {
	const { connection } = useConnection()
	const tokenAccounts = useGetTokenAccounts({ address })

	const CollectionMetadataQueries = useQueries({
		queries: (tokenAccounts.data ?? []).map((account) => {
			const mint = account.account.data.parsed.info.mint
			const mintKey = new PublicKey(mint)

			return {
				queryKey: ['get-collection-data', { endpoint: connection.rpcEndpoint, mintKey }],
				queryFn: async () => {
					try {
						const [signatures, mintAccountInfo] = await Promise.all([
							connection.getSignaturesForAddress(mintKey),
							getMint(connection, mintKey)
						])

						const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0
						const decimals = mintAccountInfo.decimals
						const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

						if (decimals !== 0 && supply !== 1) return null

						const parsedMetadata = await getParsedTokenMetadata(connection, mintKey)

						if (!parsedMetadata.collectionDetails) return null

						return {
							mintAddress: mintKey.toBase58(),
							name: parsedMetadata.name,
							symbol: parsedMetadata.symbol,
							collection: parsedMetadata.collection,
							collectionName: '',
							uses: parsedMetadata.uses,
							creators: parsedMetadata.creators,
							sellerFeeBasisPoints: parsedMetadata.sellerFeeBasisPoints,
							decimals,
							supply,
							metadataAddress: parsedMetadata.metadataAddress,
							metadataLink: parsedMetadata.metadataLink,
							metadataURI: parsedMetadata.metadataURI,
							date: blockTime
						} satisfies GetNFTResponse
					} catch (err) {
						console.error(`Error fetching metadata for mint ${mint}:`, err)
						return null
					}
				},
				enabled: true
			}
		}),
		combine: (results) => ({
			data: results
				.map((r) => r.data)
				.filter((r): r is GetNFTResponse => !!r?.mintAddress && typeof r.date === 'number'),
			isPending: results.some((r) => r.isPending)
		})
	})

	return CollectionMetadataQueries
}

export async function getCollectionDetail({
	mintAddress,
	connection
}: {
	mintAddress: PublicKey
	connection: Connection
}) {
	const [signatures, mintAccountInfo] = await Promise.all([
		connection.getSignaturesForAddress(mintAddress),
		getMint(connection, mintAddress)
	])

	const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0
	const decimals = mintAccountInfo.decimals
	const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

	const parsedMetadata = await getParsedTokenMetadata(connection, mintAddress)

	const metadataAddress = new PublicKey(parsedMetadata.metadataAddress)

	if (!parsedMetadata) {
		return {
			mintAddress: mintAddress.toBase58(),
			name: null,
			symbol: null,
			collection: null,
			collectionName: '',
			uses: null,
			creators: null,
			sellerFeeBasisPoints: 0,
			decimals,
			supply,
			metadataAddress: '',
			metadataLink: '',
			metadataURI: null,
			date: blockTime
		} satisfies GetNFTResponse
	}

	if (!parsedMetadata.collectionDetails) return null

	return {
		mintAddress: mintAddress.toBase58(),
		name: parsedMetadata.name,
		symbol: parsedMetadata.symbol,
		collection: parsedMetadata.collection,
		collectionName: '',
		uses: parsedMetadata.uses,
		creators: parsedMetadata.creators,
		sellerFeeBasisPoints: parsedMetadata.sellerFeeBasisPoints,
		decimals,
		supply,
		metadataAddress: metadataAddress.toBase58(),
		metadataLink: parsedMetadata.metadataLink,
		metadataURI: parsedMetadata.metadataURI as NFTMetadataContent,
		date: blockTime
	} satisfies GetNFTResponse
}

export function useGetCollectionDataDetail({ mintAddress }: { mintAddress: PublicKey }) {
	const { connection } = useConnection()
	return useQuery({
		queryKey: ['get-collection-data-detail', { endpoint: connection.rpcEndpoint, mintAddress }],
		queryFn: async () => {
			try {
				await getCollectionDetail({ mintAddress, connection })
			} catch (err) {
				console.error(`Error fetching collection for mint ${mintAddress}:`, err)
			}
		}
	})
}
