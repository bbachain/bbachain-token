import { z } from 'zod'

const REQUIRED_MESSAGE = 'This field is required'
const INVALID_SIZE_IMAGE_MESSAGE = 'Image size must be less than 5MB'
const INVALID_TYPE_FILE_MESSAGE = 'Only .jpg, .jpeg, and .png files are accepted'
const INVALID_NUMBER_FORMAT = 'This field should be non-negative number'
const INVALID_DECIMALS_RANGE = 'Decimals must be a number between 0 and 12'

const MAX_SUPPLY_RAW = BigInt('18446744073709551615')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg']
const POSITIVE_NUMBER_REGEX = /^\d+$/
const ZERO_TO_TWELVE_RANGE_REGEX = /^(0|[1-9]|1[0-2])$/

export const CreateBBATokenValidation = z
	.object({
		token_name: z.string().min(1, { message: REQUIRED_MESSAGE }),
		token_symbol: z.string().min(1, { message: REQUIRED_MESSAGE }),
		custom_decimals: z
			.string()
			.min(1, { message: REQUIRED_MESSAGE })
			.regex(POSITIVE_NUMBER_REGEX, { message: INVALID_NUMBER_FORMAT })
			.regex(ZERO_TO_TWELVE_RANGE_REGEX, { message: INVALID_DECIMALS_RANGE }),
		token_supply: z
			.string()
			.min(1, { message: REQUIRED_MESSAGE })
			.regex(POSITIVE_NUMBER_REGEX, { message: INVALID_NUMBER_FORMAT }),
		token_icon: z
			.custom<File>((file) => file instanceof File, {
				message: REQUIRED_MESSAGE
			})
			.refine((file) => file.size <= MAX_FILE_SIZE, INVALID_SIZE_IMAGE_MESSAGE)
			.refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), INVALID_TYPE_FILE_MESSAGE),
		description: z.string(),
		revoke_freeze: z.boolean({ required_error: REQUIRED_MESSAGE }),
		revoke_mint: z.boolean({ required_error: REQUIRED_MESSAGE }),
		immutable_metadata: z.boolean({ required_error: REQUIRED_MESSAGE })
	})
	.superRefine((data, ctx) => {
		const supply = parseFloat(data.token_supply)
		const decimals = parseInt(data.custom_decimals)

		if (isNaN(supply) || isNaN(decimals)) return

		try {
			const rawSupply = BigInt(Math.floor(supply * 10 ** decimals))
			const maxSupply = MAX_SUPPLY_RAW / BigInt(10 ** decimals)

			if (rawSupply > maxSupply) {
				ctx.addIssue({
					path: ['token_supply'],
					code: z.ZodIssueCode.custom,
					message: `Token supply is too large for the selected decimals. Max allowed is ${maxSupply.toString()}`
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

export type CreateBBATokenPayload = z.infer<typeof CreateBBATokenValidation>
