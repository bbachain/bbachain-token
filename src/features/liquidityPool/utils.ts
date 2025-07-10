import { PoolListProps } from './components/Columns'
import { OnchainPoolData } from './onchain'
import { PoolData } from './types'

/**
 * Convert OnchainPoolData to PoolListProps for UI display
 */
export function formatOnchainPoolForUI(pool: OnchainPoolData): PoolListProps {
	return {
		id: pool.address,
		programId: pool.programId,
		swapFee: pool.feeRate,
		mintA: pool.mintA,
		mintB: pool.mintB,
		liquidity: pool.tvl,
		volume24h: pool.volume24h,
		fees24h: pool.fees24h,
		apr24h: pool.apr24h
	}
}

/**
 * Convert array of OnchainPoolData to PoolListProps array
 */
export function formatOnchainPoolsForUI(pools: OnchainPoolData[]): PoolListProps[] {
	return pools.map(formatOnchainPoolForUI)
}

/**
 * Legacy converter for API-based PoolData to PoolListProps
 */
export function formatLegacyPoolForUI(pool: PoolData): PoolListProps {
	return {
		id: pool.id,
		programId: pool.programId,
		swapFee: pool.feeRate,
		mintA: pool.mintA,
		mintB: pool.mintB,
		liquidity: pool.tvl,
		volume24h: pool.day.volume,
		fees24h: pool.day.volumeFee,
		apr24h: pool.day.feeApr
	}
}

/**
 * Legacy converter for array of API-based PoolData to PoolListProps array
 */
export function formatLegacyPoolsForUI(pools: PoolData[]): PoolListProps[] {
	return pools.map(formatLegacyPoolForUI)
}

/**
 * Filter pools by search criteria
 */
export function filterPools(pools: PoolListProps[], searchTerm: string): PoolListProps[] {
	if (!searchTerm.trim()) return pools

	const term = searchTerm.toLowerCase()
	return pools.filter(
		(pool) =>
			pool.mintA.name.toLowerCase().includes(term) ||
			pool.mintA.symbol.toLowerCase().includes(term) ||
			pool.mintB.name.toLowerCase().includes(term) ||
			pool.mintB.symbol.toLowerCase().includes(term) ||
			pool.mintA.address.toLowerCase().includes(term) ||
			pool.mintB.address.toLowerCase().includes(term)
	)
}

/**
 * Sort pools by different criteria
 */
export function sortPools(
	pools: PoolListProps[],
	sortBy: 'liquidity' | 'volume' | 'apr',
	order: 'asc' | 'desc' = 'desc'
): PoolListProps[] {
	const sortedPools = [...pools]

	sortedPools.sort((a, b) => {
		let valueA: number
		let valueB: number

		switch (sortBy) {
			case 'liquidity':
				valueA = a.liquidity
				valueB = b.liquidity
				break
			case 'volume':
				valueA = a.volume24h
				valueB = b.volume24h
				break
			case 'apr':
				valueA = a.apr24h
				valueB = b.apr24h
				break
			default:
				return 0
		}

		return order === 'desc' ? valueB - valueA : valueA - valueB
	})

	return sortedPools
}

/**
 * Get pool statistics summary
 */
export function getPoolStatistics(pools: PoolListProps[]): {
	totalPools: number
	totalLiquidity: number
	totalVolume24h: number
	totalFees24h: number
	averageAPR: number
} {
	if (pools.length === 0) {
		return {
			totalPools: 0,
			totalLiquidity: 0,
			totalVolume24h: 0,
			totalFees24h: 0,
			averageAPR: 0
		}
	}

	const totalLiquidity = pools.reduce((sum, pool) => sum + pool.liquidity, 0)
	const totalVolume24h = pools.reduce((sum, pool) => sum + pool.volume24h, 0)
	const totalFees24h = pools.reduce((sum, pool) => sum + pool.fees24h, 0)
	const averageAPR = pools.reduce((sum, pool) => sum + pool.apr24h, 0) / pools.length

	return {
		totalPools: pools.length,
		totalLiquidity,
		totalVolume24h,
		totalFees24h,
		averageAPR
	}
}
