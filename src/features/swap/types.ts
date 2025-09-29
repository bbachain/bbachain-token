import { PublicKey } from '@bbachain/web3.js'

import { TOnchainPoolData } from '@/features/liquidityPool/types'
import { TTradeableTokenProps } from '@/features/tokens/types'
import { TSuccessMessage } from '@/types'

export type RawTokenSwap = {
	version: number
	isInitialized: boolean
	bumpSeed: number
	poolTokenProgramId: PublicKey
	tokenAccountA: PublicKey
	tokenAccountB: PublicKey
	tokenPool: PublicKey
	mintA: PublicKey
	mintB: PublicKey
	feeAccount: PublicKey
	tradeFeeNumerator: bigint
	tradeFeeDenominator: bigint
	ownerTradeFeeNumerator: bigint
	ownerTradeFeeDenominator: bigint
	ownerWithdrawFeeNumerator: bigint
	ownerWithdrawFeeDenominator: bigint
	hostFeeNumerator: bigint
	hostFeeDenominator: bigint
	curveType: number
	curveParameters: Uint8Array
}

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

export type TGetSwappableTokensResponse = TSuccessMessage & {
	data: TTradeableTokenProps[]
}

export type TPostSwapTokensResponse = TSuccessMessage & {
	txId: string
}

export type TGetSwapRoutePayload = {
	inputMint: string
	outputMint: string
}

export type TSwapValidationPayload = {
	pool: TOnchainPoolData | undefined
	inputMint: string
	outputMint: string
	inputAmount: number
	userBalance: number
}

export type TGetSwapQuotePayload = {
	pool: TOnchainPoolData | undefined
	inputMint: string
	outputMint: string
	inputAmount: string
	slippage?: number
	inputType?: 'from' | 'to'
}

export type TGetSwapQuoteResponse = {
	inputAmount: number
	outputAmount: number
	minimumReceived?: number
	maximumInput?: number
	priceImpact: number
	exchangeRate: number
	feeRate: number
	poolAddress: string
	poolTvl: number
	inputToken: TTradeableTokenProps
	outputToken: TTradeableTokenProps
}

export type TGetSwapRouteResponse = {
	type: string
	pools: TOnchainPoolData[]
	route: string[]
	totalFeeRate: number
}

export type TSwapValidationResponse = {
	isBalanceEnough: boolean
	isInputPositive: boolean
	isTokenPairValid: boolean
}

export type TExecuteSwapPayload = {
	pool: TOnchainPoolData | undefined
	inputMint: string
	outputMint: string
	inputAmount: string
	slippage: number
}

export type TExecuteSwapResponseData = {
	signature: string
	inputAmount: number
	outputAmount: number
	actualOutputAmount: number
	priceImpact: number
	executionTime: number
	poolDetail?: TOnchainPoolData
}


export type TExecuteSwapResponse = TSuccessMessage & {
	data: TExecuteSwapResponseData
}
