import { PoolListProps } from '@/features/liquidityPool/components/Columns'

/**
 * @deprecated This is a temporary static data for the pool list.
 * It will be replaced with the actual data from the API.
 */
export const PoolStaticData: PoolListProps[] = [
	{
		id: '1',
		programId: 'program-1',
		swapFee: 0.0001,
		mintA: {
			address: 'abcd',
			name: 'Binance Coin',
			symbol: 'BNB',
			logoURI: '/bnb-swap-icon.svg',
			decimals: 18
		},
		mintB: {
			address: 'efgh',
			name: 'BBA Coin',
			symbol: 'BBA',
			logoURI: '/bba-swap-icon.svg',
			decimals: 18
		},
		liquidity: 2354547,
		volume24h: 25207396,
		fees24h: 63018,
		apr24h: 75
	},
	{
		id: '2',
		programId: 'program-2',
		swapFee: 0.0001,
		mintA: {
			address: 'bba-address',
			name: 'BBA Coin',
			symbol: 'BBA',
			logoURI: '/bba-swap-icon.svg',
			decimals: 18
		},
		mintB: {
			address: 'usdt-address',
			name: 'Tether USD',
			symbol: 'USDT',
			logoURI: '/icon-placeholder.svg',
			decimals: 6
		},
		liquidity: 1854547,
		volume24h: 18207396,
		fees24h: 45018,
		apr24h: 68
	},
	{
		id: '3',
		programId: 'program-3',
		swapFee: 0.0005,
		mintA: {
			address: 'eth-address',
			name: 'Ethereum',
			symbol: 'ETH',
			logoURI: '/icon-placeholder.svg',
			decimals: 18
		},
		mintB: {
			address: 'usdt-address',
			name: 'Tether USD',
			symbol: 'USDT',
			logoURI: '/icon-placeholder.svg',
			decimals: 6
		},
		liquidity: 5354547,
		volume24h: 45207396,
		fees24h: 126018,
		apr24h: 92
	},
	{
		id: '4',
		programId: 'program-4',
		swapFee: 0.0003,
		mintA: {
			address: 'sol-address',
			name: 'Solana',
			symbol: 'SOL',
			logoURI: '/icon-placeholder.svg',
			decimals: 9
		},
		mintB: {
			address: 'usdt-address',
			name: 'Tether USD',
			symbol: 'USDT',
			logoURI: '/icon-placeholder.svg',
			decimals: 6
		},
		liquidity: 3254547,
		volume24h: 32207396,
		fees24h: 85018,
		apr24h: 83
	},
	{
		id: '5',
		programId: 'program-5',
		swapFee: 0.0001,
		mintA: {
			address: 'bnb-address',
			name: 'Binance Coin',
			symbol: 'BNB',
			logoURI: '/bnb-swap-icon.svg',
			decimals: 18
		},
		mintB: {
			address: 'usdt-address',
			name: 'Tether USD',
			symbol: 'USDT',
			logoURI: '/icon-placeholder.svg',
			decimals: 6
		},
		liquidity: 2354547,
		volume24h: 25207396,
		fees24h: 63018,
		apr24h: 75
	}
]
