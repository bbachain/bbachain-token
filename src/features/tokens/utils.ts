import axios from 'axios'
import { Connection, PublicKey, Transaction } from '@bbachain/web3.js'
import { createCreateMetadataAccountInstruction, Metadata, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import { getMint } from '@bbachain/spl-token'
import {
	CreateTokenPayload,
	UploadToMetadataPayload,
	TGetTokenResponse,
	TTokenMetadata,
	TTokenMetadataOffChain,
	TTokenMetadataOffChainData
} from './types'
import { uploadIconToPinata, uploadMetadataToPinata } from '@/utils/pinata'

export const createTokenMetadataTx = async (ownerAddress: PublicKey, mintAddress: PublicKey, payload: CreateTokenPayload) => {
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



export const getTokenMetadata = async (connection: Connection, mintAddress: PublicKey) => {
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

export const getTokenData = async (connection: Connection, mintAddress: PublicKey): Promise<TGetTokenResponse | null> => {
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
