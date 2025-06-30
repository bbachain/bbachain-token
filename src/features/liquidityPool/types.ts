import { z } from 'zod'

import { type TTokenProps } from '@/features/swap/types'
import { TSuccessMessage } from '@/types'

import { createPoolValidation } from './validation'

export type TLPTokenProps = TTokenProps & {
	currentPool: number
	decimals: number
	tags: string[]
}

export type TTokenFarmProps = {
	id: string
	fromToken: TTokenProps
	toToken: TTokenProps
	tvl: string
	apr: string
}

export type PoolData = {
	type: string
	programId: string
	id: string
	mintA: MintInfo
	mintB: MintInfo
	price: number
	mintAmountA: number
	mintAmountB: number
	feeRate: number
	openTime: string
	tvl: number
	day: TimeStats
	week: TimeStats
	month: TimeStats
	pooltype: string[]
	rewardDefaultPoolInfos: string
	rewardDefaultInfos: RewardInfo[]
	farmUpcomingCount: number
	farmOngoingCount: number
	farmFinishedCount: number
	marketId: string
	lpMint: MintInfo
	lpPrice: number
	lpAmount: number
	burnPercent: number
	launchMigratePool: boolean
}

export type MintInfo = {
	chainId: number
	address: string
	programId: string
	logoURI: string
	symbol: string
	name: string
	decimals: number
	tags: string[]
	extensions: Record<string, unknown>
}

export type TimeStats = {
	volume: number
	volumeQuote: number
	volumeFee: number
	apr: number
	feeApr: number
	priceMin: number
	priceMax: number
	rewardApr: number[]
}

export type RewardInfo = {
	mint: MintInfo
	perSecond: string
	startTime: string
	endTime: string
}

export type TGetPoolsResponse = TSuccessMessage & {
	data: PoolData[]
}

export type TGetPoolDetailResponse = TSuccessMessage & {
	data: PoolData
}

export type TCreatePoolPayload = z.infer<typeof createPoolValidation>
