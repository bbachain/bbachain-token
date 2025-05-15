import type { Collection, CollectionDetails, Creator, Uses } from '@bbachain/spl-token-metadata'

// Global

export type SuccessResponse<T> = {
	message: string
	data: T
}

export type TGetTokenAccount = {
	pubKey: string
	mintAddress: string
	ownerAddress: string
	supply: number
	decimals: number
}

// Fungible Tokens

export type TTokenMetadataOffChainData = {
	name: string | null
	symbol: string | null
	description: string | null
	image: string | null
}

export type TTokenMetadataOffChain = {
	link: string | null
	data: TTokenMetadataOffChainData
}

export type TTokenMetadata = {
	metadataAddress: string | null
	isMutable: boolean
	name: string | null
	symbol: string | null
	metadataOffChain: TTokenMetadataOffChain
}

type TAuthoritiesState = {
	revokeFreeze: boolean
	revokeMint: boolean
}

export type TGetToken = {
	mintAddress: string
	decimals: number
	supply: number
	authoritiesState: TAuthoritiesState
	metadata: TTokenMetadata
	createdAt: number
}

type TCreatedMetadataToken = {
	metadataAddress: string
	name: string
	symbol: string
	image: string
}

export type TCreateToken = {
	ownerAddress: string
	mintAddress: string
	metadata: TCreatedMetadataToken
}

// Non Fungible Tokens (NFT)

type TNFTAttributesMetadata = {
	trait_type: string | null
	value: string | number | null
}

type TNFTCollectionMetadata = {
	name: string | null
	family: string | null
}

type TNFTPropertiesFiles = {
	uri: string | null
	type: string | null
}

type TNFTPropertiesCreators = {
	address: string | null
	share: number | null
}

type TNFTPropertiesMetadata = {
	files: TNFTPropertiesFiles[]
	category: string | null
	creators: TNFTPropertiesCreators[]
}

export type TNFTMetadataOffChainData = {
	name: string | null
	symbol: string | null
	description: string | null
	image: string | null
	seller_fee_basis_points: number
	external_url?: string | null
	attributes?: TNFTAttributesMetadata[]
	collection?: TNFTCollectionMetadata
	properties?: TNFTPropertiesMetadata
}

export type TNFTMetadataOffChain = {
	link: string | null
	data: TNFTMetadataOffChainData
}

export type TNFTMetadata = {
	metadataAddress: string | null
	name: string | null
	symbol: string | null
	collection: Collection | null
	collectionDetails: CollectionDetails | null // if collection details exists means it's a collection.
	uses: Uses | null
	creators: Creator[] | null
	sellerFeeBasisPoints: number
	metadataOffChain: TNFTMetadataOffChain
}
