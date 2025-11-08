import { struct, u8, blob } from '@bbachain/buffer-layout'
import { getAccount, getAssociatedTokenAddress, getMint } from '@bbachain/spl-token'
import { PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID, TokenSwap } from '@bbachain/spl-token-swap'
import { Connection, PublicKey } from '@bbachain/web3.js'

import type { PoolListProps } from '@/features/liquidityPool/components/Columns'
import { RawTokenSwap } from '@/features/liquidityPool/types'
import type {
	MintInfo,
	TOnchainPoolData,
	TokenTransactionBalance,
	TransactionData
} from '@/features/liquidityPool/types'
import type { TTradeableTokenProps } from '@/features/tokens/types'
import { getTradeableTokenByAddress, getBBAFromDaltons, isNativeBBA } from '@/lib/token'

const publicKey = (property: string = 'publicKey') => {
	return blob(32, property)
}

const uint64 = (property: string = 'uint64') => {
	return blob(8, property)
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

export function isBBAPool(baseTokenAddress: string, quoteTokenAddress: string): boolean {
	return isNativeBBA(baseTokenAddress) || isNativeBBA(quoteTokenAddress)
}

/**
 * Get the BBA token position in a pool pair
 * @returns 'base' if BBA is base token, 'quote' if BBA is quote token, null if no BBA
 */
export function getBBAPositionInPool(
	baseTokenAddress: string,
	quoteTokenAddress: string
): 'base' | 'quote' | null {
	if (isNativeBBA(baseTokenAddress)) return 'base'
	if (isNativeBBA(quoteTokenAddress)) return 'quote'
	return null
}

/**
 * Get the non-BBA token in a BBA pool pair
 */
export function getNonBBATokenFromPool(
	baseTokenAddress: string,
	quoteTokenAddress: string
): string | null {
	if (isNativeBBA(baseTokenAddress)) return quoteTokenAddress
	if (isNativeBBA(quoteTokenAddress)) return baseTokenAddress
	return null
}

export function requiresBBAWrapping(baseTokenAddress: string, quoteTokenAddress: string): boolean {
	return isBBAPool(baseTokenAddress, quoteTokenAddress)
}

export async function getPoolAccounts(connection: Connection) {
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

function generateTokenDisplayName(address: string): { symbol: string; name: string } {
	const shortSymbol = address.slice(0, 6)
	const cleanSymbol = shortSymbol.toUpperCase()
	return {
		symbol: cleanSymbol,
		name: `Token ${cleanSymbol}`
	}
}

export async function getTokenMintInfo(
	connection: Connection,
	mintAddress: PublicKey
): Promise<MintInfo> {
	try {
		const addressStr = mintAddress.toBase58()
		const knownToken = getTradeableTokenByAddress(addressStr)
		if (knownToken) return knownToken

		const mint = await getMint(connection, mintAddress)
		const displayInfo = generateTokenDisplayName(addressStr)

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

export async function processPoolAccount(
	connection: Connection,
	pubkey: PublicKey,
	accountData: Buffer
): Promise<Omit<
	TOnchainPoolData,
	'mintAPrice' | 'mintBPrice' | 'tvl' | 'volume24h' | 'fees24h' | 'apr24h'
> | null> {
	try {
		// Parse the raw swap data
		const parsedData = parsePoolData(pubkey, accountData)

		// Skip if not initialized
		if (!parsedData.isInitialized) return null

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

		// Calculate metrics
		const feeRate = calculateFeeRate(tradeFeeNumerator, tradeFeeDenominator)
		// const tvl = calculateTVL(reserveA, reserveB, mintA, mintB, mintAPrice, mintBPrice)
		// const metrics = calculatePoolMetrics(tvl, feeRate)

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
			feeRate
		}
	} catch (error) {
		console.error(`Error processing pool account ${pubkey.toBase58()}:`, error)
		return null
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

export function formatOnchainPoolForUI(pool: TOnchainPoolData): PoolListProps {
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

export function formatOnchainPoolsForUI(pools: TOnchainPoolData[]): PoolListProps[] {
	return pools.map(formatOnchainPoolForUI)
}

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

export function getSignerWallet(transaction: TransactionData): string | null {
	const signer = transaction.transaction.message.accountKeys.find((a) => a.signer)
	return signer?.pubkey || null
}

export function getTotalTransactionBalance(
	balances: TokenTransactionBalance[] | number[],
	mint: TTradeableTokenProps,
	wallet: string
): number {
	if (isNativeBBA(mint.address) && typeof balances[0] === 'number') {
		return getBBAFromDaltons(balances[0]) as number
	}
	const balancesData = (balances as TokenTransactionBalance[]).find(
		(b) => b.mint === mint.address && b.owner === wallet
	)
	return balancesData?.uiTokenAmount.uiAmount ?? 0
}

export function getTransactionDelta(
	pre: TokenTransactionBalance[] | number[],
	post: TokenTransactionBalance[] | number[],
	mint: TTradeableTokenProps,
	wallet: string
): number {
	return (
		getTotalTransactionBalance(post, mint, wallet) - getTotalTransactionBalance(pre, mint, wallet)
	)
}

export function classifyType(
	baseDelta: number,
	quoteDelta: number
): 'BUY' | 'SELL' | 'REMOVE' | 'ADD' | 'UNKNOWN' {
	const isPositive = (x: number, tolerance = 1e-9) => x > tolerance
	const isNegative = (x: number, tolerance = 1e-9) => x < -tolerance

	if (isPositive(baseDelta) && isNegative(quoteDelta)) return 'BUY'
	if (isNegative(baseDelta) && isPositive(quoteDelta)) return 'SELL'
	if (isPositive(baseDelta) && isPositive(quoteDelta)) return 'REMOVE'
	if (isNegative(baseDelta) && isNegative(quoteDelta)) return 'ADD'
	return 'UNKNOWN'
}

// pool deposit utilities

// Helper function to calculate optimal amount A from amount B
export const calculateOptimalAmountADeposit = (
	amountB: string,
	reserveA: bigint,
	reserveB: bigint,
	decimalsA: number,
	decimalsB: number
): string => {
	if (!amountB || Number(amountB) === 0 || reserveB === BigInt(0)) return ''

	const amountBDaltons = BigInt(Math.floor(Number(amountB) * Math.pow(10, decimalsB)))
	const amountADaltons = (amountBDaltons * reserveA) / reserveB
	const amountA = Number(amountADaltons) / Math.pow(10, decimalsA)

	return amountA.toFixed(6)
}

export const calculateOptimalAmountBDeposit = (
	amountA: string,
	reserveA: bigint,
	reserveB: bigint,
	decimalsA: number,
	decimalsB: number
): string => {
	if (!amountA || Number(amountA) === 0 || reserveA === BigInt(0)) return ''

	const amountADaltons = BigInt(Math.floor(Number(amountA) * Math.pow(10, decimalsA)))
	const amountBDaltons = (amountADaltons * reserveB) / reserveA
	const amountB = Number(amountBDaltons) / Math.pow(10, decimalsB)

	return amountB.toFixed(6)
}
