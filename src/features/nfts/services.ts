import {
	createAssociatedTokenAccountInstruction,
	createInitializeMintInstruction,
	createMintToInstruction,
	getAssociatedTokenAddress,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	TOKEN_PROGRAM_ID
} from '@bbachain/spl-token'
import {
	createCreateMetadataAccountInstruction,
	CreateMetadataAccountArgs,
	PROGRAM_ID
} from '@bbachain/spl-token-metadata'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import BN from 'bn.js'
import { ZodError } from 'zod'

import SERVICES_KEY from '@/constants/service'
import { getTokenAccounts } from '@/lib/tokenAccount'

import {
	TCreateCollectionPayload,
	TCreateNFTPayload,
	TCreateNFTResponse,
	TGetNFTDataResponse,
	TGetNFTDetailResponse,
	TGetNFTResponse,
	TNFTMetadataOffChainData,
	TValidateMetadataErrorResponse,
	TValidateMetadataOffChainPayload,
	TValidateMetadataSuccessResponse
} from './types'
import { getNFTData } from './utils'
import { NFTMetadataValidation } from './validation'

export const useGetNFTs = () => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetNFTResponse>({
		queryKey: [SERVICES_KEY.NFT.GET_NFT, ownerAddress?.toBase58()],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const tokenAccounts = await getTokenAccounts(connection, ownerAddress)
			const NFTData = await Promise.all(
				tokenAccounts.map(async (account) => {
					const mintKey = new PublicKey(account.mintAddress)
					const data = await getNFTData(connection, mintKey)
					if (data?.metadata.collectionDetails) return null // this is a hack to return only NFTs, not collections
					return data
				})
			)
			return {
				message: `Successfully get nft with address ${ownerAddress.toBase58()}`,
				data: NFTData.filter(Boolean) as TGetNFTDataResponse[]
			}
		},
		enabled: !!ownerAddress
	})
}

export const useGetNFTDetail = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetNFTDetailResponse>({
		queryKey: [SERVICES_KEY.NFT.GET_NFT_DETAIL, ownerAddress?.toBase58(), mintAddress],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const mintKey = new PublicKey(mintAddress)
			const NFTData = await getNFTData(connection, mintKey)

			if (!NFTData) throw new Error('NFT data not found or is not a valid')

			return {
				message: `Successfully get NFT with mint address ${mintAddress}`,
				data: NFTData
			}
		},
		enabled: !!ownerAddress
	})
}

export const useCreateNFT = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const client = useQueryClient()
	return useMutation<TCreateNFTResponse, Error, TCreateNFTPayload>({
		mutationKey: [SERVICES_KEY.NFT.CREATE_NFT, ownerAddress?.toBase58()],
		mutationFn: async (payload) => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const daltons = await getMinimumBalanceForRentExemptMint(connection)
			const latestBlockhash = await connection.getLatestBlockhash()
			const mintKeypair = Keypair.generate()
			const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, ownerAddress)

			const createAccountTx = new Transaction().add(
				SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: mintKeypair.publicKey,
					space: MINT_SIZE,
					daltons,
					programId: TOKEN_PROGRAM_ID
				}),
				createInitializeMintInstruction(mintKeypair.publicKey, 0, ownerAddress, ownerAddress, TOKEN_PROGRAM_ID),
				createAssociatedTokenAccountInstruction(ownerAddress, tokenATA, ownerAddress, mintKeypair.publicKey),
				createMintToInstruction(
					mintKeypair.publicKey,
					tokenATA,
					ownerAddress, // mint authority
					1
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

			const { data } = await axios.get<TNFTMetadataOffChainData>(payload.uri)

			// On Chain Metadata Upload
			const onChainMetadataPayload = {
				name: data.name ?? '',
				symbol: data.symbol ?? '',
				uri: payload.uri,
				sellerFeeBasisPoints: 500,
				creators: [{ address: ownerAddress, verified: true, share: 100 }],
				collection: payload.collection,
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
			const metadataSignature = await sendTransaction(createdMetadataTx, connection)
			await connection.confirmTransaction({ signature: metadataSignature, ...latestBlockhash }, 'confirmed')

			const dataResponse = {
				ownerAddress: ownerAddress.toBase58(),
				mintAddress: mintKeypair.publicKey.toBase58(),
				metadataAddress: metadataPda.toBase58(),
				metadata: data
			}

			return { message: 'Successfully created NFT', data: dataResponse }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: [SERVICES_KEY.NFT.GET_NFT, ownerAddress?.toBase58()] }),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useGetCollections = () => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetNFTResponse>({
		queryKey: [SERVICES_KEY.NFT.GET_COLLECTION, ownerAddress?.toBase58()],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const tokenAccounts = await getTokenAccounts(connection, ownerAddress)
			const NFTData = await Promise.all(
				tokenAccounts.map(async (account) => {
					const mintKey = new PublicKey(account.mintAddress)
					const data = await getNFTData(connection, mintKey)
					if (!data?.metadata.collectionDetails) return null // this is a hack to return only NFTs, not collections
					return data
				})
			)
			return {
				message: `Successfully get collections with address ${ownerAddress.toBase58()}`,
				data: NFTData.filter(Boolean) as TGetNFTDataResponse[]
			}
		},
		enabled: !!ownerAddress
	})
}

