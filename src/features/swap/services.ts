import * as BufferLayout from '@bbachain/buffer-layout'
import {
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
	TOKEN_PROGRAM_ID
} from '@bbachain/spl-token'
import { createSwapInstruction, PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID } from '@bbachain/spl-token-swap'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { PublicKey, Transaction } from '@bbachain/web3.js'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

import { TGetTokensResponse } from '@/app/api/tokens/route'
import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'
import { getTokenAccounts2 } from '@/lib/tokenAccount'

import { getAllPoolsFromOnchain, OnchainPoolData } from '../liquidityPool/onchain'
import { TGetTokenDataResponse, TGetTokenResponse } from '../tokens/types'
import { getTokenData } from '../tokens/utils'

import {
	TGetSwappableTokensResponse,
	TGetTokenPriceData,
	TGetUserBalanceData,
	TGetSwapTransactionPayload,
	TTokenProps,
	TGetSwapTransactionData
} from './types'

interface RawTokenSwap {
	version: number
	isInitialized: boolean
	bumpSeed: number
	poolTokenProgramId: PublicKey
	tokenAccountA: PublicKey
	tokenAccountB: PublicKey
	tokenPool: PublicKey
	mintA: PublicKey
	mintB: PublicKey
	feeAccount: PublicKey
	tradeFeeNumerator: bigint
	tradeFeeDenominator: bigint
	ownerTradeFeeNumerator: bigint
	ownerTradeFeeDenominator: bigint
	ownerWithdrawFeeNumerator: bigint
	ownerWithdrawFeeDenominator: bigint
	hostFeeNumerator: bigint
	hostFeeDenominator: bigint
	curveType: number
	curveParameters: Uint8Array
}

export const publicKey = (property: string = 'publicKey') => {
	return BufferLayout.blob(32, property)
}

/**
 * Layout for a 64bit unsigned value
 */
export const uint64 = (property: string = 'uint64') => {
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

export const useGetSwappableTokens = () =>
	useQuery<TGetSwappableTokensResponse>({
		queryKey: [SERVICES_KEY.SWAP.GET_SWAPPABLE_TOKEN],
		queryFn: async () => {
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_MINT_LIST)
			const swappableTokensData = res.data.data.mintList as TTokenProps[]
			return { message: 'Successfully get swappable tokens data', data: swappableTokensData }
		}
	})

/**
 * Hook to fetch tokens from internal API endpoint
 * This replaces the onchain token fetching for better performance and reliability
 */
export const useGetTokensFromAPI = (searchQuery?: string) =>
	useQuery<TGetTokensResponse>({
		queryKey: [SERVICES_KEY.SWAP.GET_SWAPPABLE_TOKEN + '_api', searchQuery],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (searchQuery) {
				params.append('search', searchQuery)
				params.append('includeAddress', 'true')
			}

			const url = searchQuery ? `${ENDPOINTS.API.GET_TOKENS}?${params.toString()}` : ENDPOINTS.API.GET_TOKENS

			const res = await axios.get(url)
			return res.data as TGetTokensResponse
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 3
	})

export const useGetSwappableTokens2 = () => {
	const { connection } = useConnection()
	return useQuery<TGetTokenResponse>({
		queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN],
		queryFn: async () => {
			const tokenAccounts = await getTokenAccounts2(connection)
			const tokenData = await Promise.all(
				tokenAccounts.map(async (account) => {
					const mintKey = new PublicKey(account.mintAddress)
					return await getTokenData(connection, mintKey)
				})
			)

			const filteredTokenData = tokenData.filter((token): token is TGetTokenDataResponse => token !== null)

			return {
				message: `Successfully get token`,
				data: filteredTokenData
			}
		}
	})
}

export const useGetSwappableTokens3 = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress } = useWallet()
	return useQuery({
		queryKey: ['get-swappable-token-3'],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')
			const accountInfo = await connection.getAccountInfo(ownerAddress)
			console.log('account info, ', accountInfo!.data)
			if (accountInfo === null) {
				throw new Error('Failed to find account')
			}

			if (!accountInfo.owner.equals(TOKEN_SWAP_PROGRAM_ID)) {
				throw new Error(`Invalid owner: ${JSON.stringify(accountInfo.owner)}`)
			}

			const data = new Uint8Array(accountInfo.data.buffer, accountInfo.data.byteOffset, accountInfo.data.byteLength)
			return { data: TokenSwapLayout.decode(data) }
		}
	})
}

