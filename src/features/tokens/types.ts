import { z } from 'zod'
import { type CreateTokenValidation } from '@/features/tokens/validation'

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

type TCreatedMetadataToken = {
	metadataAddress: string
	name: string
	symbol: string
	image: string
}

export type TGetTokenResponse = {
	mintAddress: string
	decimals: number
	supply: number
	authoritiesState: TAuthoritiesState
	metadata: TTokenMetadata
	createdAt: number
}

export type TCreateTokenResponse = {
	ownerAddress: string
	mintAddress: string
	metadata: TCreatedMetadataToken
}

export type CreateTokenPayload = z.infer<typeof CreateTokenValidation>

export type UploadToMetadataPayload = {
	name: string
	symbol: string
	icon: string
	description: string | null
}
