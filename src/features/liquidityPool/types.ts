import { z } from 'zod'

import { type TTokenProps } from '@/features/swap/types'

import { createPoolValidation } from './validation'

export type TLPTokenProps = TTokenProps & {
	currentPool: number
}

export type TTokenFarmProps = {
	id: string
	fromToken: TTokenProps
	toToken: TTokenProps
	tvl: string
	apr: string
}

export type TCreatePoolPayload = z.infer<typeof createPoolValidation>
