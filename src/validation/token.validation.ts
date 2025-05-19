import { z } from 'zod'
import Decimal from 'decimal.js'
import VALIDATION_MESSAGE from '../constants/validation'
import REGEX from '../constants/regex'

const MAX_SUPPLY_RAW = new Decimal('18446744073709551615')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

export const CreateBasicTokenValidation = z
	.object({
		name: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED }),
		symbol: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED }),
		description: z.string(),
		decimals: z
			.string()
			.min(1, { message: VALIDATION_MESSAGE.REQUIRED })
			.regex(REGEX.POSITIVE_NUMBER, { message: VALIDATION_MESSAGE.INVALID.FORMAT_NUMBER })
			.regex(REGEX.ZERO_TO_TWELVE_RANGE, { message: VALIDATION_MESSAGE.INVALID.DECIMALS_RANGE }),
		supply: z
			.string()
			.min(1, { message: VALIDATION_MESSAGE.REQUIRED })
			.regex(REGEX.POSITIVE_NUMBER, { message: VALIDATION_MESSAGE.INVALID.FORMAT_NUMBER })
	})
	.superRefine((data, ctx) => {
		try {
			const supply = new Decimal(data.supply)
			const decimals = new Decimal(data.decimals)

			const rawSupply = supply.mul(new Decimal(10).pow(decimals))

			if (rawSupply.gt(MAX_SUPPLY_RAW)) {
				const maxDisplaySupply = MAX_SUPPLY_RAW.div(new Decimal(10).pow(decimals))
				const truncatedSupply = Math.floor(maxDisplaySupply.toNumber()).toString()
				ctx.addIssue({
					path: ['supply'],
					code: z.ZodIssueCode.custom,
					message: `Token supply is too large for the selected decimals. Max allowed is ${truncatedSupply}`
				})
			}
		} catch {
			ctx.addIssue({
				path: ['supply'],
				code: z.ZodIssueCode.custom,
				message: 'Invalid token supply or decimals value.'
			})
		}
	})

export const CreateIconTokenValidation = z.object({
	icon: z
		.custom<File>((file) => file instanceof File, {
			message: VALIDATION_MESSAGE.REQUIRED
		})
		.refine((file): file is File => file instanceof File && file.size <= MAX_FILE_SIZE, {
			message: VALIDATION_MESSAGE.INVALID.IMAGE_SIZE
		})
		.refine((file): file is File => file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type), {
			message: VALIDATION_MESSAGE.INVALID.FILE_TYPE
		})
})

export const CreateFeatureTokenValidation = z.object({
	revoke_freeze: z.boolean({ required_error: VALIDATION_MESSAGE.REQUIRED }),
	revoke_mint: z.boolean({ required_error: VALIDATION_MESSAGE.REQUIRED }),
	immutable_metadata: z.boolean({ required_error: VALIDATION_MESSAGE.REQUIRED })
})

export const CreateTokenValidation = z.intersection(
	CreateBasicTokenValidation,
	CreateIconTokenValidation.merge(CreateFeatureTokenValidation)
)
