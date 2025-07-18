import { getMint } from '@bbachain/spl-token'
import { Metadata, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import { Connection, PublicKey } from '@bbachain/web3.js'
import axios from 'axios'

import { isLikelyLPToken } from '@/staticData/tokens'

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

	// Check if this is a Liquidity Pool (LP) token and filter it out
	const mintAuthorityAddress = mintAccountInfo.mintAuthority?.toBase58() || null
	if (isLikelyLPToken(decimals, mintAuthorityAddress)) {
		console.log(
			`🔍 Filtering out LP token: ${mintAddress.toBase58()}, decimals: ${decimals}, authority: ${mintAuthorityAddress}`
		)
		// Skip LP tokens from regular token list
		return null
	}

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

/**
 * Get LP token data for tokens that are filtered from regular token list
 */
export const getLPTokenData = async (
	connection: Connection,
	mintAddress: PublicKey
): Promise<TGetTokenDataResponse | null> => {
	try {
		const mintAccountInfo = await getMint(connection, mintAddress)
		const decimals = mintAccountInfo.decimals
		const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

		// Only process if this is likely an LP token
		const mintAuthorityAddress = mintAccountInfo.mintAuthority?.toBase58() || null
		if (!isLikelyLPToken(decimals, mintAuthorityAddress)) {
			return null
		}

		const signatures = await connection.getSignaturesForAddress(mintAddress)
		const revokeMint = mintAccountInfo.mintAuthority === null
		const revokeFreeze = mintAccountInfo.freezeAuthority === null
		const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0

		const authoritiesState = { revokeFreeze, revokeMint }

		// For LP tokens, create minimal metadata since they usually don't have full metadata
		const metadata: TTokenMetadata = {
			metadataAddress: null,
			isMutable: false,
			name: `LP Token ${mintAddress.toBase58().slice(0, 8)}...`,
			symbol: `LP-${mintAddress.toBase58().slice(0, 4)}`,
			sellerFeeBasisPoints: 0,
			creators: null,
			collection: null,
			uses: null,
			metadataOffChain: {
				link: null,
				data: {
					name: `LP Token`,
					symbol: `LP`,
					description: `Liquidity Pool Token`,
					image: '/icon-placeholder.svg'
				}
			}
		}

		return {
			mintAddress: mintAddress.toBase58(),
			decimals,
			supply,
			authoritiesState,
			metadata,
			createdAt: blockTime
		}
	} catch (error) {
		console.error('Error fetching LP token data:', error)
		return null
	}
}
