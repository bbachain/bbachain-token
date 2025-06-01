import { Collection } from '@bbachain/spl-token-metadata'
import { z } from 'zod'

import VALIDATION_MESSAGE from '@/constants/validation'

const NFTMetadataAttributeSchema = z.object({
	trait_type: z.string(),
	value: z.union([z.string(), z.number()])
})

const NFTMetadataCreatorSchema = z.object({
	address: z.string(),
	share: z.number()
})

const NFTMetadataFileSchema = z.object({
	uri: z.string().url(),
	type: z.string()
})

// Properties schema
const NFTMetadataPropertiesSchema = z.object({
	files: z.array(NFTMetadataFileSchema).optional(),
	category: z.string().optional(),
	creators: z.array(NFTMetadataCreatorSchema).optional()
})

// Collection schema
const NFTMetadataCollectionSchema = z.object({
	name: z.string(),
	family: z.string()
})

export const NFTMetadataValidation = z.object({
	name: z.string(),
	symbol: z.string(),
	description: z.string(),
	image: z.string().url(),
	seller_fee_basis_points: z.number(),
	external_url: z.string().url().optional(),
	attributes: z.array(NFTMetadataAttributeSchema).optional(),
	collection: NFTMetadataCollectionSchema.optional(),
	properties: NFTMetadataPropertiesSchema.optional()
})

export const CreateNFTValidation = z.object({
	uri: z
		.string()
		.min(1, { message: VALIDATION_MESSAGE.REQUIRED })
		.url({ message: VALIDATION_MESSAGE.INVALID.METADATA_URI }),
	collection: z.custom<Collection>().nullable().default(null)
})

export const CreateCollectionURIValidation = z.object({
	uri: z
		.string()
		.min(1, { message: VALIDATION_MESSAGE.REQUIRED })
		.url({ message: VALIDATION_MESSAGE.INVALID.METADATA_URI })
})

export const CreateCollectionOnChainDataValidation = z.object({
	name: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED }),
	symbol: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED }),
	sellerFeeBasisPoints: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED })
})

export const CreateCollectionValidation = z.intersection(
	CreateCollectionURIValidation,
	CreateCollectionOnChainDataValidation
)
