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
	TOKEN_PROGRAM_ID
} from '@bbachain/spl-token'
import {
	createCreateMetadataAccountInstruction,
	CreateMetadataAccountArgs,
	createUpdateMetadataAccountInstruction,
	Metadata,
	PROGRAM_ID,
	UpdateMetadataAccountArgs
} from '@bbachain/spl-token-metadata'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import SERVICES_KEY from '@/constants/service'
import { uploadIconToPinata, uploadMetadataToPinata } from '@/lib/pinata'
import { getTokenAccounts } from '@/lib/tokenAccount'
import { TSuccessMessage } from '@/types'

import {
	TCreateTokenPayload,
	TCreateTokenResponse,
	TGetTokenResponse,
	TGetTokenDetailResponse,
	UploadToMetadataPayload,
	TGetTokenDataResponse,
	TUpdateTokenMetadataPayload,
	TUpdateTokenMetadataResponse,
	TBurnTokenPayload,
	TMintTokenPayload
} from './types'
import { getTokenData, getTokenMetadata, getLPTokenData } from './utils'

export const useGetTokens = () => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetTokenResponse>({
		queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress?.toBase58()],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const tokenAccounts = await getTokenAccounts(connection, ownerAddress)
			const tokenData = await Promise.all(
				tokenAccounts.map(async (account) => {
					const mintKey = new PublicKey(account.mintAddress)
					return await getTokenData(connection, mintKey)
				})
			)

			const filteredTokenData = tokenData.filter((token): token is TGetTokenDataResponse => token !== null)

			return {
				message: `Successfully get token with address ${ownerAddress.toBase58()}`,
				data: filteredTokenData
			}
		}
	})
}

export const useGetTokenDetail = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetTokenDetailResponse>({
		queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN_DETAIL, ownerAddress?.toBase58(), mintAddress],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const mintKey = new PublicKey(mintAddress)
			const tokenData = await getTokenData(connection, mintKey)

			if (!tokenData) throw new Error('Token data not found or is not a valid fungible token')

			return {
				message: `Successfully get token with mint address ${mintAddress}`,
				data: tokenData
			}
		},
		enabled: !!ownerAddress
	})
}

