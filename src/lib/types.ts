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
	custom_decimals: number
	token_supply: number
	token_icon: File
	description: string | null
	revoke_freeze: boolean
	revoke_mint: boolean
	immutable_metadata: boolean
}

export type MetadataURI = {
	name: string
	symbol: string
	description: string | null
	image: string
	decimals: number
	supply: number
	revoke_freeze: boolean
	revoke_mint: boolean
	immutable_metadata: boolean
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

export type GetTokenMetadataResponse = {
	mintAddress: string
	name: string | null
	symbol: string | null
	metadataURI: MetadataURI | null
	metadataLink: string | null
}

export type GetTokenResponse = GetTokenMetadataResponse & {
	date: number
}
