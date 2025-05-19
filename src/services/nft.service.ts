import axios from 'axios'
import { Connection, PublicKey } from '@bbachain/web3.js'
import { Metadata, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import type { TNFTMetadata, TNFTMetadataOffChain, TNFTMetadataOffChainData } from '@/types/response.types'

export const getNFTMetadata = async (connection: Connection, mintAddress: PublicKey) => {
	const initialMetadataOffChainData: TNFTMetadataOffChainData = {
		name: null,
		symbol: null,
		description: null,
		image: null,
		seller_fee_basis_points: 0
	}

	const initialMetadataOffChain: TNFTMetadataOffChain = {
		link: null,
		data: initialMetadataOffChainData
	}

	const NFTMetadata: TNFTMetadata = {
		metadataAddress: null,
		name: null,
		symbol: null,
		collection: null,
		collectionDetails: null,
		uses: null,
		creators: null,
		sellerFeeBasisPoints: 0,
		metadataOffChain: initialMetadataOffChain
	}

	try {
		const [metadataPda] = PublicKey.findProgramAddressSync(
			[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
			PROGRAM_ID
		)

		NFTMetadata.metadataAddress = metadataPda.toBase58()
		const accountInfo = await connection.getAccountInfo(metadataPda)

		if (!accountInfo?.data) return NFTMetadata

		const [metadata] = Metadata.deserialize(accountInfo.data)
		NFTMetadata.collectionDetails = metadata.collectionDetails

		const { name, symbol, uri, creators, uses, sellerFeeBasisPoints } = metadata.data
		NFTMetadata.name = name
		NFTMetadata.symbol = symbol
		NFTMetadata.uses = uses
		NFTMetadata.creators = creators
		NFTMetadata.sellerFeeBasisPoints = sellerFeeBasisPoints

		if (uri) {
			const { data } = await axios.get<TNFTMetadataOffChainData>(uri)
			NFTMetadata.metadataOffChain.link = uri
			NFTMetadata.metadataOffChain.data = data
		}
	} catch (error) {
		console.warn('Error fetching nft metadata:', error)
	}

	return NFTMetadata
}