export const useGetUserBalanceByMint = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetUserBalanceData>({
		queryKey: [SERVICES_KEY.SWAP.GET_USER_BALANCE_BY_MINT, mintAddress],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			try {
				const mint = new PublicKey(mintAddress)
				const ata = await getAssociatedTokenAddress(mint, ownerAddress)
				const balanceAmount = await connection.getTokenAccountBalance(ata)

				return { balance: Number(balanceAmount.value.amount) }
			} catch (e) {
				console.error('Balance fetch error:', e)
				return { balance: 0 }
			}
		},
		enabled: !!mintAddress && !!ownerAddress
	})
}

export const useGetTokenPrice = ({ mintAddress }: { mintAddress: string }) =>
	useQuery<TGetTokenPriceData>({
		queryKey: [SERVICES_KEY.SWAP.GET_TOKEN_PRICE, mintAddress],
		queryFn: async () => {
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_TOKEN_PRICE_BY_MINT, {
				params: {
					mints: mintAddress
				}
			})
			const usdRate = res.data.data[mintAddress] ?? 0
			return { usdRate }
		},
		enabled: !!mintAddress,
		refetchInterval: 60000
	})

export const useGetSwapTransactionByMint = ({
	swapType,
	inputMint,
	outputMint,
	amount,
	decimals,
	slippage
}: TGetSwapTransactionPayload) => {
	const amountPayload = Number(amount) * 10 ** decimals
	const slippageBps = slippage * 100
	return useQuery<TGetSwapTransactionData>({
		queryKey: [SERVICES_KEY.SWAP.GET_SWAP_TRANSACTION, swapType, inputMint, outputMint, amount, decimals, slippage],
		queryFn: async () => {
			const baseType = swapType === 'BaseIn' ? 'in' : 'out'
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_SWAP_TRANSACTION_BY_MINT + `/swap-base-${baseType}`, {
				params: {
					inputMint,
					outputMint,
					amount: amountPayload,
					slippageBps,
					txVersion: 'V0'
				}
			})
			return res.data
		},
		enabled: !!amount || amount === '0',
		refetchInterval: 60000
	})
}

