'use client'

import {
	AuthorityType,
	createAssociatedTokenAccountInstruction,
	createInitializeMintInstruction,
	createMint,
	createMintToInstruction,
	createSetAuthorityInstruction,
	getAssociatedTokenAddress,
	getMinimumBalanceForRentExemptMint,
	getOrCreateAssociatedTokenAccount,
	MINT_SIZE,
	mintTo,
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
import { CreateBBATokenPayload, MintNFTPayload } from '@/lib/validation'
import { uploadIconToPinata, uploadMetadataToPinata } from '@/lib/function'
import {
	createCreateMetadataAccountInstruction,
	createUpdateMetadataAccountInstruction,
	Data,
	Metadata,
	PROGRAM_ID
} from '@bbachain/spl-token-metadata'
import { getMint, setAuthority } from '@bbachain/spl-token'
import axios from 'axios'
import {
	CreateTokenResponse,
	GetTokenMetadataResponse,
	GetTokenResponse,
	MetadataURI,
	UpdateMetadataPayload,
	UploadToMetadataPayload
} from '@/lib/types'
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

		console.log('pda metadata ', metadataPda.toBase58())

		const accountInfo = await connection.getAccountInfo(metadataPda)
		if (!accountInfo?.data) {
			throw new Error(`No metadata found for mint address ${mintAddress.toString()}`)
		}

		const [metadata] = Metadata.deserialize(accountInfo.data)
		console.log('### metadata', metadata)

		if (!metadata)
			return {
				metadataAddress: metadataPda.toBase58(),
				name: null,
				symbol: null,
				metadataLink: null,
				metadataURI: null
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
			metadataAddress: metadataPda.toBase58(),
			name: name.replace(/\0/g, ''),
			symbol: symbol.replace(/\0/g, ''),
			metadataLink: metadataUri.replace(/\0/g, ''),
			metadataURI: uriData
		}
	} catch (error) {
		console.error('Error getting token metadata:', error)
		return {
			metadataAddress: '',
			name: null,
			symbol: null,
			metadataLink: null,
			metadataURI: null
		}
	}
}

export function useGetTokenDataQueries({ address }: { address: PublicKey }) {
	const { connection } = useConnection()
	const tokenAccounts = useGetTokenAccounts({ address })

	const tokenMetadataQueries = useQueries({
		queries: (tokenAccounts.data ?? []).map((account) => {
			const mint = account.account.data.parsed.info.mint
			const mintKey = new PublicKey(mint)

			return {
				queryKey: ['get-token-data', { endpoint: connection.rpcEndpoint, mintKey }],
				queryFn: async () => {
					try {
						const [metadata, signatures, mintAccountInfo] = await Promise.all([
							geTokenMetadata({ connection, mintAddress: mintKey }),
							connection.getSignaturesForAddress(mintKey),
							getMint(connection, mintKey)
						])

						const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0
						const decimals = mintAccountInfo.decimals
						const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

						if (decimals === 0 && supply === 1) return null

						const revokeMint = mintAccountInfo.mintAuthority === null
						const revokeFreeze = mintAccountInfo.freezeAuthority === null

						const metadataAddress = new PublicKey(metadata.metadataAddress)
						const metadataAccount = await Metadata.fromAccountAddress(connection, metadataAddress)
						const immutableMetadata = !metadataAccount.isMutable

						const authoritiesState = {
							revoke_freeze: revokeFreeze,
							revoke_mint: revokeMint,
							immutable_metadata: immutableMetadata
						}

						return {
							mintAddress: mintKey.toBase58(),
							name: metadata.name,
							symbol: metadata.symbol,
							decimals,
							supply,
							metadataAddress: metadataAddress.toBase58(),
							metadataLink: metadata.metadataLink,
							metadataURI: metadata.metadataURI,
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
				const [metadata, signatures, mintAccountInfo] = await Promise.all([
					geTokenMetadata({ connection, mintAddress }),
					connection.getSignaturesForAddress(mintAddress),
					getMint(connection, mintAddress)
				])

				const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0
				const decimals = mintAccountInfo.decimals
				const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)
				const revokeMint = mintAccountInfo.mintAuthority === null
				const revokeFreeze = mintAccountInfo.freezeAuthority === null

				const metadataAddress = new PublicKey(metadata.metadataAddress)
				const metadataAccount = await Metadata.fromAccountAddress(connection, metadataAddress)
				const immutableMetadata = !metadataAccount.isMutable

				const authoritiesState = {
					revoke_freeze: revokeFreeze,
					revoke_mint: revokeMint,
					immutable_metadata: immutableMetadata
				}

				console.log({
					mintAddress: mintAddress.toBase58(),
					name: metadata.name,
					symbol: metadata.symbol,
					decimals,
					supply,
					metadataAddress: metadataAddress.toBase58(),
					metadataLink: metadata.metadataLink,
					metadataURI: metadata.metadataURI,
					authoritiesState,
					date: blockTime
				})

				return {
					mintAddress: mintAddress.toBase58(),
					name: metadata.name,
					symbol: metadata.symbol,
					decimals,
					supply,
					metadataAddress: metadataAddress.toBase58(),
					metadataLink: metadata.metadataLink,
					metadataURI: metadata.metadataURI,
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

				const [metadataPda] = PublicKey.findProgramAddressSync(
					[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
					PROGRAM_ID
				)

				const metadataAccount = await Metadata.fromAccountAddress(connection, metadataPda)
				const latestBlockhash = await connection.getLatestBlockhash()

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
