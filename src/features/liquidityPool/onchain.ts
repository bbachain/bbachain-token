import { struct, u8, blob } from '@bbachain/buffer-layout'
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	getAccount,
	getAssociatedTokenAddress,
	getMint,
	TOKEN_PROGRAM_ID
} from '@bbachain/spl-token'
import { PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID, TokenSwap } from '@bbachain/spl-token-swap'
import { Connection, PublicKey } from '@bbachain/web3.js'
import axios from 'axios'

import ENDPOINTS from '@/constants/endpoint'
import { getTokenAccounts } from '@/lib/tokenAccount'
import { getTokenByAddress, generateTokenDisplayName } from '@/staticData/tokens'

import { getCoinGeckoId } from '../swap/utils'

import { MintInfo } from './types'

// Layout for parsing TokenSwap account data
const publicKey = (property: string = 'publicKey') => {
	return blob(32, property)
}

const uint64 = (property: string = 'uint64') => {
	return blob(8, property)
}

interface RawTokenSwap {
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

export const TokenSwapLayout = struct<RawTokenSwap>([
	u8('version'),
	u8('isInitialized'),
	u8('bumpSeed'),
	publicKey('poolTokenProgramId'),
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
	u8('curveType'),
	blob(32, 'curveParameters')
])

export interface OnchainPoolData {
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

/**
 * Fetch all pool accounts from the Token Swap Program
 */
export async function getPoolAccounts(
	connection: Connection
): Promise<Array<{ pubkey: PublicKey; account: any }>> {
	try {
		const accounts = await connection.getProgramAccounts(TOKEN_SWAP_PROGRAM_ID, {
			filters: [
				{
					dataSize: TokenSwapLayout.span // Only get accounts with correct data size
				}
			]
		})
		return accounts
	} catch (error) {
		console.error('Error fetching pool accounts:', error)
		throw new Error('Failed to fetch pool accounts from onchain')
	}
}

/**
 * Parse raw pool account data into structured format
 */
export function parsePoolData(
	pubkey: PublicKey,
	accountData: Buffer
): RawTokenSwap & { address: string } {
	try {
		const data = new Uint8Array(accountData.buffer, accountData.byteOffset, accountData.byteLength)
		const swapData = TokenSwapLayout.decode(data)

		return {
			address: pubkey.toBase58(),
			...swapData
		}
	} catch (error) {
		console.error('Error parsing pool data:', error)
		throw new Error(`Failed to parse pool data for ${pubkey.toBase58()}`)
	}
}

/**
 * Get token mint information for a given mint address
 */
export async function getTokenMintInfo(
	connection: Connection,
	mintAddress: PublicKey
): Promise<MintInfo> {
	try {
		const addressStr = mintAddress.toBase58()

		// First, try to get token info from our registry
		const knownToken = getTokenByAddress(addressStr)
		if (knownToken) {
			console.log(`✅ Found known token: ${knownToken.symbol} (${knownToken.name})`)
			return knownToken
		}

		// If not in registry, get mint info from onchain
		const mint = await getMint(connection, mintAddress)

		// Generate a user-friendly display name for unknown tokens
		const displayInfo = generateTokenDisplayName(addressStr)

		console.log(`⚠️ Unknown token ${addressStr}, using fallback: ${displayInfo.symbol}`)

		return {
			address: addressStr,
			symbol: displayInfo.symbol,
			name: displayInfo.name,
			decimals: mint.decimals,
			logoURI: '/icon-placeholder.svg'
		}
	} catch (error) {
		console.error(`Error fetching mint info for ${mintAddress.toBase58()}:`, error)

		// Return fallback data
		const addressStr = mintAddress.toBase58()
		const displayInfo = generateTokenDisplayName(addressStr)

		return {
			address: addressStr,
			symbol: displayInfo.symbol,
			name: displayInfo.name,
			decimals: 6,
			logoURI: '/icon-placeholder.svg'
		}
	}
}

/**
 * Get token account balance for reserve calculation
 */
export async function getTokenAccountBalance(
	connection: Connection,
	tokenAccount: PublicKey
): Promise<bigint> {
	try {
		const account = await getAccount(connection, tokenAccount)
		return account.amount
	} catch (error) {
		console.error(`Error fetching token account balance for ${tokenAccount.toBase58()}:`, error)
		return BigInt(0)
	}
}

/**
 * Calculate fee rate from numerator and denominator
 */
export function calculateFeeRate(numerator: bigint, denominator: bigint): number {
	if (denominator === BigInt(0)) return 0

	const feeRate = Number(numerator) / Number(denominator)

	// Cap fee rate at 5% (0.05) to prevent unrealistic fees
	// Most DEX fees are between 0.1% and 1%
	if (feeRate > 0.05) {
		console.warn('⚠️ Fee rate capped at 5%:', {
			originalFeeRate: feeRate,
			numerator: numerator.toString(),
			denominator: denominator.toString()
		})
		return 0.01 // Default to 1% if fee rate is unrealistic
	}

	return feeRate
}

/**
 * Calculate TVL (Total Value Locked) from reserves
 * Note: This is a simplified calculation - in production you'd need price feeds
 */
export function calculateTVL(
	reserveA: bigint,
	reserveB: bigint,
	mintA: MintInfo,
	mintB: MintInfo,
	priceA: number,
	priceB: number
): number {
	const balanceA = Number(reserveA) / Math.pow(10, mintA.decimals)
	const balanceB = Number(reserveB) / Math.pow(10, mintB.decimals)

	return balanceA * priceA + balanceB * priceB
}

/**
 * Calculate pool metrics (volume, fees, APR)
 * Note: These are placeholder calculations - real implementation would need historical data
 */
export function calculatePoolMetrics(
	tvl: number,
	feeRate: number
): {
	volume24h: number
	fees24h: number
	apr24h: number
} {
	// Placeholder calculations
	// In production, you'd need to track historical transactions
	const volume24h = tvl * 0.1 // Assume 10% of TVL traded daily
	const fees24h = volume24h * feeRate
	const apr24h = ((fees24h * 365) / tvl) * 100

	return {
		volume24h,
		fees24h,
		apr24h
	}
}

const cache = new Map<string, { price: number; timestamp: number }>()

const STALE_TIME = 60000 // 1 minute
const REFETCH_INTERVAL = 300000 // 5 minutes

async function getCoinGeckoTokenPrice(id: string | undefined): Promise<number> {
	if (!id || id === '') return 1

	const now = Date.now()
	const cached = cache.get(id)

	// If cached and not stale
	if (cached && now - cached.timestamp < STALE_TIME) {
		return cached.price
	}

	try {
		const res = await axios.get(ENDPOINTS.COIN_GECKO.GET_SIMPLE_PRICE, {
			params: {
				ids: id,
				vs_currencies: 'usd'
			}
		})

		const usdRate = res.data[id]?.usd ?? 1

		// Update cache
		cache.set(id, { price: usdRate, timestamp: now })

		return usdRate
	} catch (error) {
		// If fetch fails and we have a recent cached value, return it
		if (cached && now - cached.timestamp < REFETCH_INTERVAL) {
			return cached.price
		}
		// Otherwise fallback to default
		return 1
	}
}

/**
 * Process a single pool account into OnchainPoolData
 */
export async function processPoolAccount(
	connection: Connection,
	pubkey: PublicKey,
	accountData: Buffer
): Promise<OnchainPoolData | null> {
	try {
		// Parse the raw swap data
		const parsedData = parsePoolData(pubkey, accountData)

		// Skip if not initialized
		if (!parsedData.isInitialized) {
			return null
		}

		// Convert Uint8Array to PublicKey and bigint
		const mintAKey = new PublicKey(parsedData.mintA)
		const mintBKey = new PublicKey(parsedData.mintB)
		const tokenAccountAKey = new PublicKey(parsedData.tokenAccountA)
		const tokenAccountBKey = new PublicKey(parsedData.tokenAccountB)

		// Convert fee numerator/denominator from Uint8Array to bigint
		const tradeFeeNumerator = new DataView(parsedData.tradeFeeNumerator.buffer).getBigUint64(
			0,
			true
		)
		const tradeFeeDenominator = new DataView(parsedData.tradeFeeDenominator.buffer).getBigUint64(
			0,
			true
		)

		// Get mint information for both tokens
		const [mintA, mintB] = await Promise.all([
			getTokenMintInfo(connection, mintAKey),
			getTokenMintInfo(connection, mintBKey)
		])

		// Get token account balances (reserves)
		const [reserveA, reserveB] = await Promise.all([
			getTokenAccountBalance(connection, tokenAccountAKey),
			getTokenAccountBalance(connection, tokenAccountBKey)
		])

		const mintAPrice = await getCoinGeckoTokenPrice(getCoinGeckoId(mintA.address))
		const mintBPrice = await getCoinGeckoTokenPrice(getCoinGeckoId(mintB.address))
		// Calculate metrics
		const feeRate = calculateFeeRate(tradeFeeNumerator, tradeFeeDenominator)
		const tvl = calculateTVL(reserveA, reserveB, mintA, mintB, mintAPrice, mintBPrice)
		const metrics = calculatePoolMetrics(tvl, feeRate)

		return {
			address: parsedData.address,
			programId: TOKEN_SWAP_PROGRAM_ID.toBase58(),
			swapData: parsedData,
			mintA,
			mintB,
			tokenAccountA: tokenAccountAKey.toBase58(),
			tokenAccountB: tokenAccountBKey.toBase58(),
			reserveA,
			reserveB,
			feeRate,
			tvl,
			...metrics
		}
	} catch (error) {
		console.error(`Error processing pool account ${pubkey.toBase58()}:`, error)
		return null
	}
}

/**
 * Main function to get all pools from onchain
 */
export async function getAllPoolsFromOnchain(connection: Connection): Promise<OnchainPoolData[]> {
	try {
		console.log('🔄 Fetching pools from onchain...')

		// Get all pool accounts
		const poolAccounts = await getPoolAccounts(connection)
		console.log(`📊 Found ${poolAccounts.length} pool accounts`)

		// Process all accounts in parallel (but with reasonable concurrency)
		const batchSize = 10
		const pools: OnchainPoolData[] = []

		for (let i = 0; i < poolAccounts.length; i += batchSize) {
			const batch = poolAccounts.slice(i, i + batchSize)
			const batchResults = await Promise.all(
				batch.map(({ pubkey, account }) => processPoolAccount(connection, pubkey, account.data))
			)

			// Filter out null results and add to pools array
			pools.push(...(batchResults.filter(Boolean) as OnchainPoolData[]))
		}

		console.log(`✅ Successfully processed ${pools.length} valid pools`)
		return pools
	} catch (error) {
		console.error('❌ Error getting pools from onchain:', error)
		throw error
	}
}

export const getTotalLPSupply = async (connection: Connection, lpMintAddress: PublicKey) => {
	const tokenSwapState = await TokenSwap.fromAccountAddress(connection, lpMintAddress)
	const mintInfo = await getMint(connection, tokenSwapState.poolMint)
	const decimals = mintInfo.decimals
	const rawSupply = mintInfo.supply
	const totalSupply = Number(rawSupply) / Math.pow(10, decimals)
	return totalSupply
}

export const getUserLPTokens = async (
	connection: Connection,
	lpMintAddress: PublicKey,
	userPublicKey: PublicKey
): Promise<number> => {
	const tokenSwapState = await TokenSwap.fromAccountAddress(connection, lpMintAddress)
	const userTokenAccountAddress = await getAssociatedTokenAddress(
		tokenSwapState.poolMint,
		userPublicKey
	)
	const tokenAccountInfo = await getAccount(connection, userTokenAccountAddress)
	const mintInfo = await getMint(connection, tokenSwapState.poolMint)
	const decimals = mintInfo.decimals
	const rawAmount = tokenAccountInfo.amount
	const userBalance = Number(rawAmount) / Math.pow(10, decimals)
	return userBalance
}
