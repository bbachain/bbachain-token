import { PublicKey } from '@bbachain/web3.js'

import { OnchainPoolData } from '@/features/liquidityPool/onchain'
import { MintInfo } from '@/features/liquidityPool/types'
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
	data: TTradeableTokenProps[]
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

export type TGetSwapQuotePayload = {
	inputMint: string
	outputMint: string
	inputAmount: string
	slippage?: number
}

export type TGetSwapQuoteResponse = {
	inputAmount: number
	outputAmount: number
	minimumReceived: number
	priceImpact: number
	exchangeRate: number
	feeRate: number
	poolAddress: string
	poolTvl: number
	inputToken: MintInfo
	outputToken: MintInfo
}

export type TExecuteSwapPayload = {
	inputMint: string
	outputMint: string
	inputAmount: string
	slippage: number
	poolAddress: string
}

export type TExecuteSwapResponseData = {
	signature: string
	inputAmount: number
	outputAmount: number
	actualOutputAmount: number
	priceImpact: number
	executionTime: number
	poolDetail?: OnchainPoolData
}

export type TExecuteSwapResponse = TSuccessMessage & {
	data: TExecuteSwapResponseData
}
