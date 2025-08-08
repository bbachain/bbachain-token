import { NATIVE_MINT } from '@bbachain/spl-token'

import { MintInfo } from '@/features/liquidityPool/types'

export type ExtendedMintInfo = MintInfo & {
	coinGeckoId?: string
}

const StaticTokens: ExtendedMintInfo[] = [
	{
		name: 'BBA Coin',
		symbol: 'BBA',
		coinGeckoId: 'bbachain',
		address: NATIVE_MINT.toBase58(),
		logoURI: '/bba_logo.svg',
		decimals: 9,
		tags: ['native']
	},
	{
		name: 'Tether USD',
		symbol: 'USDT',
		coinGeckoId: 'tether',
		address: 'C5CpKwRY2Q5kPYhx78XimCg2eRT3YUgPFAoocFF7Vgf',
		logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
		decimals: 6,
		tags: ['stablecoin']
	},
	{
		name: 'SLSA',
		symbol: 'SLSA',
		coinGeckoId: '',
		address: '2pCnkCrLZt4BTfsqABJpQCrynZZbtoqYmq86CusP4FbS',
		logoURI: 'https://ipfs.io/ipfs/Qmd5CCuusYMDW7KDaed9x2LyeHesdzfthQg43gUuGgmbPD',
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

/**
 * Check if a token is the native BBA token
 */
export function isNativeBBA(address: string): boolean {
	return address === NATIVE_MINT.toBase58()
}

/**
 * Check if a token is a BBA token (native or wrapped)
 */
export function isBBAToken(address: string): boolean {
	const token = getTokenByAddress(address)
	return token?.symbol === 'BBA' || isNativeBBA(address)
}

/**
 * Get the native BBA token info
 */
export function getNativeBBAToken(): MintInfo {
	return StaticTokens[0] // First token is always BBA
}

/**
 * ========================================
 * BBA LIQUIDITY POOL UTILITIES
 * ========================================
 */

/**
 * Check if a pool pair involves the native BBA token
 */
export function isBBAPool(baseTokenAddress: string, quoteTokenAddress: string): boolean {
	return isNativeBBA(baseTokenAddress) || isNativeBBA(quoteTokenAddress)
}

/**
 * Get the BBA token position in a pool pair
 * @returns 'base' if BBA is base token, 'quote' if BBA is quote token, null if no BBA
 */
export function getBBAPositionInPool(baseTokenAddress: string, quoteTokenAddress: string): 'base' | 'quote' | null {
	if (isNativeBBA(baseTokenAddress)) return 'base'
	if (isNativeBBA(quoteTokenAddress)) return 'quote'
	return null
}

/**
 * Get the non-BBA token in a BBA pool pair
 */
export function getNonBBATokenFromPool(baseTokenAddress: string, quoteTokenAddress: string): string | null {
	if (isNativeBBA(baseTokenAddress)) return quoteTokenAddress
	if (isNativeBBA(quoteTokenAddress)) return baseTokenAddress
	return null
}

/**
 * Check if pool creation requires BBA wrapping
 */
export function requiresBBAWrapping(baseTokenAddress: string, quoteTokenAddress: string): boolean {
	return isBBAPool(baseTokenAddress, quoteTokenAddress)
}

/**
 * Get the WBBA (Wrapped BBA) mint address for pool operations
 * BBA uses NATIVE_MINT when wrapped
 */
export function getWBBAMintAddress(): string {
	return NATIVE_MINT.toBase58()
}

/**
 * Check if an address is the WBBA mint (same as NATIVE_MINT)
 */
export function isWBBAMint(address: string): boolean {
	return address === NATIVE_MINT.toBase58()
}

/**
 * ========================================
 * LP TOKEN IDENTIFICATION UTILITIES
 * ========================================
 */

/**
 * Check if a token is likely a Liquidity Pool (LP) token
 * LP tokens typically have:
 * - 2 decimals (standard for LP tokens)
 * - Mint authority controlled by a Program Derived Address (PDA)
 * - Authority that is not the common system addresses
 */
export function isLikelyLPToken(decimals: number, mintAuthorityAddress: string | null): boolean {
	// Basic check: LP tokens typically have 2 decimals
	if (decimals !== 2) {
		return false
	}

	// If no mint authority, it's not an LP token (those are usually revoked tokens)
	if (!mintAuthorityAddress) {
		return false
	}

	// Common non-LP addresses to exclude
	const commonAddresses = [
		'11111111111111111111111111111111', // System Program
		'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
		'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' // Associated Token Program
	]

	// If mint authority is a common system address, it's not an LP token
	if (commonAddresses.includes(mintAuthorityAddress)) {
		return false
	}

	// Additional heuristic: LP tokens usually have PDA authorities
	// Most user tokens don't use complex PDA structures
	// This is a reasonable heuristic for filtering
	return true
}

/**
 * Get display name for LP tokens
 */
export function getLPTokenDisplayName(mintAddress: string): string {
	return `LP-${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`
}

export default StaticTokens