export const useCreateToken = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const client = useQueryClient()
	return useMutation<TCreateTokenResponse, Error, TCreateTokenPayload>({
		mutationKey: [SERVICES_KEY.TOKEN.CREATE_TOKEN, ownerAddress?.toBase58()],
		mutationFn: async (payload) => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const daltons = await getMinimumBalanceForRentExemptMint(connection)
			const latestBlockhash = await connection.getLatestBlockhash()
			const mintKeypair = Keypair.generate()
			const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, ownerAddress)

			const supply = Number(payload.supply)
			const decimals = Number(payload.decimals)

			const createAccountTx = new Transaction().add(
				SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: mintKeypair.publicKey,
					space: MINT_SIZE,
					daltons,
					programId: TOKEN_PROGRAM_ID
				}),
				createInitializeMintInstruction(mintKeypair.publicKey, decimals, ownerAddress, ownerAddress, TOKEN_PROGRAM_ID),
				createAssociatedTokenAccountInstruction(ownerAddress, tokenATA, ownerAddress, mintKeypair.publicKey),
				createMintToInstruction(
					mintKeypair.publicKey,
					tokenATA,
					ownerAddress, // mint authority
					supply * Math.pow(10, decimals)
				)
			)

			createAccountTx.recentBlockhash = latestBlockhash.blockhash
			createAccountTx.feePayer = ownerAddress

			createAccountTx.partialSign(mintKeypair)
			const accountSignature = await sendTransaction(createAccountTx, connection)
			await connection.confirmTransaction({ signature: accountSignature, ...latestBlockhash }, 'confirmed')

			// Create the metadata account

			const [metadataPda] = PublicKey.findProgramAddressSync(
				[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
				PROGRAM_ID
			)

			// Off Chain Metadata Upload
			const iconUri = await uploadIconToPinata(payload.icon)
			const offChainMetadataPayload: UploadToMetadataPayload = {
				name: payload.name,
				symbol: payload.symbol,
				description: payload.description === '' ? null : payload.description,
				image: iconUri
			}
			const ipfsUri = await uploadMetadataToPinata(offChainMetadataPayload)

			// On Chain Metadata Upload
			const onChainMetadataPayload = {
				name: payload.name,
				symbol: payload.symbol,
				uri: ipfsUri,
				sellerFeeBasisPoints: 0,
				creators: null,
				collection: null,
				uses: null
			}

			const createMetadataAccountArgs: CreateMetadataAccountArgs = {
				data: onChainMetadataPayload,
				isMutable: true,
				collectionDetails: null
			}

			const createdMetadataIx = createCreateMetadataAccountInstruction(
				{
					metadata: metadataPda,
					mint: mintKeypair.publicKey,
					mintAuthority: ownerAddress,
					payer: ownerAddress,
					updateAuthority: ownerAddress
				},
				{ createMetadataAccountArgs }
			)

			const createdMetadataTx = new Transaction().add(createdMetadataIx)
			createdMetadataTx.recentBlockhash = latestBlockhash.blockhash
			createdMetadataTx.feePayer = ownerAddress
			const metadataSignature = await sendTransaction(createdMetadataTx, connection)
			await connection.confirmTransaction({ signature: metadataSignature, ...latestBlockhash }, 'confirmed')

			// Revoke authorities (mint/freeze) transaction if requested
			const revokeTx = new Transaction()

			if (payload.revoke_mint) {
				revokeTx.add(createSetAuthorityInstruction(mintKeypair.publicKey, ownerAddress, AuthorityType.MintTokens, null))
			}

			if (payload.revoke_freeze) {
				revokeTx.add(
					createSetAuthorityInstruction(mintKeypair.publicKey, ownerAddress, AuthorityType.FreezeAccount, null)
				)
			}

			if (revokeTx.instructions.length > 0) {
				revokeTx.recentBlockhash = latestBlockhash.blockhash
				revokeTx.feePayer = ownerAddress
				const revokeSignature = await sendTransaction(revokeTx, connection)
				await connection.confirmTransaction({ signature: revokeSignature, ...latestBlockhash }, 'confirmed')
			}

			if (payload.immutable_metadata) {
				const updateMetadataAccountArgs = {
					data: onChainMetadataPayload,
					updateAuthority: ownerAddress,
					primarySaleHappened: false,
					isMutable: false
				}
				const lockMetadataIx = createUpdateMetadataAccountInstruction(
					{
						metadata: metadataPda,
						updateAuthority: ownerAddress
					},
					{ updateMetadataAccountArgs }
				)

				const lockMetadataTx = new Transaction().add(lockMetadataIx)
				lockMetadataTx.recentBlockhash = latestBlockhash.blockhash
				lockMetadataTx.feePayer = ownerAddress
				const lockSignature = await sendTransaction(lockMetadataTx, connection)
				await connection.confirmTransaction({ signature: lockSignature, ...latestBlockhash }, 'confirmed')
			}

			const data = {
				ownerAddress: ownerAddress.toBase58(),
				mintAddress: mintKeypair.publicKey.toBase58(),
				metadataAddress: metadataPda.toBase58(),
				metadata: offChainMetadataPayload
			}

			return { message: 'Successfully created token', data }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress?.toBase58()]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useUpdateTokenMetadata = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation<TUpdateTokenMetadataResponse, Error, TUpdateTokenMetadataPayload>({
		mutationKey: [SERVICES_KEY.TOKEN.UPDATE_TOKEN_METADATA, ownerAddress?.toBase58(), mintAddress],
		mutationFn: async (payload) => {
			if (!ownerAddress) throw new Error('Wallet not connected')
			const mintKey = new PublicKey(mintAddress)
			const latestBlockhash = await connection.getLatestBlockhash()

			const [metadataPda] = PublicKey.findProgramAddressSync(
				[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
				PROGRAM_ID
			)

			const tokenMetadata = await getTokenMetadata(connection, metadataPda)

			let iconUri = tokenMetadata.metadataOffChain.data.image ?? ''
			if (payload.icon) {
				iconUri = await uploadIconToPinata(payload.icon)
			}

			const updatedOffChainMetadata = {
				name: payload.name,
				symbol: payload.symbol,
				description: payload.description === '' ? null : payload.description,
				image: iconUri
			}

			const ipfsUri = await uploadMetadataToPinata(updatedOffChainMetadata)

			const updatedOnChainMetadata = {
				name: payload.name,
				symbol: payload.symbol,
				uri: ipfsUri,
				sellerFeeBasisPoints: tokenMetadata.sellerFeeBasisPoints,
				creators: tokenMetadata.creators,
				collection: tokenMetadata.collection,
				uses: tokenMetadata.uses
			}

			if (!tokenMetadata.metadataAddress) {
				console.log('Metadata account does not exists, creating new one...')

				const createMetadataAccountArgs: CreateMetadataAccountArgs = {
					data: updatedOnChainMetadata,
					isMutable: true,
					collectionDetails: null
				}
				const createdMetadataIx = createCreateMetadataAccountInstruction(
					{
						metadata: metadataPda,
						mint: mintKey,
						mintAuthority: ownerAddress,
						payer: ownerAddress,
						updateAuthority: ownerAddress
					},
					{ createMetadataAccountArgs }
				)

				const createdMetadataTx = new Transaction().add(createdMetadataIx)
				createdMetadataTx.recentBlockhash = latestBlockhash.blockhash
				createdMetadataTx.feePayer = ownerAddress
				const createMetadataSignature = await sendTransaction(createdMetadataTx, connection)
				await connection.confirmTransaction({ signature: createMetadataSignature, ...latestBlockhash }, 'confirmed')
			} else {
				const updateMetadataAccountArgs: UpdateMetadataAccountArgs = {
					data: updatedOnChainMetadata,
					updateAuthority: ownerAddress,
					primarySaleHappened: false,
					isMutable: true
				}
				const updateMetadataIx = createUpdateMetadataAccountInstruction(
					{
						metadata: metadataPda,
						updateAuthority: ownerAddress
					},
					{ updateMetadataAccountArgs }
				)

				const updatedMetadataTx = new Transaction().add(updateMetadataIx)
				updatedMetadataTx.recentBlockhash = latestBlockhash.blockhash
				updatedMetadataTx.feePayer = ownerAddress
				const updateMetadataSignature = await sendTransaction(updatedMetadataTx, connection)
				await connection.confirmTransaction({ signature: updateMetadataSignature, ...latestBlockhash }, 'confirmed')
			}

			const data = {
				ownerAddress: ownerAddress.toBase58(),
				mintAddress: mintKey.toBase58(),
				metadataAddress: metadataPda.toBase58(),
				metadata: updatedOffChainMetadata
			}

			return { message: 'Successfully updated your token metadata', data }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress?.toBase58()]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN_DETAIL, ownerAddress?.toBase58(), mintAddress]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useLockMetadata = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation<TSuccessMessage>({
		mutationKey: [SERVICES_KEY.TOKEN.LOCK_METADATA, ownerAddress?.toBase58(), mintAddress],
		mutationFn: async () => {
			if (!ownerAddress) throw new Error('Wallet not connected')
			const mintKey = new PublicKey(mintAddress)
			const latestBlockhash = await connection.getLatestBlockhash()

			const [metadataPda] = PublicKey.findProgramAddressSync(
				[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
				PROGRAM_ID
			)

			const accountInfo = await connection.getAccountInfo(metadataPda)

			if (!accountInfo || !accountInfo?.data)
				throw new Error('This address does not have metadata account, please update your metadata first.')

			const [metadata] = Metadata.deserialize(accountInfo?.data)

			const updateMetadataAccountArgs = {
				data: metadata.data,
				updateAuthority: ownerAddress,
				primarySaleHappened: false,
				isMutable: false
			}

			const updateMetadataIx = createUpdateMetadataAccountInstruction(
				{
					metadata: metadataPda,
					updateAuthority: ownerAddress
				},
				{ updateMetadataAccountArgs }
			)

			const updatedMetadataTx = new Transaction().add(updateMetadataIx)
			updatedMetadataTx.recentBlockhash = latestBlockhash.blockhash
			updatedMetadataTx.feePayer = ownerAddress
			const updateMetadataSignature = await sendTransaction(updatedMetadataTx, connection)
			await connection.confirmTransaction({ signature: updateMetadataSignature, ...latestBlockhash }, 'confirmed')

			return { message: 'Successfully lock your metadata' }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress?.toBase58()]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN_DETAIL, ownerAddress?.toBase58(), mintAddress]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useRevokeMintAuthority = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation<TSuccessMessage>({
		mutationKey: [SERVICES_KEY.TOKEN.REVOKE_MINT, ownerAddress?.toBase58(), mintAddress],
		mutationFn: async () => {
			if (!ownerAddress) throw new Error('Wallet not connected')
			const mintKey = new PublicKey(mintAddress)
			const latestBlockhash = await connection.getLatestBlockhash()
			const revokeMintIx = createSetAuthorityInstruction(mintKey, ownerAddress, AuthorityType.MintTokens, null)
			const revokeMintTx = new Transaction().add(revokeMintIx)
			const revokeMintSignature = await sendTransaction(revokeMintTx, connection)
			await connection.confirmTransaction({ signature: revokeMintSignature, ...latestBlockhash }, 'confirmed')
			return { message: 'Successfully revoked mint authority' }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress?.toBase58()]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN_DETAIL, ownerAddress?.toBase58(), mintAddress]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useRevokeFreezeAuthority = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation<TSuccessMessage>({
		mutationKey: [SERVICES_KEY.TOKEN.REVOKE_FREEZE, ownerAddress?.toBase58(), mintAddress],
		mutationFn: async () => {
			if (!ownerAddress) throw new Error('Wallet not connected')
			const mintKey = new PublicKey(mintAddress)
			const latestBlockhash = await connection.getLatestBlockhash()
			const revokeMintIx = createSetAuthorityInstruction(mintKey, ownerAddress, AuthorityType.FreezeAccount, null)
			const revokeMintTx = new Transaction().add(revokeMintIx)
			const revokeMintSignature = await sendTransaction(revokeMintTx, connection)
			await connection.confirmTransaction({ signature: revokeMintSignature, ...latestBlockhash }, 'confirmed')
			return { message: 'Successfully revoked freeze authority' }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress?.toBase58()]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN_DETAIL, ownerAddress?.toBase58(), mintAddress]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useBurnTokenSupply = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation<TSuccessMessage, Error, TBurnTokenPayload>({
		mutationKey: [SERVICES_KEY.TOKEN.BURN_TOKEN_SUPPLY, ownerAddress?.toBase58(), mintAddress],
		mutationFn: async (payload) => {
			if (!ownerAddress) throw new Error('Wallet not connected')
			const mintKey = new PublicKey(mintAddress)
			const latestBlockhash = await connection.getLatestBlockhash()
			const amount = BigInt(Math.floor(payload.amount) * Math.pow(10, payload.decimals))
			const tokenAccount = await getAssociatedTokenAddress(mintKey, ownerAddress)

			const burnTokenIx = createBurnInstruction(tokenAccount, mintKey, ownerAddress, amount, [], TOKEN_PROGRAM_ID)
			const burnTokenTx = new Transaction().add(burnTokenIx)
			const burnTokenSignature = await sendTransaction(burnTokenTx, connection)
			await connection.confirmTransaction({ signature: burnTokenSignature, ...latestBlockhash }, 'confirmed')
			return { message: `Successfully burn ${payload.amount} tokens from your account` }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress?.toBase58()]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN_DETAIL, ownerAddress?.toBase58(), mintAddress]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useMintTokenSupply = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()
	return useMutation<TSuccessMessage, Error, TMintTokenPayload>({
		mutationKey: [SERVICES_KEY.TOKEN.BURN_TOKEN_SUPPLY, ownerAddress?.toBase58(), mintAddress],
		mutationFn: async (payload) => {
			if (!ownerAddress) throw new Error('Wallet not connected')
			const mintKey = new PublicKey(mintAddress)
			const latestBlockhash = await connection.getLatestBlockhash()
			const amount = BigInt(Math.floor(payload.amount) * Math.pow(10, payload.decimals))
			const tokenAccount = await getAssociatedTokenAddress(mintKey, ownerAddress)

			const mintTokenIx = createMintToInstruction(mintKey, tokenAccount, ownerAddress, amount, [], TOKEN_PROGRAM_ID)
			const mintTokenTx = new Transaction().add(mintTokenIx)
			const mintTokenSignature = await sendTransaction(mintTokenTx, connection)
			await connection.confirmTransaction({ signature: mintTokenSignature, ...latestBlockhash }, 'confirmed')
			return { message: `Successfully mint ${payload.amount} tokens to your account` }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress?.toBase58()]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN_DETAIL, ownerAddress?.toBase58(), mintAddress]
				}),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useGetLPTokens = () => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetTokenResponse>({
		queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, 'LP_TOKENS', ownerAddress?.toBase58()],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const tokenAccounts = await getTokenAccounts(connection, ownerAddress)
			const lpTokenData = await Promise.all(
				tokenAccounts.map(async (account) => {
					const mintKey = new PublicKey(account.mintAddress)
					return await getLPTokenData(connection, mintKey)
				})
			)

			const filteredLPTokenData = lpTokenData.filter((token): token is TGetTokenDataResponse => token !== null)

			return {
				message: `Successfully get LP tokens with address ${ownerAddress.toBase58()}`,
				data: filteredLPTokenData
			}
		},
		enabled: !!ownerAddress,
		staleTime: 30000, // 30 seconds
		gcTime: 5 * 60 * 1000 // 5 minutes
	})
}