/**
 * Enhanced swap services for BBAChain using onchain liquidity pools
 */

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
export function findBestPool(pools: OnchainPoolData[], inputMint: string, outputMint: string): OnchainPoolData | null {
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

/**
 * Enhanced hook to get swap quote using onchain pools
 */
export const useGetSwapQuote = ({
	inputMint,
	outputMint,
	inputAmount,
	slippage = 0.5
}: {
	inputMint: string
	outputMint: string
	inputAmount: string
	slippage?: number
}) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['swap-quote', inputMint, outputMint, inputAmount, slippage],
		queryFn: async () => {
			console.log('🔄 Starting swap quote calculation:', {
				inputMint,
				outputMint,
				inputAmount,
				inputAmountNumber: Number(inputAmount),
				slippage
			})

			if (!inputAmount || Number(inputAmount) <= 0) {
				console.log('❌ Invalid input amount:', inputAmount)
				return null
			}

			if (inputMint === outputMint) {
				console.log('❌ Same input and output mint')
				return null
			}

			try {
				// Get all pools from onchain
				console.log('📊 Fetching pools from onchain...')
				const pools = await getAllPoolsFromOnchain(connection)
				console.log('📊 Pools fetched:', {
					totalPools: pools.length,
					poolAddresses: pools.map((p) => p.address).slice(0, 5) // First 5 for debugging
				})

				// Find the best pool for this token pair
				const bestPool = findBestPool(pools, inputMint, outputMint)
				console.log('🔍 Pool search result:', {
					found: !!bestPool,
					poolAddress: bestPool?.address,
					poolTvl: bestPool?.tvl,
					mintA: bestPool?.mintA?.symbol,
					mintB: bestPool?.mintB?.symbol
				})

				if (!bestPool) {
					console.log('❌ No liquidity pool found for pair:', {
						inputMint,
						outputMint,
						availablePools: pools.map((p) => ({
							address: p.address,
							mintA: p.mintA.address,
							mintB: p.mintB.address,
							symbols: `${p.mintA.symbol}/${p.mintB.symbol}`
						}))
					})
					throw new Error(`No liquidity pool found for this token pair`)
				}

				// Determine which token is A and which is B
				const isInputTokenA = bestPool.mintA.address === inputMint
				console.log('🔄 Token direction:', {
					isInputTokenA,
					inputToken: isInputTokenA ? bestPool.mintA.symbol : bestPool.mintB.symbol,
					outputToken: isInputTokenA ? bestPool.mintB.symbol : bestPool.mintA.symbol
				})

				const inputReserve = isInputTokenA
					? Number(bestPool.reserveA) / Math.pow(10, bestPool.mintA.decimals)
					: Number(bestPool.reserveB) / Math.pow(10, bestPool.mintB.decimals)
				const outputReserve = isInputTokenA
					? Number(bestPool.reserveB) / Math.pow(10, bestPool.mintB.decimals)
					: Number(bestPool.reserveA) / Math.pow(10, bestPool.mintA.decimals)

				console.log('💰 Pool reserves:', {
					inputReserve,
					outputReserve,
					feeRate: bestPool.feeRate,
					inputReserveRaw: isInputTokenA ? bestPool.reserveA.toString() : bestPool.reserveB.toString(),
					outputReserveRaw: isInputTokenA ? bestPool.reserveB.toString() : bestPool.reserveA.toString()
				})

				// Validate reserves
				if (inputReserve <= 0 || outputReserve <= 0) {
					console.error('❌ Invalid pool reserves:', { inputReserve, outputReserve })
					throw new Error('Pool has invalid reserves')
				}

				const inputAmountNumber = Number(inputAmount)

				// Convert fee rate from percentage to decimal (1.0% -> 0.01)
				const feeRateDecimal = bestPool.feeRate > 1 ? bestPool.feeRate / 100 : bestPool.feeRate

				console.log('🧮 Calculating swap amounts for:', {
					inputAmountNumber,
					inputReserve,
					outputReserve,
					feeRate: bestPool.feeRate,
					feeRateDecimal,
					feeRateDisplay: `${bestPool.feeRate}% -> ${(feeRateDecimal * 100).toFixed(2)}%`
				})

				const outputAmount = calculateOutputAmount(inputAmountNumber, inputReserve, outputReserve, feeRateDecimal)
				const priceImpact = calculatePriceImpact(inputAmountNumber, inputReserve, outputReserve, feeRateDecimal)

				console.log('📈 Calculation results:', {
					inputAmount: inputAmountNumber,
					outputAmount,
					priceImpact
				})

				// Validate calculation results
				if (outputAmount <= 0) {
					console.error('❌ Invalid output amount:', outputAmount)
					throw new Error('Cannot calculate valid output amount')
				}

				// Calculate minimum received with slippage
				const slippageMultiplier = 1 - slippage / 100
				const minimumReceived = outputAmount * slippageMultiplier

				// Calculate exchange rate
				const exchangeRate = outputAmount / inputAmountNumber

				const result = {
					inputAmount: inputAmountNumber,
					outputAmount,
					minimumReceived,
					priceImpact,
					exchangeRate,
					feeRate: bestPool.feeRate * 100, // Convert to percentage
					poolAddress: bestPool.address,
					poolTvl: bestPool.tvl,
					inputToken: isInputTokenA ? bestPool.mintA : bestPool.mintB,
					outputToken: isInputTokenA ? bestPool.mintB : bestPool.mintA
				}

				console.log('✅ Swap quote calculation successful:', result)
				return result
			} catch (error) {
				console.error('❌ Error in swap quote calculation:', error)
				throw error
			}
		},
		enabled: !!inputMint && !!outputMint && !!inputAmount && Number(inputAmount) > 0 && inputMint !== outputMint,
		staleTime: 10000, // 10 seconds
		refetchInterval: 15000, // Refresh every 15 seconds
		retry: (failureCount, error) => {
			console.log('🔄 Retrying swap quote:', { failureCount, error: error?.message })
			return failureCount < 2 // Retry up to 2 times
		}
	})
}

/**
 * Enhanced hook to get available tokens from API with search
 */
export const useGetAvailableTokens = (searchQuery?: string) => {
	return useQuery({
		queryKey: ['available-tokens', searchQuery],
		queryFn: async () => {
			console.log('🔍 Fetching available tokens:', { searchQuery })

			const params = new URLSearchParams()
			if (searchQuery) {
				params.append('search', searchQuery)
				params.append('includeAddress', 'true')
			}

			const url = searchQuery ? `${ENDPOINTS.API.GET_TOKENS}?${params.toString()}` : ENDPOINTS.API.GET_TOKENS

			const response = await axios.get(url)
			console.log('✅ Tokens fetched:', {
				count: response.data?.data?.length || 0,
				hasData: !!response.data?.data
			})

			return response.data
		},
		staleTime: 60000, // 1 minute
		enabled: true
	})
}

