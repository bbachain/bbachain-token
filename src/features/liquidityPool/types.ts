import { z } from 'zod'

import { createPoolValidation } from '@/features/liquidityPool/validation'
import { type TTradeableTokenProps } from '@/features/tokens/types'
import { TSuccessMessage } from '@/types'

type TransactionType = 'BUY' | 'SELL' | 'REMOVE' | 'ADD' | 'UNKNOWN'
export type MintInfo = TTradeableTokenProps

export type RawTokenSwap = {
	version: number
	isInitialized: boolean
	bumpSeed: number
	poolTokenProgramId: Uint8Array
	tokenAccountA: Uint8Array
	tokenAccountB: Uint8Array
	tokenPool: Uint8Array
	mintA: Uint8Array
	mintB: Uint8Array
	feeAccount: Uint8Array
	tradeFeeNumerator: Uint8Array
	tradeFeeDenominator: Uint8Array
	ownerTradeFeeNumerator: Uint8Array
	ownerTradeFeeDenominator: Uint8Array
	ownerWithdrawFeeNumerator: Uint8Array
	ownerWithdrawFeeDenominator: Uint8Array
	hostFeeNumerator: Uint8Array
	hostFeeDenominator: Uint8Array
	curveType: number
	curveParameters: Uint8Array
}

export type TOnchainPoolData = {
	address: string
	programId: string
	swapData: RawTokenSwap
	mintA: MintInfo
	mintB: MintInfo
	tokenAccountA: string
	tokenAccountB: string
	reserveA: bigint
	reserveB: bigint
	feeRate: number
	tvl: number
	volume24h: number
	fees24h: number
	apr24h: number
}

export type TCreatePoolData = {
	swapAccount: string
	poolMint: string
	feeAccount: string
	lpTokenAccount: string
	signature: string
	baseToken: MintInfo
	quoteToken: MintInfo
	baseTokenAmount: number
	quoteTokenAmount: number
}

export type TDepositToPoolData = {
	signature: string
}

export type TPoolStatsData = {
	totalPools: number
	totalLiquidity: number
	totalVolume: number
	totalFees: number
	averageAPR: number
	topPoolsByLiquidity: TOnchainPoolData[]
	topPoolsByVolume: TOnchainPoolData[]
	topPoolsByAPR: TOnchainPoolData[]
	lastUpdated: string
}

export type TUserPoolStatsData = {
	userShare: number
	userLPToken: number
	userReserveA: number
	userReserveB: number
	userReserveTotalPrice: number
	dailyFeeEarnings: number
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

export type TFormattedTransactionData = {
	ownerAddress: string
	time: string
	transactionType: TransactionType
	mintA: MintInfo
	mintB: MintInfo
	mintAAmount: number
	mintBAmount: number
	mintAAmountPrice: number
	mintBAmountPrice: number
}

export type TGetPoolsResponse = TSuccessMessage & {
	data: TOnchainPoolData[]
}

export type TGetPoolByIdResponse = TSuccessMessage & {
	data: TOnchainPoolData | null
}

export type TGetPoolStatsResponse = TSuccessMessage & {
	data: TPoolStatsData | null
}

export type TGetUserPoolStatsResponse = TSuccessMessage & {
	data: TUserPoolStatsData | null
}

export type TCreatePoolResponse = TSuccessMessage & {
	data: TCreatePoolData
}

export type TDepositToPoolResponse = TSuccessMessage & {
	data: TDepositToPoolData
}

export type TGetPoolTransactionResponse = TSuccessMessage & {
	data: TFormattedTransactionData[]
}

export type TCreatePoolPayload = z.infer<typeof createPoolValidation>
export type TDepositToPoolPayload = {
	pool: TOnchainPoolData
	mintAAmount: number
	mintBAmount: number
	slippage?: number
}

export type TTokenFarmProps = {
	id: string
	fromToken: MintInfo
	toToken: MintInfo
	tvl: string
	apr: string
}
