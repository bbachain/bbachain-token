import SERVICES_KEY from '@/constants/service'
import { getTokenAccounts } from '@/utils/tokenAccount'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'
import { CreateTokenPayload, TGetTokenResponse, UploadToMetadataPayload } from './types'
import { createTokenMetadataTx, getTokenData } from './utils'
import {
	AuthorityType,
	createAssociatedTokenAccountInstruction,
	createInitializeMintInstruction,
	createMintToInstruction,
	createSetAuthorityInstruction,
	getAssociatedTokenAddress,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	TOKEN_PROGRAM_ID
} from '@bbachain/spl-token'
import { CreateMetadataAccountArgs, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import { uploadIconToPinata, uploadMetadataToPinata } from '@/utils/pinata'
import { createMetadataTx } from '@/utils/metadata'

export const useGetTokens = () => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetTokenResponse[]>({
		queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const tokenAccounts = await getTokenAccounts(connection, ownerAddress)
			const tokenData = await Promise.all(
				tokenAccounts.map(async (account) => {
					const mintKey = new PublicKey(account.mintAddress)
					return await getTokenData(connection, mintKey)
				})
			)
			return tokenData.filter(Boolean) as TGetTokenResponse[]
		},
		enabled: !!ownerAddress
	})
}

export const useGetTokenDetail = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetTokenResponse>({
		queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN_DETAIL, ownerAddress, mintAddress],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const mintKey = new PublicKey(mintAddress)
			const tokenData = await getTokenData(connection, mintKey)

			if (!tokenData) throw new Error('Token data not found or is not a valid fungible token')

			return tokenData
		},
		enabled: !!ownerAddress
	})
}

export const useCreateToken = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	return useMutation({
		mutationKey: [SERVICES_KEY.TOKEN.CREATE_TOKEN],
		mutationFn: async (payload: CreateTokenPayload) => {
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
				icon: iconUri
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

			const createdMetadataTx = await createMetadataTx(
				ownerAddress,
				mintKeypair.publicKey,
				metadataPda,
				createMetadataAccountArgs
			)
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
		}
	})
}
