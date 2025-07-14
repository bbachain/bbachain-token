import { z } from 'zod'

import VALIDATION_MESSAGE from '@/constants/validation'

import type { TCreatePoolPayload } from './types'

const tokenPropsValidation = z.object({
	chainId: z.number().optional(),
	address: z.string().min(1, 'Token address is required'),
	programId: z.string().optional(),
	logoURI: z.string().optional(),
	name: z.string().min(1, 'Token name is required'),
	symbol: z.string().min(1, 'Token symbol is required'),
	decimals: z.number().min(0).max(18),
	tags: z.array(z.string()).optional(),
	extensions: z.record(z.unknown()).optional()
})

// Enhanced token validation with better error messages
const requiredTokenPropsValidation = tokenPropsValidation.optional().refine((val) => !!val, {
	message: 'Please select a token'
})

export const createPoolValidation = z
	.object({
		baseToken: requiredTokenPropsValidation,
		quoteToken: requiredTokenPropsValidation,
		baseTokenBalance: z.number().min(0, 'Invalid balance'),
		quoteTokenBalance: z.number().min(0, 'Invalid balance'),
		feeTier: z.string().min(1, 'Please select a fee tier'),
		priceSetting: z.string().default('auto'),
		initialPrice: z
			.string()
			.min(1, 'Initial price is required')
			.refine((val) => {
				const num = parseFloat(val)
				return !isNaN(num) && num > 0
			}, 'Initial price must be a positive number'),
		rangeType: z.enum(['full-range', 'custom-range']).default('full-range'),
		minInitialPrice: z.string().optional(),
		maxInitialPrice: z.string().optional(),
		baseTokenAmount: z
			.string()
			.min(1, 'Base token amount is required')
			.refine((val) => {
				const num = parseFloat(val)
				return !isNaN(num) && num > 0
			}, 'Base token amount must be a positive number'),
		quoteTokenAmount: z
			.string()
			.min(1, 'Quote token amount is required')
			.refine((val) => {
				const num = parseFloat(val)
				return !isNaN(num) && num > 0
			}, 'Quote token amount must be a positive number')
	})
	.superRefine((data, ctx) => {
		// Validate that base and quote tokens are different
		if (data.baseToken && data.quoteToken && data.baseToken.address === data.quoteToken.address) {
			ctx.addIssue({
				path: ['quoteToken'],
				code: z.ZodIssueCode.custom,
				message: 'Base and quote tokens must be different'
			})
		}

		// Validate fee tier is within acceptable range
		const feeTier = parseFloat(data.feeTier)
		if (!isNaN(feeTier) && (feeTier < 0.01 || feeTier > 10)) {
			ctx.addIssue({
				path: ['feeTier'],
				code: z.ZodIssueCode.custom,
				message: 'Fee tier must be between 0.01% and 10%'
			})
		}

		// Validate custom range prices if custom range is selected
		if (data.rangeType === 'custom-range') {
			if (!data.minInitialPrice || data.minInitialPrice.trim() === '') {
				ctx.addIssue({
					path: ['minInitialPrice'],
					code: z.ZodIssueCode.custom,
					message: 'Minimum price is required for custom range'
				})
			}

			if (!data.maxInitialPrice || data.maxInitialPrice.trim() === '') {
				ctx.addIssue({
					path: ['maxInitialPrice'],
					code: z.ZodIssueCode.custom,
					message: 'Maximum price is required for custom range'
				})
			}

			// Validate min < max if both are provided
			if (data.minInitialPrice && data.maxInitialPrice) {
				const minPrice = parseFloat(data.minInitialPrice)
				const maxPrice = parseFloat(data.maxInitialPrice)

				if (!isNaN(minPrice) && !isNaN(maxPrice)) {
					if (minPrice >= maxPrice) {
						ctx.addIssue({
							path: ['maxInitialPrice'],
							code: z.ZodIssueCode.custom,
							message: 'Maximum price must be greater than minimum price'
						})
					}

					// Validate that initial price is within range
					const initialPrice = parseFloat(data.initialPrice)
					if (!isNaN(initialPrice)) {
						if (initialPrice < minPrice || initialPrice > maxPrice) {
							ctx.addIssue({
								path: ['initialPrice'],
								code: z.ZodIssueCode.custom,
								message: 'Initial price must be within the specified range'
							})
						}
					}
				}
			}
		}

		// Validate token amounts against balances
		const baseAmount = parseFloat(data.baseTokenAmount)
		const quoteAmount = parseFloat(data.quoteTokenAmount)

		if (!isNaN(baseAmount) && baseAmount > data.baseTokenBalance) {
			ctx.addIssue({
				path: ['baseTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: `Insufficient ${data.baseToken?.symbol || 'base token'} balance. Available: ${data.baseTokenBalance.toFixed(6)}`
			})
		}

		if (!isNaN(quoteAmount) && quoteAmount > data.quoteTokenBalance) {
			ctx.addIssue({
				path: ['quoteTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: `Insufficient ${data.quoteToken?.symbol || 'quote token'} balance. Available: ${data.quoteTokenBalance.toFixed(6)}`
			})
		}

		// Validate minimum deposit amounts (prevent dust amounts)
		const MIN_DEPOSIT_VALUE = 0.000001 // Minimum token amount

		if (!isNaN(baseAmount) && baseAmount < MIN_DEPOSIT_VALUE) {
			ctx.addIssue({
				path: ['baseTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: `Minimum deposit amount is ${MIN_DEPOSIT_VALUE} ${data.baseToken?.symbol || 'tokens'}`
			})
		}

		if (!isNaN(quoteAmount) && quoteAmount < MIN_DEPOSIT_VALUE) {
			ctx.addIssue({
				path: ['quoteTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: `Minimum deposit amount is ${MIN_DEPOSIT_VALUE} ${data.quoteToken?.symbol || 'tokens'}`
			})
		}

		// Validate price reasonableness (prevent extremely high/low prices)
		const initialPrice = parseFloat(data.initialPrice)
		if (!isNaN(initialPrice)) {
			const MAX_PRICE = 1e15 // Very high price limit
			const MIN_PRICE = 1e-15 // Very low price limit

			if (initialPrice > MAX_PRICE) {
				ctx.addIssue({
					path: ['initialPrice'],
					code: z.ZodIssueCode.custom,
					message: 'Initial price is too high. Please enter a reasonable price.'
				})
			}

			if (initialPrice < MIN_PRICE) {
				ctx.addIssue({
					path: ['initialPrice'],
					code: z.ZodIssueCode.custom,
					message: 'Initial price is too low. Please enter a reasonable price.'
				})
			}
		}
	})

// Additional validation schemas for different steps
const baseSchemaFields = z.object({
	baseToken: requiredTokenPropsValidation,
	quoteToken: requiredTokenPropsValidation,
	baseTokenBalance: z.number().min(0, 'Invalid balance'),
	quoteTokenBalance: z.number().min(0, 'Invalid balance'),
	feeTier: z.string().min(1, 'Please select a fee tier'),
	priceSetting: z.string().default('auto'),
	initialPrice: z
		.string()
		.min(1, 'Initial price is required')
		.refine((val) => {
			const num = parseFloat(val)
			return !isNaN(num) && num > 0
		}, 'Initial price must be a positive number'),
	rangeType: z.enum(['full-range', 'custom-range']).default('full-range'),
	minInitialPrice: z.string().optional(),
	maxInitialPrice: z.string().optional(),
	baseTokenAmount: z
		.string()
		.min(1, 'Base token amount is required')
		.refine((val) => {
			const num = parseFloat(val)
			return !isNaN(num) && num > 0
		}, 'Base token amount must be a positive number'),
	quoteTokenAmount: z
		.string()
		.min(1, 'Quote token amount is required')
		.refine((val) => {
			const num = parseFloat(val)
			return !isNaN(num) && num > 0
		}, 'Quote token amount must be a positive number')
})

export const step1Validation = baseSchemaFields
	.pick({
		baseToken: true,
		quoteToken: true,
		feeTier: true
	})
	.superRefine((data, ctx) => {
		// Validate that base and quote tokens are different
		if (data.baseToken && data.quoteToken && data.baseToken.address === data.quoteToken.address) {
			ctx.addIssue({
				path: ['quoteToken'],
				code: z.ZodIssueCode.custom,
				message: 'Base and quote tokens must be different'
			})
		}

		// Validate fee tier is within acceptable range
		const feeTier = parseFloat(data.feeTier)
		if (!isNaN(feeTier) && (feeTier < 0.01 || feeTier > 10)) {
			ctx.addIssue({
				path: ['feeTier'],
				code: z.ZodIssueCode.custom,
				message: 'Fee tier must be between 0.01% and 10%'
			})
		}
	})

export const step2Validation = baseSchemaFields
	.pick({
		initialPrice: true,
		rangeType: true,
		minInitialPrice: true,
		maxInitialPrice: true
	})
	.superRefine((data, ctx) => {
		// Validate custom range prices if custom range is selected
		if (data.rangeType === 'custom-range') {
			if (!data.minInitialPrice || data.minInitialPrice.trim() === '') {
				ctx.addIssue({
					path: ['minInitialPrice'],
					code: z.ZodIssueCode.custom,
					message: 'Minimum price is required for custom range'
				})
			}

			if (!data.maxInitialPrice || data.maxInitialPrice.trim() === '') {
				ctx.addIssue({
					path: ['maxInitialPrice'],
					code: z.ZodIssueCode.custom,
					message: 'Maximum price is required for custom range'
				})
			}

			// Validate min < max if both are provided
			if (data.minInitialPrice && data.maxInitialPrice) {
				const minPrice = parseFloat(data.minInitialPrice)
				const maxPrice = parseFloat(data.maxInitialPrice)

				if (!isNaN(minPrice) && !isNaN(maxPrice)) {
					if (minPrice >= maxPrice) {
						ctx.addIssue({
							path: ['maxInitialPrice'],
							code: z.ZodIssueCode.custom,
							message: 'Maximum price must be greater than minimum price'
						})
					}

					// Validate that initial price is within range
					const initialPrice = parseFloat(data.initialPrice)
					if (!isNaN(initialPrice)) {
						if (initialPrice < minPrice || initialPrice > maxPrice) {
							ctx.addIssue({
								path: ['initialPrice'],
								code: z.ZodIssueCode.custom,
								message: 'Initial price must be within the specified range'
							})
						}
					}
				}
			}
		}

		// Validate price reasonableness
		const initialPrice = parseFloat(data.initialPrice)
		if (!isNaN(initialPrice)) {
			const MAX_PRICE = 1e15
			const MIN_PRICE = 1e-15

			if (initialPrice > MAX_PRICE) {
				ctx.addIssue({
					path: ['initialPrice'],
					code: z.ZodIssueCode.custom,
					message: 'Initial price is too high. Please enter a reasonable price.'
				})
			}

			if (initialPrice < MIN_PRICE) {
				ctx.addIssue({
					path: ['initialPrice'],
					code: z.ZodIssueCode.custom,
					message: 'Initial price is too low. Please enter a reasonable price.'
				})
			}
		}
	})

export const step3Validation = baseSchemaFields
	.pick({
		baseTokenAmount: true,
		quoteTokenAmount: true,
		baseTokenBalance: true,
		quoteTokenBalance: true
	})
	.superRefine((data, ctx) => {
		// Validate token amounts against balances
		const baseAmount = parseFloat(data.baseTokenAmount)
		const quoteAmount = parseFloat(data.quoteTokenAmount)

		if (!isNaN(baseAmount) && baseAmount > data.baseTokenBalance) {
			ctx.addIssue({
				path: ['baseTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: `Insufficient balance. Available: ${data.baseTokenBalance.toFixed(6)}`
			})
		}

		if (!isNaN(quoteAmount) && quoteAmount > data.quoteTokenBalance) {
			ctx.addIssue({
				path: ['quoteTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: `Insufficient balance. Available: ${data.quoteTokenBalance.toFixed(6)}`
			})
		}

		// Validate minimum deposit amounts
		const MIN_DEPOSIT_VALUE = 0.000001

		if (!isNaN(baseAmount) && baseAmount < MIN_DEPOSIT_VALUE) {
			ctx.addIssue({
				path: ['baseTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: `Minimum deposit amount is ${MIN_DEPOSIT_VALUE}`
			})
		}

		if (!isNaN(quoteAmount) && quoteAmount < MIN_DEPOSIT_VALUE) {
			ctx.addIssue({
				path: ['quoteTokenAmount'],
				code: z.ZodIssueCode.custom,
				message: `Minimum deposit amount is ${MIN_DEPOSIT_VALUE}`
			})
		}
	})

// Helper function to validate step-by-step
export function validatePoolCreationStep(step: number, data: any) {
	switch (step) {
		case 0:
			return step1Validation.safeParse(data)
		case 1:
			return step2Validation.safeParse(data)
		case 2:
			return step3Validation.safeParse(data)
		case 3:
			return createPoolValidation.safeParse(data)
		default:
			return createPoolValidation.safeParse(data)
	}
}

// Enhanced pool validation with native BBA support
export function validateNativeBBAPoolCreation(payload: TCreatePoolPayload): {
	isValid: boolean
	isNativeBBAPool: boolean
	hasNativeBBA: boolean
	warnings: string[]
	recommendations: string[]
} {
	const { isNativeBBA, isNativeBBAPool } = require('@/staticData/tokens')
	
	const isNativeBBAPoolDetected = isNativeBBAPool(payload.baseToken.address, payload.quoteToken.address)
	const hasNativeBBA = isNativeBBA(payload.baseToken.address) || isNativeBBA(payload.quoteToken.address)
	
	const warnings: string[] = []
	const recommendations: string[] = []
	
	// Native BBA specific validations
	if (hasNativeBBA) {
		// Recommend appropriate fee tiers for native BBA pools
		const feeTier = parseFloat(payload.feeTier)
		if (feeTier > 0.3) {
			warnings.push(`High fee tier (${payload.feeTier}%) for native BBA pool. Consider lower fees for better liquidity.`)
			recommendations.push('Use 0.05% or 0.1% fee tier for native BBA pools to attract more traders.')
		}
		
		// Validate initial price for native BBA pairs
		const initialPrice = parseFloat(payload.initialPrice)
		if (initialPrice <= 0) {
			return {
				isValid: false,
				isNativeBBAPool: isNativeBBAPoolDetected,
				hasNativeBBA,
				warnings: ['Initial price must be greater than 0'],
				recommendations: []
			}
		}
		
		// Native BBA balance recommendations
		const baseAmount = parseFloat(payload.baseTokenAmount)
		const quoteAmount = parseFloat(payload.quoteTokenAmount)
		
		if (isNativeBBA(payload.baseToken.address) && baseAmount < 0.1) {
			warnings.push('Very low BBA amount may result in poor liquidity depth.')
			recommendations.push('Consider adding at least 0.1 BBA for meaningful liquidity.')
		}
		
		if (isNativeBBA(payload.quoteToken.address) && quoteAmount < 0.1) {
			warnings.push('Very low BBA amount may result in poor liquidity depth.')
			recommendations.push('Consider adding at least 0.1 BBA for meaningful liquidity.')
		}
		
		// Add native BBA specific recommendations
		recommendations.push('Native BBA pools benefit from automatic wrapping - no manual WBBA management needed.')
		recommendations.push('Monitor pool performance as native BBA liquidity tends to be more volatile.')
	}
	
	return {
		isValid: true,
		isNativeBBAPool: isNativeBBAPoolDetected,
		hasNativeBBA,
		warnings,
		recommendations
	}
}

// Enhanced pool creation parameters validation
export function validateEnhancedPoolParams(params: {
	baseToken: any
	quoteToken: any
	baseTokenAmount: string
	quoteTokenAmount: string
	feeTier: string
	initialPrice: string
}): {
	isValid: boolean
	errors: string[]
	recommendations: string[]
} {
	const errors: string[] = []
	const recommendations: string[] = []
	
	// Basic validation
	if (!params.baseToken || !params.quoteToken) {
		errors.push('Both base and quote tokens must be selected')
	}
	
	if (params.baseToken?.address === params.quoteToken?.address) {
		errors.push('Base and quote tokens must be different')
	}
	
	// Amount validation
	const baseAmount = parseFloat(params.baseTokenAmount)
	const quoteAmount = parseFloat(params.quoteTokenAmount)
	const initialPrice = parseFloat(params.initialPrice)
	const feeTier = parseFloat(params.feeTier)
	
	if (isNaN(baseAmount) || baseAmount <= 0) {
		errors.push('Base token amount must be a positive number')
	}
	
	if (isNaN(quoteAmount) || quoteAmount <= 0) {
		errors.push('Quote token amount must be a positive number')
	}
	
	if (isNaN(initialPrice) || initialPrice <= 0) {
		errors.push('Initial price must be a positive number')
	}
	
	if (isNaN(feeTier) || feeTier <= 0 || feeTier > 10) {
		errors.push('Fee tier must be between 0.01% and 10%')
	}
	
	// Liquidity depth recommendations
	const totalValue = baseAmount * initialPrice + quoteAmount
	if (totalValue < 100) {
		recommendations.push('Consider adding more liquidity (>$100 equivalent) for better trading experience')
	}
	
	// Fee tier recommendations
	if (feeTier >= 1) {
		recommendations.push('High fee tiers (≥1%) may discourage trading. Consider lower fees for mainstream tokens.')
	}
	
	return {
		isValid: errors.length === 0,
		errors,
		recommendations
	}
}

// Pool configuration validation helpers
export const POOL_CONSTANTS = {
	MIN_FEE_TIER: 0.01,
	MAX_FEE_TIER: 10,
	MIN_DEPOSIT_VALUE: 0.000001,
	MAX_PRICE: 1e15,
	MIN_PRICE: 1e-15,
	RECOMMENDED_FEE_TIERS: [0.01, 0.05, 0.1, 0.25, 0.3, 1]
} as const

export type TCreatePoolValidation = z.infer<typeof createPoolValidation>
