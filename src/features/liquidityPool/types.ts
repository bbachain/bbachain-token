import { z } from 'zod'

import { TSuccessMessage } from '@/types'

import { type TTradeableTokenProps } from '../tokens/types'

import { TransactionListProps } from './components/TransactionColumns'
import { createPoolValidation } from './validation'

export type TLPTokenProps = TTradeableTokenProps & {
	currentPool: number
	decimals: number
	tags: string[]
}

export type TTokenFarmProps = {
	id: string
	fromToken: TTradeableTokenProps
	toToken: TTradeableTokenProps
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
	chainId?: number
	address: string
	programId?: string
	logoURI?: string
	symbol: string
	name: string
	decimals: number
	tags?: string[]
	extensions?: Record<string, unknown>
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

export type TokenTransactionBalance = {
	accountIndex: number
	mint: string
	owner: string
	uiTokenAmount: {
		amount: string
		decimals: number
		uiAmount: number
		uiAmountString: string
	}
}

export type TransactionDataMeta = {
	preBalances: number[]
	preTokenBalances: TokenTransactionBalance[]
	postBalances: number[]
	postTokenBalances: TokenTransactionBalance[]
}

export type TransactionData = {
	blockTime: number
	transaction: {
		message: {
			accountKeys: { pubkey: string; signer: boolean }[]
		}
	}
	meta: TransactionDataMeta
}

export type TGetPoolsResponse = TSuccessMessage & {
	data: PoolData[]
}

export type TGetPoolDetailResponse = TSuccessMessage & {
	data: PoolData
}

export type TCreatePoolResponse = {
	tokenSwap: string
	poolMint: string
	feeAccount: string
	lpTokenAccount: string
	baseToken: MintInfo
	quoteToken: MintInfo
	baseTokenAmount: number
	quoteTokenAmount: number
}

export type TCreatePoolPayload = z.infer<typeof createPoolValidation>

export type TGetPoolTransactionResponse = TSuccessMessage & {
	data: TransactionListProps[]
}
