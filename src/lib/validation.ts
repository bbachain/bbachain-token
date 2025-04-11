import { z } from 'zod'

const REQUIRED_MESSAGE = 'This field is required'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg']
const numberWithDecimalsRegex = /^-?\d+(\.\d+)?$/

export const CreateBBATokenValidation = z.object({
	token_name: z.string().min(1, { message: REQUIRED_MESSAGE }),
	token_symbol: z.string().min(1, { message: REQUIRED_MESSAGE }),
	custom_decimals: z.string().min(1, { message: REQUIRED_MESSAGE }).regex(numberWithDecimalsRegex, {
		message: 'Invalid number format.'
	}),
	token_supply: z.string().min(1, { message: REQUIRED_MESSAGE }).regex(numberWithDecimalsRegex, {
		message: 'Invalid number format.'
	}),
	token_icon: z
		.custom<File>((file) => file instanceof File, {
			message: 'Token icon is required and must be a valid image file'
		})
		.refine((file) => file.size <= MAX_FILE_SIZE, 'Image size must be less than 5MB')
		.refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only .jpg, .jpeg, and .png files are accepted'),
	description: z.string(),
	revoke_freeze: z.boolean({ required_error: REQUIRED_MESSAGE }),
	revoke_mint: z.boolean({ required_error: REQUIRED_MESSAGE }),
	immutable_metadata: z.boolean({ required_error: REQUIRED_MESSAGE })
})

export type CreateBBATokenPayload = z.infer<typeof CreateBBATokenValidation>