export const useCreateCollection = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const client = useQueryClient()
	return useMutation<TCreateNFTResponse, Error, TCreateCollectionPayload>({
		mutationKey: [SERVICES_KEY.NFT.CREATE_COLLECTION, ownerAddress?.toBase58()],
		mutationFn: async (payload) => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const daltons = await getMinimumBalanceForRentExemptMint(connection)
			const latestBlockhash = await connection.getLatestBlockhash()
			const mintKeypair = Keypair.generate()
			const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, ownerAddress)

			const createAccountTx = new Transaction().add(
				SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: mintKeypair.publicKey,
					space: MINT_SIZE,
					daltons,
					programId: TOKEN_PROGRAM_ID
				}),
				createInitializeMintInstruction(mintKeypair.publicKey, 0, ownerAddress, ownerAddress, TOKEN_PROGRAM_ID),
				createAssociatedTokenAccountInstruction(ownerAddress, tokenATA, ownerAddress, mintKeypair.publicKey),
				createMintToInstruction(
					mintKeypair.publicKey,
					tokenATA,
					ownerAddress, // mint authority
					1
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

			const { data } = await axios.get<TNFTMetadataOffChainData>(payload.uri)

			// On Chain Metadata Upload
			const onChainMetadataPayload = {
				name: payload.name,
				symbol: payload.symbol,
				uri: payload.uri,
				sellerFeeBasisPoints: Number(payload.sellerFeeBasisPoints),
				creators: [{ address: ownerAddress, verified: true, share: 100 }],
				collection: null,
				uses: null
			}

			const createMetadataAccountArgs: CreateMetadataAccountArgs = {
				data: onChainMetadataPayload,
				isMutable: true,
				collectionDetails: {
					__kind: 'V1',
					size: new BN(0)
				}
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
			const metadataSignature = await sendTransaction(createdMetadataTx, connection)
			await connection.confirmTransaction({ signature: metadataSignature, ...latestBlockhash }, 'confirmed')

			const dataResponse = {
				ownerAddress: ownerAddress.toBase58(),
				mintAddress: mintKeypair.publicKey.toBase58(),
				metadataAddress: metadataPda.toBase58(),
				metadata: data
			}

			return { message: `${payload.name} Successfully Created`, data: dataResponse }
		},
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: [SERVICES_KEY.NFT.GET_COLLECTION, ownerAddress?.toBase58()] }),
				client.invalidateQueries({
					queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
				})
			])
	})
}

export const useValidateOffChainMetadata = () =>
	useMutation<TValidateMetadataSuccessResponse, TValidateMetadataErrorResponse, TValidateMetadataOffChainPayload>({
		mutationKey: ['validate-metadata'],
		mutationFn: async (payload) => {
			try {
				const response = await axios.get(payload.uri)
				const validation = await NFTMetadataValidation.parseAsync(response.data)

				return {
					message: 'Successfully validate your metadata',
					data: response.data
				}
			} catch (err) {
				if (axios.isAxiosError(err)) {
					throw {
						errorMessage: 'Invalid Metadata URL',
						errorDetail: err.message
					} satisfies TValidateMetadataErrorResponse
				}

				if (err instanceof ZodError) {
					const groupedErrors: Record<string, string[]> = {}

					for (const issue of err.errors) {
						const path = issue.path.join('.')
						if (!groupedErrors[issue.message]) {
							groupedErrors[issue.message] = []
						}
						groupedErrors[issue.message].push(path || '(root)')
					}

					const readableErrorsString = Object.entries(groupedErrors)
						.map(([message, paths]) => `${paths.join(', ')}: ${message}`)
						.join('\n')

					throw {
						errorMessage: 'Invalid Metadata Format',
						errorDetail: readableErrorsString
					} satisfies TValidateMetadataErrorResponse
				}

				throw {
					errorMessage: 'Unknown Error',
					errorDetail: 'An unknown error occurred while validating metadata.'
				} satisfies TValidateMetadataErrorResponse
			}
		}
	})