/**
 * Enhanced hook to get pools that contain a specific token
 */
export const useGetPoolsForToken = (tokenAddress: string) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['pools-for-token', tokenAddress],
		queryFn: async () => {
			if (!tokenAddress) return []

			const allPools = await getAllPoolsFromOnchain(connection)

			return allPools.filter((pool) => pool.mintA.address === tokenAddress || pool.mintB.address === tokenAddress)
		},
		enabled: !!tokenAddress,
		staleTime: 60000 // 1 minute
	})
}

/**
 * Enhanced swap execution using BBAChain liquidity pools
 */

export interface SwapExecutionParams {
	inputMint: string
	outputMint: string
	inputAmount: string
	slippage: number
	poolAddress: string
}

export interface SwapExecutionResult {
	signature: string
	inputAmount: number
	outputAmount: number
	actualOutputAmount: number
	priceImpact: number
	executionTime: number
}

/**
 * Hook for executing swaps through BBAChain liquidity pools
 */
export const useExecuteSwap = () => {
	const { connection } = useConnection()
	const { publicKey, sendTransaction } = useWallet()
	const queryClient = useQueryClient()

	return useMutation<SwapExecutionResult, Error, SwapExecutionParams>({
		mutationFn: async (params) => {
			const startTime = Date.now()
			console.log('🔄 Swap execution started:', params)

			if (!publicKey) {
				throw new Error('Wallet not connected')
			}

			const { inputMint, outputMint, inputAmount, slippage, poolAddress } = params

			// Get pool data to access swap authority and token accounts
			const pools = await getAllPoolsFromOnchain(connection)
			const pool = pools.find((p) => p.address === poolAddress)
			if (!pool) {
				throw new Error('Pool not found')
			}

			// Debug: Check createSwapInstruction interface
			console.log('🔍 Debug createSwapInstruction function:', {
				name: createSwapInstruction.name,
				length: createSwapInstruction.length
			})

			// Calculate all required values for debugging
			const isInputTokenA = pool.mintA.address === inputMint
			const inputMintPubkey = new PublicKey(inputMint)
			const outputMintPubkey = new PublicKey(outputMint)

			const inputAmountNumber = Number(inputAmount)
			const inputDecimals = isInputTokenA ? pool.mintA.decimals : pool.mintB.decimals
			const outputDecimals = isInputTokenA ? pool.mintB.decimals : pool.mintA.decimals

			const inputAmountDaltons = Math.floor(inputAmountNumber * Math.pow(10, inputDecimals))

			const inputReserve = isInputTokenA
				? Number(pool.reserveA) / Math.pow(10, pool.mintA.decimals)
				: Number(pool.reserveB) / Math.pow(10, pool.mintB.decimals)
			const outputReserve = isInputTokenA
				? Number(pool.reserveB) / Math.pow(10, pool.mintB.decimals)
				: Number(pool.reserveA) / Math.pow(10, pool.mintA.decimals)

			const feeRateDecimal = pool.feeRate > 1 ? pool.feeRate / 100 : pool.feeRate
			const expectedOutput = calculateOutputAmount(inputAmountNumber, inputReserve, outputReserve, feeRateDecimal)
			const expectedOutputDaltons = Math.floor(expectedOutput * Math.pow(10, outputDecimals))

			const slippageMultiplier = 1 - slippage / 100
			const minimumOutputDaltons = Math.floor(expectedOutputDaltons * slippageMultiplier)

			console.log('💰 All swap parameters ready:', {
				inputAmount: inputAmountNumber,
				inputAmountDaltons,
				expectedOutput,
				expectedOutputDaltons,
				minimumOutputDaltons,
				slippage: slippage + '%',
				poolAddress,
				isInputTokenA
			})

			// Get user's token accounts
			const userInputTokenAccount = await getAssociatedTokenAddress(new PublicKey(inputMint), publicKey)
			const userOutputTokenAccount = await getAssociatedTokenAddress(new PublicKey(outputMint), publicKey)

			// Get pool info from BBA Chain
			const poolInfo = pool.swapData

			// Derive swap authority from pool account
			const [swapAuthority] = PublicKey.findProgramAddressSync(
				[new PublicKey(poolAddress).toBuffer()],
				TOKEN_SWAP_PROGRAM_ID
			)

			// Prepare accounts object for createSwapInstruction
			const accounts = {
				// Required accounts based on @bbachain/spl-token-swap
				tokenSwap: new PublicKey(poolAddress),
				authority: swapAuthority,
				userTransferAuthority: publicKey,
				source: userInputTokenAccount,
				swapSource: isInputTokenA ? new PublicKey(poolInfo.tokenAccountA) : new PublicKey(poolInfo.tokenAccountB),
				swapDestination: isInputTokenA ? new PublicKey(poolInfo.tokenAccountB) : new PublicKey(poolInfo.tokenAccountA),
				destination: userOutputTokenAccount,
				poolMint: new PublicKey(poolInfo.tokenPool),
				feeAccount: new PublicKey(poolInfo.feeAccount),
				tokenProgram: TOKEN_PROGRAM_ID,
				swapProgram: TOKEN_SWAP_PROGRAM_ID
			}

			// Prepare instruction data
			const instructionData = {
				amountIn: inputAmountDaltons,
				minimumAmountOut: minimumOutputDaltons
			}

			console.log('🔧 Creating swap instruction with accounts:', accounts)
			console.log('📊 Instruction data:', instructionData)

			// Create the swap instruction using the 2-parameter pattern
			const swapInstruction = createSwapInstruction(accounts, instructionData)

			// Create transaction
			const transaction = new Transaction()
			transaction.add(swapInstruction)

			// Send transaction
			const signature = await sendTransaction(transaction, connection)

			console.log('📤 Transaction sent with signature:', signature)

			// Wait for confirmation
			const confirmation = await connection.confirmTransaction(signature, 'confirmed')

			if (confirmation.value.err) {
				throw new Error(`Transaction failed: ${confirmation.value.err}`)
			}

			console.log('✅ Swap transaction confirmed!')

			// Return execution result
			return {
				signature,
				inputAmount: inputAmountNumber,
				outputAmount: expectedOutput,
				actualOutputAmount: expectedOutput, // TODO: Get actual from transaction logs
				priceImpact: calculatePriceImpact(inputAmountNumber, inputReserve, outputReserve, feeRateDecimal),
				executionTime: Date.now() - startTime
			} as SwapExecutionResult
		},
		onSuccess: (result) => {
			console.log('✅ Swap completed successfully:', result)

			// Invalidate relevant queries to refresh balances and pool data
			queryClient.invalidateQueries({ queryKey: ['swap-quote'] })
			queryClient.invalidateQueries({ queryKey: ['user-balance'] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.SWAP.GET_USER_BALANCE_BY_MINT] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOLS] })
		},
		onError: (error) => {
			console.error('❌ Swap failed:', error)
		}
	})
}

