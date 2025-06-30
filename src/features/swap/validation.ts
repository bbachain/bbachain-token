import { z } from 'zod'

import VALIDATION_MESSAGE from '@/constants/validation'

export const EnableExpertModeConfirmationValidation = z.object({
	confirm: z
		.string()
		.min(1, { message: VALIDATION_MESSAGE.REQUIRED })
		.refine((val) => val === 'Confirm', {
			message: 'You must type "Confirm" exactly to proceed.'
		})
})


