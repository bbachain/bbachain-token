import * as BufferLayout from '@bbachain/buffer-layout'

import { OnchainPoolData } from '@/features/liquidityPool/onchain'
import { RawTokenSwap } from '@/features/swap/types'
import StaticTokens from '@/staticData/tokens'

const publicKey = (property: string = 'publicKey') => {
	return BufferLayout.blob(32, property)
}

const uint64 = (property: string = 'uint64') => {
	return BufferLayout.blob(8, property)
}

export const TokenSwapLayout = BufferLayout.struct<RawTokenSwap>([
	BufferLayout.u8('version'),
	BufferLayout.u8('isInitialized'),
	BufferLayout.u8('bumpSeed'),
	publicKey('tokenProgramId'),
	publicKey('tokenAccountA'),
	publicKey('tokenAccountB'),
	publicKey('tokenPool'),
	publicKey('mintA'),
	publicKey('mintB'),
	publicKey('feeAccount'),
	uint64('tradeFeeNumerator'),
	uint64('tradeFeeDenominator'),
	uint64('ownerTradeFeeNumerator'),
	uint64('ownerTradeFeeDenominator'),
	uint64('ownerWithdrawFeeNumerator'),
	uint64('ownerWithdrawFeeDenominator'),
	uint64('hostFeeNumerator'),
	uint64('hostFeeDenominator'),
	BufferLayout.u8('curveType'),
	BufferLayout.blob(32, 'curveParameters')
])

export function getCoinGeckoId(address: string) {
	const coinGeckoId = StaticTokens.find((token) => address === token.address)?.coinGeckoId
	return coinGeckoId
}

/**
 * Calculate output amount using constant product formula (x * y = k)
 * @param inputAmount - Amount to swap in
 * @param inputReserve - Reserve of input token in pool
 * @param outputReserve - Reserve of output token in pool
 * @param feeRate - Pool fee rate (e.g., 0.003 for 0.3%)
 * @returns Output amount after fees
 */
export function calculateOutputAmount(
	inputAmount: number,
	inputReserve: number,
	outputReserve: number,
	feeRate: number
): number {
	if (inputAmount <= 0 || inputReserve <= 0 || outputReserve <= 0) {
		console.log('❌ Invalid input parameters for calculation')
		return 0
	}

	// Apply fee to input amount
	const inputAmountWithFee = inputAmount * (1 - feeRate)

	// Constant product formula: (x + dx) * (y - dy) = x * y
	// Solving for dy: dy = (y * dx) / (x + dx)
	const outputAmount = (outputReserve * inputAmountWithFee) / (inputReserve + inputAmountWithFee)

	const result = Math.max(0, outputAmount)

	return result
}

/**
 * Calculate price impact for a swap
 * @param inputAmount - Amount being swapped
 * @param inputReserve - Input token reserve
 * @param outputReserve - Output token reserve
 * @param feeRate - Pool fee rate
 * @returns Price impact as percentage
 */
export function calculatePriceImpact(
	inputAmount: number,
	inputReserve: number,
	outputReserve: number,
	feeRate: number
): number {
	if (inputAmount <= 0 || inputReserve <= 0 || outputReserve <= 0) return 0

	// Current price (no slippage)
	const currentPrice = outputReserve / inputReserve

	// Price after swap
	const outputAmount = calculateOutputAmount(inputAmount, inputReserve, outputReserve, feeRate)
	const effectivePrice = outputAmount / inputAmount

	// Price impact percentage
	const priceImpact = Math.abs((currentPrice - effectivePrice) / currentPrice) * 100

	return priceImpact
}

/**
 * Find the best pool for a token pair
 * @param pools - Array of available pools
 * @param inputMint - Input token mint address
 * @param outputMint - Output token mint address
 * @returns Best pool for the swap or null if no pool found
 */
export function findBestPool(
	pools: OnchainPoolData[],
	inputMint: string,
	outputMint: string
): OnchainPoolData | null {
	const availablePools = pools.filter((pool) => {
		const hasInputToken = pool.mintA.address === inputMint || pool.mintB.address === inputMint
		const hasOutputToken = pool.mintA.address === outputMint || pool.mintB.address === outputMint
		return hasInputToken && hasOutputToken && pool.tvl > 0
	})

	if (availablePools.length === 0) return null

	// Sort by TVL (Total Value Locked) to find the most liquid pool
	availablePools.sort((a, b) => b.tvl - a.tvl)

	return availablePools[0]
}