/**
 * Hook to check if a swap is possible between two tokens
 */
export const useCanSwap = (inputMint: string, outputMint: string) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['can-swap', inputMint, outputMint],
		queryFn: async () => {
			if (!inputMint || !outputMint || inputMint === outputMint) {
				return false
			}

			const pools = await getAllPoolsFromOnchain(connection)
			const availablePool = findBestPool(pools, inputMint, outputMint)

			return !!availablePool
		},
		enabled: !!inputMint && !!outputMint && inputMint !== outputMint,
		staleTime: 30000 // 30 seconds
	})
}

/**
 * Hook to get swap route information
 */
export const useGetSwapRoute = (inputMint: string, outputMint: string) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['swap-route', inputMint, outputMint],
		queryFn: async () => {
			if (!inputMint || !outputMint || inputMint === outputMint) {
				return null
			}

			const pools = await getAllPoolsFromOnchain(connection)
			const directPool = findBestPool(pools, inputMint, outputMint)

			if (directPool) {
				return {
					type: 'direct',
					pools: [directPool],
					route: [inputMint, outputMint],
					totalFeeRate: directPool.feeRate
				}
			}

			// TODO: Implement multi-hop routing for indirect swaps
			// For now, return null if no direct route exists
			return null
		},
		enabled: !!inputMint && !!outputMint && inputMint !== outputMint,
		staleTime: 60000 // 1 minute
	})
}
