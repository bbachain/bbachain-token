import { getMint } from '@bbachain/spl-token'
import { Metadata, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import { Connection, PublicKey } from '@bbachain/web3.js'
import axios from 'axios'

import { TGetTokenDataResponse, TTokenMetadata, TTokenMetadataOffChain, TTokenMetadataOffChainData } from './types'

export const getTokenMetadata = async (connection: Connection, metadataAddress: PublicKey) => {
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
		sellerFeeBasisPoints: 0,
		creators: null,
		collection: null,
		uses: null,
		metadataOffChain: initialMetadataOffChain
	}

	try {
		const accountInfo = await connection.getAccountInfo(metadataAddress)
		if (!accountInfo || !accountInfo?.data) return tokenMetadata

		tokenMetadata.metadataAddress = metadataAddress.toBase58()
		const [metadata] = Metadata.deserialize(accountInfo.data)
		tokenMetadata.isMutable = metadata.isMutable

		const { name, symbol, uri, collection, creators, uses, sellerFeeBasisPoints } = metadata.data
		tokenMetadata.name = name
		tokenMetadata.symbol = symbol
		tokenMetadata.collection = collection
		tokenMetadata.creators = creators
		tokenMetadata.uses = uses
		tokenMetadata.sellerFeeBasisPoints = sellerFeeBasisPoints

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

export const getTokenData = async (
	connection: Connection,
	mintAddress: PublicKey
): Promise<TGetTokenDataResponse | null> => {
	const mintAccountInfo = await getMint(connection, mintAddress)
	const decimals = mintAccountInfo.decimals
	const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

	if (decimals === 0 && supply === 1) {
		// This is not a Fungible Token (it's an NFT) - skip it
		return null
	} // this is hack to return only Fungible Tokens, cause this condition is NFT state

	const signatures = await connection.getSignaturesForAddress(mintAddress)

	const revokeMint = mintAccountInfo.mintAuthority === null
	const revokeFreeze = mintAccountInfo.freezeAuthority === null
	const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0

	const authoritiesState = { revokeFreeze, revokeMint }

	const [metadataPda] = PublicKey.findProgramAddressSync(
		[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
		PROGRAM_ID
	)

	const metadata = await getTokenMetadata(connection, metadataPda)

	return {
		mintAddress: mintAddress.toBase58(),
		decimals,
		supply,
		authoritiesState,
		metadata,
		createdAt: blockTime
	}
}
