import { z } from 'zod'

import VALIDATION_MESSAGE from '@/constants/validation'

const tokenPropsValidation = z.object({
	chainId: z.number(),
	address: z.string(),
	programId: z.string(),
	logoURI: z.string(),
	name: z.string(),
	symbol: z.string(),
	decimals: z.number(),
	tags: z.array(z.string()),
	extensions: z.record(z.unknown())
})

// Wrap it to allow null and add required validation
const requiredTokenPropsValidation = tokenPropsValidation.optional().refine((val) => !!val, {
	message: VALIDATION_MESSAGE.REQUIRED
})

export const createPoolValidation = z
	.object({
		baseToken: requiredTokenPropsValidation,
		quoteToken: requiredTokenPropsValidation,
		baseTokenBalance: z.number(),
		quoteTokenBalance: z.number(),
		feeTier: z.string(),
		priceSetting: z.string(),
		initialPrice: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED }),
		rangeType: z.string(),
		minInitialPrice: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED }).optional(),
		maxInitialPrice: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED }).optional(),
		baseTokenAmount: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED }),
		quoteTokenAmount: z.string().min(1, { message: VALIDATION_MESSAGE.REQUIRED })
	})
	.superRefine((data, ctx) => {
		const baseAmount = parseFloat(data.baseTokenAmount)
		const quoteAmount = parseFloat(data.quoteTokenAmount)

		if (!isNaN(baseAmount) && baseAmount > data.baseTokenBalance) {
			ctx.addIssue({
				path: ['baseTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: 'Base token balance is not enough'
			})
		}

		if (!isNaN(quoteAmount) && quoteAmount > data.quoteTokenBalance) {
			ctx.addIssue({
				path: ['quoteTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: 'Quote token balance is not enough'
			})
		}
	})
