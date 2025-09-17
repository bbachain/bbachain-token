import { TOnchainPoolData } from '../liquidityPool/types'

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
	pools: TOnchainPoolData[],
	inputMint: string,
	outputMint: string
): TOnchainPoolData | null {
	const availablePools = pools
		.filter((pool) => {
			const hasInputToken = pool.mintA.address === inputMint || pool.mintB.address === inputMint
			const hasOutputToken = pool.mintA.address === outputMint || pool.mintB.address === outputMint
			return hasInputToken && hasOutputToken && pool.tvl > 0
		})
		.map((pool) => {
			const tvlScore = pool.tvl
			const feeScore = 1 - pool.feeRate
			const volumeScore = pool.volume24h
			// (50% tvl, 30% fee, 20% volume)
			const score = tvlScore * 0.5 + feeScore * 0.3 + volumeScore * 0.2
			return { ...pool, score }
		})

	if (availablePools.length === 0) return null
	availablePools.sort((a, b) => b.score - a.score)

	// Return pool terbaik
	return availablePools[0]
}
