import { Collection, Creator, Uses } from '@bbachain/spl-token-metadata'
import { z } from 'zod'

import { type CreateTokenValidation } from '@/features/tokens/validation'
import { type TSuccessMessage } from '@/types'

export type TTradeableTokenProps = {
	chainId?: number
	address: string
	programId?: string
	logoURI?: string
	symbol: string
	name: string
	decimals: number
	tags?: string[]
	extensions?: Record<string, unknown>
}

export type TExtendedTradeableTokenProps = TTradeableTokenProps & {
	coinGeckoId?: string
	isNative: boolean
}

export type UploadToMetadataPayload = {
	name: string
	symbol: string
	image: string
	description: string | null
}

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
	sellerFeeBasisPoints: number
	creators: Creator[] | null
	collection: Collection | null
	uses: Uses | null
	metadataOffChain: TTokenMetadataOffChain
}

type TAuthoritiesState = {
	revokeFreeze: boolean
	revokeMint: boolean
}

export type TGetTokenDataResponse = {
	mintAddress: string
	decimals: number
	supply: number
	authoritiesState: TAuthoritiesState
	metadata: TTokenMetadata
	createdAt: number
}

export type TCreateTokenDataResponse = {
	ownerAddress: string
	mintAddress: string
	metadataAddress: string
	metadata: UploadToMetadataPayload
}

export type TGetTokenPriceByCoinGeckoIdData = {
	[key: string]: {
		usd: number
	}
}

export type TGetAllTokenPrices = {
	[key: string]: number
}

export type TGetTradeableTokenResponse = TSuccessMessage & {
	data: TExtendedTradeableTokenProps[]
}

export type TGetTokenResponse = TSuccessMessage & {
	data: TGetTokenDataResponse[]
}

export type TGetTokenDetailResponse = TSuccessMessage & {
	data: TGetTokenDataResponse
}

export type TCreateTokenResponse = TSuccessMessage & {
	data: TCreateTokenDataResponse
}

export type TUpdateTokenMetadataResponse = TCreateTokenResponse

export type TCreateTokenPayload = z.infer<typeof CreateTokenValidation>

export type TUpdateTokenMetadataPayload = {
	name: string
	symbol: string
	icon: File | null
	description: string
}

export type TBurnTokenPayload = {
	amount: number
	decimals: number
}

export type TMintTokenPayload = TBurnTokenPayload
