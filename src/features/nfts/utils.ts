import { getMint } from '@bbachain/spl-token'
import { Metadata, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import { Connection, PublicKey } from '@bbachain/web3.js'
import axios from 'axios'

import {
	TGetNFTDataResponse,
	TNFTCollectionProperties,
	TNFTMetadata,
	TNFTMetadataOffChain,
	TNFTMetadataOffChainData
} from './types'

export const getCollectionProperties = async (connection: Connection, metadataAddress: PublicKey) => {
	const collectionProperties: TNFTCollectionProperties = {
		metadataAddress: null,
		name: null,
		symbol: null
	}

	try {
		const accountInfo = await connection.getAccountInfo(metadataAddress)
		if (!accountInfo || !accountInfo?.data) return collectionProperties

		collectionProperties.metadataAddress = metadataAddress.toBase58()
		const [metadata] = Metadata.deserialize(accountInfo.data)

		const { name, symbol } = metadata.data
		collectionProperties.name = name
		collectionProperties.symbol = symbol
	} catch (error) {
		console.warn('Error fetching token metadata:', error)
	}

	return collectionProperties
}

export const getNFTMetadata = async (connection: Connection, metadataAddress: PublicKey) => {
	const initialCollectionMetadata = {
		name: null,
		family: null
	}

	const initialPropertiesMetadata = {
		files: [],
		category: null,
		creators: []
	}

	const initialMetadataOffChainData: TNFTMetadataOffChainData = {
		name: null,
		symbol: null,
		description: null,
		image: null,
		sellerFeeBasisPoints: 0,
		externalUrl: null,
		attributes: [],
		collection: initialCollectionMetadata,
		properties: initialPropertiesMetadata
	}

	const initialMetadataOffChain: TNFTMetadataOffChain = {
		link: null,
		data: initialMetadataOffChainData
	}

	const NFTMetadata: TNFTMetadata = {
		metadataAddress: null,
		name: null,
		symbol: null,
		sellerFeeBasisPoints: 0,
		creators: null,
		collection: null,
		collectionDetails: null,
		collectionProperties: null,
		uses: null,
		metadataOffChain: initialMetadataOffChain
	}

	try {
		const accountInfo = await connection.getAccountInfo(metadataAddress)
		if (!accountInfo || !accountInfo?.data) return NFTMetadata

		NFTMetadata.metadataAddress = metadataAddress.toBase58()
		const [metadata] = Metadata.deserialize(accountInfo.data)

		const { name, symbol, uri, collection, creators, uses, sellerFeeBasisPoints } = metadata.data
		NFTMetadata.name = name
		NFTMetadata.symbol = symbol
		NFTMetadata.collection = collection
		NFTMetadata.collectionDetails = metadata.collectionDetails
		NFTMetadata.creators = creators
		NFTMetadata.uses = uses
		NFTMetadata.sellerFeeBasisPoints = sellerFeeBasisPoints

		if (NFTMetadata.collection) {
			const collectionMintAddress = NFTMetadata.collection.key
			const [metadataPda] = PublicKey.findProgramAddressSync(
				[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), collectionMintAddress.toBuffer()],
				PROGRAM_ID
			)
			const collectionProperties = await getCollectionProperties(connection, metadataPda)
			NFTMetadata.collectionProperties = collectionProperties
		}

		if (uri) {
			const { data } = await axios.get<TNFTMetadataOffChainData>(uri)
			NFTMetadata.metadataOffChain.link = uri
			NFTMetadata.metadataOffChain.data = data
		}
	} catch (error) {
		console.warn('Error fetching token metadata:', error)
	}

	return NFTMetadata
}

export const getNFTData = async (
	connection: Connection,
	mintAddress: PublicKey
): Promise<TGetNFTDataResponse | null> => {
	const mintAccountInfo = await getMint(connection, mintAddress)
	const decimals = mintAccountInfo.decimals
	const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

	if (decimals !== 0 && supply !== 1) return null // this is hack to return only Non-Fungible Tokens, cause this condition is FT state

	const signatures = await connection.getSignaturesForAddress(mintAddress)
	const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0

	const [metadataPda] = PublicKey.findProgramAddressSync(
		[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
		PROGRAM_ID
	)

	const metadata = await getNFTMetadata(connection, metadataPda)

	return {
		mintAddress: mintAddress.toBase58(),
		decimals,
		supply,
		metadata,
		createdAt: blockTime
	}
}
