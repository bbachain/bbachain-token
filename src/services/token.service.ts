import axios from 'axios'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'
import { createCreateMetadataAccountInstruction, Metadata, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import type {
	TCreateToken,
	TGetToken,
	TTokenMetadata,
	TTokenMetadataOffChain,
	TTokenMetadataOffChainData
} from '@/types/response.types'
import {
	createAssociatedTokenAccountInstruction,
	createInitializeMintInstruction,
	createMintToInstruction,
	getAssociatedTokenAddress,
	getMinimumBalanceForRentExemptMint,
	getMint,
	MINT_SIZE,
	TOKEN_PROGRAM_ID
} from '@bbachain/spl-token'
import { CreateTokenPayload, UploadToMetadataPayload } from '../types/request.types'
import { WalletAdapterProps } from '@bbachain/wallet-adapter-base'
import { getTokenAccounts, uploadIconToPinata, uploadMetadataToPinata } from './global.service'
import { useMutation } from '@tanstack/react-query'
import SERVICES_KEY from '@/constants/service'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'

// helper functions

const createTokenMetadataTx = async (ownerAddress: PublicKey, mintAddress: PublicKey, payload: CreateTokenPayload) => {
	const [metadataPda] = PublicKey.findProgramAddressSync(
		[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
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

	const ix = createCreateMetadataAccountInstruction(
		{
			metadata: metadataPda,
			mint: mintAddress,
			mintAuthority: ownerAddress,
			payer: ownerAddress,
			updateAuthority: ownerAddress
		},
		{ createMetadataAccountArgs: { data: onChainMetadataPayload, isMutable: true, collectionDetails: null } }
	)

	const createdMetadataTx = new Transaction().add(ix)
	return createdMetadataTx
}

const revokeAuthorityTx = async () => {}

const getTokenMetadata = async (connection: Connection, mintAddress: PublicKey) => {
	const initialMetadataOffChainData: TTokenMetadataOffChainData = {
		name: null,
		symbol: null,
		description: null,
		image: null
	}

	const initialMetadataOffChain: TTokenMetadataOffChain = {
		link: null,
		data: initialMetadataOffChainData
	}

	const tokenMetadata: TTokenMetadata = {
		metadataAddress: null,
		isMutable: true,
		name: null,
		symbol: null,
		metadataOffChain: initialMetadataOffChain
	}

	try {
		const [metadataPda] = PublicKey.findProgramAddressSync(
			[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
			PROGRAM_ID
		)

		tokenMetadata.metadataAddress = metadataPda.toBase58()
		const accountInfo = await connection.getAccountInfo(metadataPda)

		if (!accountInfo?.data) return tokenMetadata

		const [metadata] = Metadata.deserialize(accountInfo.data)
		tokenMetadata.isMutable = metadata.isMutable

		const { name, symbol, uri } = metadata.data
		tokenMetadata.name = name
		tokenMetadata.symbol = symbol

		if (uri) {
			const { data } = await axios.get<TTokenMetadataOffChainData>(uri)
			tokenMetadata.metadataOffChain.link = uri
			tokenMetadata.metadataOffChain.data = data
		}
	} catch (error) {
		console.warn('Error fetching token metadata:', error)
	}

	return tokenMetadata
}

const getTokenData = async (connection: Connection, mintAddress: PublicKey): Promise<TGetToken | null> => {
	const mintAccountInfo = await getMint(connection, mintAddress)
	const decimals = mintAccountInfo.decimals
	const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

	if (decimals === 0 && supply === 1) return null // this is hack to return only Fungible Tokens, cause this condition is NFT state

	const signatures = await connection.getSignaturesForAddress(mintAddress)

	const revokeMint = mintAccountInfo.mintAuthority === null
	const revokeFreeze = mintAccountInfo.freezeAuthority === null
	const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0

	const authoritiesState = { revokeFreeze, revokeMint }
	const metadata = await getTokenMetadata(connection, mintAddress)

	return {
		mintAddress: mintAddress.toBase58(),
		decimals,
		supply,
		authoritiesState,
		metadata,
		createdAt: blockTime
	}
}

// main services

export const useGetTokens = () => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useMutation({
		mutationKey: [SERVICES_KEY.TOKEN.GET_TOKEN, ownerAddress],
		mutationFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			const tokenAccounts = await getTokenAccounts(connection, ownerAddress)
			let tokenData: TGetToken[] = []
			for (const account of tokenAccounts) {
				const mintKey = new PublicKey(account.mintAddress)
				const data = await getTokenData(connection, mintKey)
				if (data) {
					tokenData.push(data)
				}
			}
			return tokenData
		}
	})
}

export const createToken = async (
	connection: Connection,
	ownerAddress: PublicKey,
	payload: CreateTokenPayload,
	sendTransaction: WalletAdapterProps['sendTransaction']
) => {
	const daltons = await getMinimumBalanceForRentExemptMint(connection)
	const latestBlockhash = await connection.getLatestBlockhash()
	const mintKeypair = Keypair.generate()
	const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, ownerAddress)

	const supply = Number(payload.supply)
	const decimals = Number(payload.decimals)

	// Create the account
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
	const createdMetadataTx = await createTokenMetadataTx(ownerAddress, mintKeypair.publicKey, payload)
	const metadataSignature = await sendTransaction(createdMetadataTx, connection)
	await connection.confirmTransaction({ signature: metadataSignature, ...latestBlockhash }, 'confirmed')
}
