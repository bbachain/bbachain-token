import { MintInfo } from '@/features/liquidityPool/types'

// BBA Native Token Constants
export const BBA_NATIVE_MINT = 'So11111111111111111111111111111111111111112'
export const BBA_DECIMALS = 9

const StaticTokens: MintInfo[] = [
	{
		name: 'BBA Coin',
		symbol: 'BBA',
		address: BBA_NATIVE_MINT,
		logoURI: '/bba_logo.svg',
		decimals: BBA_DECIMALS,
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
		decimals: 9,
		tags: ['stablecoin']
	},
	{
		name: 'Shiba Inu',
		symbol: 'SHIB',
		address: 'LUGhbMWAWsMCmNDRivANNg1adxw2Bgqz6sAm8QYA1Qq',
		logoURI: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
		decimals: 6,
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
 * Check if a token is native BBA
 */
export function isNativeBBA(address: string): boolean {
	return address === BBA_NATIVE_MINT
}

/**
 * Check if a token is BBA (native or wrapped)
 */
export function isBBAToken(address: string): boolean {
	return isNativeBBA(address)
}

/**
 * Get BBA token info
 */
export function getBBATokenInfo(): MintInfo {
	const bbaToken = getTokenByAddress(BBA_NATIVE_MINT)
	if (!bbaToken) {
		throw new Error('BBA token not found in registry')
	}
	return bbaToken
}

/**
 * Check if a pool involves native BBA
 */
export function isNativeBBAPool(tokenAAddress: string, tokenBAddress: string): boolean {
	return isNativeBBA(tokenAAddress) || isNativeBBA(tokenBAddress)
}

/**
 * Get the non-BBA token from a BBA/Token pair
 */
export function getNonBBAToken(tokenAAddress: string, tokenBAddress: string): string {
	if (isNativeBBA(tokenAAddress)) {
		return tokenBAddress
	}
	if (isNativeBBA(tokenBAddress)) {
		return tokenAAddress
	}
	throw new Error('No BBA token found in pair')
}

/**
 * Generate a user-friendly display name for unknown tokens
 */
export function generateTokenDisplayName(address: string): { symbol: string; name: string } {
	// Check if it's native BBA first
	if (isNativeBBA(address)) {
		return { symbol: 'BBA', name: 'BBA Coin' }
	}

	// Create a shorter, more readable format
	const shortSymbol = address.slice(0, 6) // First 6 characters

	// Try to make it look like a token symbol
	const cleanSymbol = shortSymbol.toUpperCase()

	return {
		symbol: cleanSymbol,
		name: `Token ${cleanSymbol}`
	}
}

/**
 * Trading pair category type
 */
export type TradingPairCategory = 'stablecoin' | 'meme' | 'defi' | 'gaming' | 'other'

/**
 * Default trading pairs configuration
 * Can be moved to a config file or fetched from API
 */
const DEFAULT_TRADING_PAIRS_CONFIG: Array<{
	base: string
	quote: string
	priority: number
	category: TradingPairCategory
	recommended: boolean
	description: string
}> = [
	{
		base: BBA_NATIVE_MINT,
		quote: 'GyWmvShQr9QGGYsqpVJtMHsyLAng4QtZRgDmwWvYTMaR', // USDT
		priority: 1,
		category: 'stablecoin',
		recommended: true,
		description: 'Native BBA paired with USDT stablecoin'
	},
	{
		base: BBA_NATIVE_MINT,
		quote: '3ifxm7UKBEFxVnGn3SiZh1QMW7RCJPbAeE4JYh8hiYUd', // USDC
		priority: 2,
		category: 'stablecoin',
		recommended: true,
		description: 'Native BBA paired with USDC stablecoin'
	},
	{
		base: BBA_NATIVE_MINT,
		quote: 'LUGhbMWAWsMCmNDRivANNg1adxw2Bgqz6sAm8QYA1Qq', // SHIB
		priority: 3,
		category: 'meme',
		recommended: false,
		description: 'Native BBA paired with SHIB meme token'
	},
	{
		base: 'GyWmvShQr9QGGYsqpVJtMHsyLAng4QtZRgDmwWvYTMaR', // USDT
		quote: '3ifxm7UKBEFxVnGn3SiZh1QMW7RCJPbAeE4JYh8hiYUd', // USDC
		priority: 4,
		category: 'stablecoin',
		recommended: true,
		description: 'Stablecoin arbitrage pair'
	}
]

/**
 * Enhanced trading pair interface
 */
export interface EnhancedTradingPair {
	base: MintInfo
	quote: MintInfo
	priority: number
	category: TradingPairCategory
	recommended: boolean
	description: string
	tvl?: number
	volume24h?: number
}

/**
 * Get default tokens for common trading pairs (Enhanced Version)
 * Now supports configuration and can be extended with dynamic data
 */
export function getDefaultTradingPairs(): { base: MintInfo; quote: MintInfo }[] {
	const pairs: { base: MintInfo; quote: MintInfo }[] = []

	for (const config of DEFAULT_TRADING_PAIRS_CONFIG) {
		const baseToken = getTokenByAddress(config.base)
		const quoteToken = getTokenByAddress(config.quote)

		if (baseToken && quoteToken) {
			pairs.push({ base: baseToken, quote: quoteToken })
		}
	}

	return pairs
}

/**
 * Get enhanced trading pairs with metadata
 * This version includes additional information for better UX
 */
export function getEnhancedTradingPairs(): EnhancedTradingPair[] {
	const enhancedPairs: EnhancedTradingPair[] = []

	for (const config of DEFAULT_TRADING_PAIRS_CONFIG) {
		const baseToken = getTokenByAddress(config.base)
		const quoteToken = getTokenByAddress(config.quote)

		if (baseToken && quoteToken) {
			enhancedPairs.push({
				base: baseToken,
				quote: quoteToken,
				priority: config.priority,
				category: config.category,
				recommended: config.recommended,
				description: config.description,
				// These can be populated from API/onchain data
				tvl: undefined,
				volume24h: undefined
			})
		}
	}

	// Sort by priority (lower number = higher priority)
	return enhancedPairs.sort((a, b) => a.priority - b.priority)
}

/**
 * Get trading pairs by category
 */
export function getTradingPairsByCategory(category: TradingPairCategory): EnhancedTradingPair[] {
	return getEnhancedTradingPairs().filter((pair) => pair.category === category)
}

/**
 * Get recommended trading pairs only
 */
export function getRecommendedTradingPairs(): EnhancedTradingPair[] {
	return getEnhancedTradingPairs().filter((pair) => pair.recommended)
}

/**
 * Future: Get dynamic trading pairs from API/onchain data
 * This can replace the hardcoded approach when ready
 */
export async function getDynamicTradingPairs(): Promise<EnhancedTradingPair[]> {
	try {
		// TODO: Implement API call to get popular trading pairs
		// const response = await fetch('/api/popular-trading-pairs')
		// const dynamicPairs = await response.json()

		// For now, return enhanced pairs with potential future data
		return getEnhancedTradingPairs()
	} catch (error) {
		console.warn('Failed to fetch dynamic trading pairs, falling back to default:', error)
		// Fallback to hardcoded pairs for reliability
		return getEnhancedTradingPairs()
	}
}

export default StaticTokens
