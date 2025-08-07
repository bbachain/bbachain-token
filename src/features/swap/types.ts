import { MintInfo } from '@/features/liquidityPool/types'
import { TSuccessMessage } from '@/types'

export type SwapType = 'BaseIn' | 'BaseOut'


export type RoutePlanStep = {
	poolId: string
	inputMint: string
	outputMint: string
	feeMint: string
	feeRate: number
	feeAmount: string
	remainingAccounts: string[]
	lastPoolPriceX64: string
}

export type SwapData = {
	swapType: SwapType
	inputMint: string
	inputAmount: string
	outputMint: string
	outputAmount: string
	otherAmountThreshold: string
	slippageBps: number
	priceImpactPct: number
	referrerAmount: string
	routePlan: RoutePlanStep[]
}

export type TTokenProps = MintInfo

export type TGetUserBalanceData = {
	balance: number
}

export type TGetTokenPriceData = {
	usdRate: number
}



export type TGetSwapTransactionPayload = {
	swapType: SwapType
	inputMint: string
	outputMint: string
	amount: string
	decimals: number
	slippage: number
}

export type TGetSwappableTokensResponse = TSuccessMessage & {
	data: TTokenProps[]
}

export type TGetSwapTransactionData = {
	id: string
	success: boolean
	version: string
	data: SwapData
}

export type TPostSwapTokensResponse = TSuccessMessage & {
	txId: string
}

