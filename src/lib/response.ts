export type CreateTokenResponse = {
	mintAddress: string
	accountAddress: string
	metadataAddress: string
	metadata: {
		name: string
		symbol: string
		uri: string
		iconUri: string
		description: string | null
		decimals: number
	}
	signature: string
}
