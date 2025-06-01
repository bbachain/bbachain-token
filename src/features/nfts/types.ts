import type { Collection, CollectionDetails, Creator, Uses } from '@bbachain/spl-token-metadata'
import { z } from 'zod'

import { TSuccessMessage } from '@/types'

import { CreateCollectionValidation, CreateNFTValidation, NFTMetadataValidation } from './validation'

type TNFTMetadataAttribute = {
	traitType: string | null
	value: string | number | null
}

type TNFTMetadataCollection = {
	name: string | null
	family: string | null
}

type TNFTMetadataPropertiesCreator = {
	address: string | null
	share: number | null
}

type TNFTMetadataPropertiesFile = {
	uri: string | null
	type: string | null
}

type TNFTMetadataProperties = {
	files: TNFTMetadataPropertiesFile[]
	category: string | null
	creators: TNFTMetadataPropertiesCreator[]
}

export type TNFTMetadataOffChainData = {
	name: string | null
	symbol: string | null
	description: string | null
	image: string | null
	sellerFeeBasisPoints: number
	externalUrl: string | null
	attributes: TNFTMetadataAttribute[]
	collection: TNFTMetadataCollection
	properties: TNFTMetadataProperties
}

export type TNFTMetadataOffChain = {
	link: string | null
	data: TNFTMetadataOffChainData
}

export type TNFTCollectionProperties = {
	metadataAddress: string | null
	name: string | null
	symbol: string | null
}

export type TNFTMetadata = {
	metadataAddress: string | null
	name: string | null
	symbol: string | null
	sellerFeeBasisPoints: number
	creators: Creator[] | null
	collection: Collection | null
	collectionDetails: CollectionDetails | null
	collectionProperties: TNFTCollectionProperties | null
	uses: Uses | null
	metadataOffChain: TNFTMetadataOffChain
}

export type TGetNFTDataResponse = {
	mintAddress: string
	decimals: number
	supply: number
	metadata: TNFTMetadata
	createdAt: number
}

export type TGetNFTByCollectionDataResponse = {
	collectionName: string
	data: TGetNFTDataResponse[]
}

export type TCreateNFTDataResponse = {
	ownerAddress: string
	mintAddress: string
	metadataAddress: string
	metadata: TNFTMetadataOffChainData
}

export type TGetNFTResponse = TSuccessMessage & {
	data: TGetNFTDataResponse[]
}

export type TGetNFTByCollectionResponse = TSuccessMessage & {
	data: TGetNFTByCollectionDataResponse[]
}

export type TGetNFTDetailResponse = TSuccessMessage & {
	data: TGetNFTDataResponse
}

export type TCreateNFTResponse = TSuccessMessage & {
	data: TCreateNFTDataResponse
}

export type TValidateMetadataSuccessResponse = TSuccessMessage & {
	data: z.infer<typeof NFTMetadataValidation>
}

export type TValidateMetadataErrorResponse = {
	errorMessage: string
	errorDetail: string
}

export type TCreateNFTPayload = z.infer<typeof CreateNFTValidation>
export type TCreateCollectionPayload = z.infer<typeof CreateCollectionValidation>
export type TValidateMetadataOffChainPayload = { uri: string }

export type TCreateNFTDialogProps = {
	title: string
	description: string
}
