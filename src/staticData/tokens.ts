import { MintInfo } from '@/features/liquidityPool/types'

const StaticTokens: MintInfo[] = [
	{
		name: 'BBA Coin',
		symbol: 'BBA',
		address: 'BBA1111111111111111111111111111111111111111',
		logoURI: '/bba_logo.svg',
		decimals: 9,
		tags: ['native']
	},
	{
		name: 'Tether USD',
		symbol: 'USDT',
		address: 'GyWmvShQr9QGGYsqpVJtMHsyLAng4QtZRgDmwWvYTMaR',
		logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
		decimals: 6,
		tags: ['stablecoin']
	},
	{
		name: 'USD Coin',
		symbol: 'USDC',
		address: '3ifxm7UKBEFxVnGn3SiZh1QMW7RCJPbAeE4JYh8hiYUd',
		logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
		decimals: 6,
		tags: ['stablecoin']
	},
	{
		name: 'Shiba Inu',
		symbol: 'SHIB',
		address: 'LUGhbMWAWsMCmNDRivANNg1adxw2Bgqz6sAm8QYA1Qq',
		logoURI: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
		decimals: 9,
		tags: ['meme']
	}
]

// Create a lookup map for faster access
const TokenRegistry = new Map<string, MintInfo>()
StaticTokens.forEach((token) => {
	TokenRegistry.set(token.address, token)
})

/**
 * Get token info by mint address from the registry
 */
export function getTokenByAddress(address: string): MintInfo | null {
	return TokenRegistry.get(address) || null
}

/**
 * Get a list of known token addresses
 */
export function getKnownTokenAddresses(): string[] {
	return Array.from(TokenRegistry.keys())
}

/**
 * Check if a token is known in our registry
 */
export function isKnownToken(address: string): boolean {
	return TokenRegistry.has(address)
}

/**
 * Generate a user-friendly display name for unknown tokens
 */
export function generateTokenDisplayName(address: string): { symbol: string; name: string } {
	// Create a shorter, more readable format
	const shortSymbol = address.slice(0, 6) // First 6 characters

	// Try to make it look like a token symbol
	const cleanSymbol = shortSymbol.toUpperCase()

	return {
		symbol: cleanSymbol,
		name: `Token ${cleanSymbol}`
	}
}

export default StaticTokens
