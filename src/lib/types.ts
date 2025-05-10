import { Collection, Creator, Uses } from '@bbachain/spl-token-metadata'
import { NFTMetadataPayload } from './validation'

export type FAQItem = {
	question: string
	answer: string
}

export type InfoItem = {
	title: string
	description?: string | JSX.Element
	lists?: string[]
	items?: InfoItem[]
}

export type UploadToMetadataPayload = {
	token_name: string
	token_symbol: string
	token_icon: string
	description: string | null
}

export type UpdateMetadataPayload = {
	token_name: string
	token_symbol: string
	token_icon: File | null
	description: string
}

export type MetadataURI = {
	name: string
	symbol: string
	description: string | null
	image: string
}

type CreateTokenMetadataResponse = {
	name: string
	symbol: string
	uri: string
	iconUri: string
}

export type CreateTokenResponse = {
	mintAddress: string
	accountAddress: string
	metadataAddress: string
	metadata: CreateTokenMetadataResponse
	signature: string
}

export type GetTokenAuthoritiesState = {
	revoke_freeze: boolean
	revoke_mint: boolean
	immutable_metadata: boolean
}

export type GetTokenMetadataResponse = {
	metadataAddress: string
	name: string | null
	symbol: string | null
	metadataURI: MetadataURI | null
	metadataLink: string | null
}

export type GetTokenResponse = GetTokenMetadataResponse & {
	mintAddress: string
	decimals: number
	supply: number
	authoritiesState: GetTokenAuthoritiesState
	date: number
}

export type NFTMetadataContent = NFTMetadataPayload

export type GetNFTMetadataResponse = {
	metadataAddress: string
	name: string | null
	symbol: string | null
	collection: Collection | null
	uses: Uses | null
	creators: Creator[] | null
	sellerFeeBasisPoints: number
	metadataURI: NFTMetadataContent | null
	metadataLink: string | null
}

export type GetNFTResponse = GetNFTMetadataResponse & {
	mintAddress: string
	decimals: number
	supply: number
	date: number
}
