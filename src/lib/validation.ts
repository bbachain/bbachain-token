import { z } from 'zod'
import Decimal from 'decimal.js'
import { Collection, Uses } from '@bbachain/spl-token-metadata'

const REQUIRED_MESSAGE = 'This field is required'
const INVALID_SIZE_IMAGE_MESSAGE = 'Image size must be less than 5MB'
const INVALID_TYPE_FILE_MESSAGE = 'Only .jpg, .jpeg, and .png files are accepted'
const INVALID_NUMBER_FORMAT = 'Only non-negative whole numbers are allowed (no commas or decimals).'
const INVALID_DECIMALS_RANGE = 'Decimals must be a number between 0 and 12'
const INVALID_METADATA_URI = 'Invalid metadata url'

const MAX_SUPPLY_RAW = new Decimal('18446744073709551615')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg']
const POSITIVE_NUMBER_REGEX = /^\d+$/
const ZERO_TO_TWELVE_RANGE_REGEX = /^(0|[1-9]|1[0-2])$/

export const CreateMessageContactValidation = z.object({
	name: z.string().min(1, { message: REQUIRED_MESSAGE }),
	email: z.string().email({ message: 'Invalid email format' }).min(1, { message: REQUIRED_MESSAGE }),
	subject: z.string().min(1, { message: REQUIRED_MESSAGE }),
	category: z.string().min(1, { message: REQUIRED_MESSAGE }),
	message: z.string().min(1, { message: REQUIRED_MESSAGE })
})

export const BurnTokenValidation = z.object({
	amount: z
		.string()
		.min(1, { message: REQUIRED_MESSAGE })
		.regex(/^\d+([.,]\d+)?$/, { message: 'Invalid number' })
})

export const CreateBasicTokenValidation = z
	.object({
		token_name: z.string().min(1, { message: REQUIRED_MESSAGE }),
		token_symbol: z.string().min(1, { message: REQUIRED_MESSAGE }),
		description: z.string(),
		custom_decimals: z
			.string()
			.min(1, { message: REQUIRED_MESSAGE })
			.regex(POSITIVE_NUMBER_REGEX, { message: INVALID_NUMBER_FORMAT })
			.regex(ZERO_TO_TWELVE_RANGE_REGEX, { message: INVALID_DECIMALS_RANGE }),
		token_supply: z
			.string()
			.min(1, { message: REQUIRED_MESSAGE })
			.regex(POSITIVE_NUMBER_REGEX, { message: INVALID_NUMBER_FORMAT })
	})
	.superRefine((data, ctx) => {
		try {
			const supply = new Decimal(data.token_supply)
			const decimals = new Decimal(data.custom_decimals)

			const rawSupply = supply.mul(new Decimal(10).pow(decimals))

			if (rawSupply.gt(MAX_SUPPLY_RAW)) {
				const maxDisplaySupply = MAX_SUPPLY_RAW.div(new Decimal(10).pow(decimals))
				const truncatedSupply = Math.floor(maxDisplaySupply.toNumber()).toString()
				ctx.addIssue({
					path: ['token_supply'],
					code: z.ZodIssueCode.custom,
					message: `Token supply is too large for the selected decimals. Max allowed is ${truncatedSupply}`
				})
			}
		} catch {
			ctx.addIssue({
				path: ['token_supply'],
				code: z.ZodIssueCode.custom,
				message: 'Invalid token supply or decimals value.'
			})
		}
	})

export const CreateIconTokenValidation = z.object({
	token_icon: z
		.custom<File>((file) => file instanceof File, {
			message: REQUIRED_MESSAGE
		})
		.refine((file): file is File => file instanceof File && file.size <= MAX_FILE_SIZE, {
			message: INVALID_SIZE_IMAGE_MESSAGE
		})
		.refine((file): file is File => file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type), {
			message: INVALID_TYPE_FILE_MESSAGE
		})
})

export const CreateFeatureTokenValidation = z.object({
	revoke_freeze: z.boolean({ required_error: REQUIRED_MESSAGE }),
	revoke_mint: z.boolean({ required_error: REQUIRED_MESSAGE }),
	immutable_metadata: z.boolean({ required_error: REQUIRED_MESSAGE })
})

export const CreateBBATokenValidation = z.intersection(
	CreateBasicTokenValidation,
	CreateIconTokenValidation.merge(CreateFeatureTokenValidation)
)

const NFTAttributeSchema = z.object({
	trait_type: z.string(),
	value: z.union([z.string(), z.number()])
})

const NFTCreatorSchema = z.object({
	address: z.string(),
	share: z.number()
})

const NFTFileSchema = z.object({
	uri: z.string().url(),
	type: z.string()
})

// Properties schema
const NFTPropertiesSchema = z.object({
	files: z.array(NFTFileSchema).optional(),
	category: z.string().optional(),
	creators: z.array(NFTCreatorSchema).optional()
})

// Collection schema
const NFTCollectionSchema = z.object({
	name: z.string(),
	family: z.string()
})

export const NFTMetadataSchema = z.object({
	name: z.string(),
	symbol: z.string(),
	description: z.string(),
	image: z.string().url(),
	seller_fee_basis_points: z.number(),
	external_url: z.string().url().optional(),
	attributes: z.array(NFTAttributeSchema).optional(),
	collection: NFTCollectionSchema.optional(),
	properties: NFTPropertiesSchema.optional()
})

export const UploadNFTMetadataSchema = z.object({
	name: z.string().min(1, { message: REQUIRED_MESSAGE }),
	metadata_uri: z.string().min(1, { message: REQUIRED_MESSAGE }).url({ message: INVALID_METADATA_URI })
})

export const UploadCollectionSchema = z.object({
	name: z.string().min(1, { message: REQUIRED_MESSAGE }),
	metadata_uri: z.string().min(1, { message: REQUIRED_MESSAGE }).url({ message: INVALID_METADATA_URI }),
	symbol: z.string().min(1, { message: REQUIRED_MESSAGE }),
	royalities: z
		.string()
		.min(1, { message: REQUIRED_MESSAGE })
		.regex(POSITIVE_NUMBER_REGEX, { message: INVALID_NUMBER_FORMAT })
})

export type CreateBBATokenPayload = z.infer<typeof CreateBBATokenValidation>
export type NFTMetadataPayload = z.infer<typeof NFTMetadataSchema>
export type UploadNFTMetadataPayload = z.infer<typeof UploadNFTMetadataSchema>
export type MintNFTPayload = {
	name: string
	symbol: string
	uri: string
	collection: Collection | null
	uses: Uses | null
}

export type UploadCollectionPayload = z.infer<typeof UploadCollectionSchema>
export type BurnTokenPayload = z.infer<typeof BurnTokenValidation> & {
	decimals: number
}
export type CreateMessagePayload = z.infer<typeof CreateMessageContactValidation>
