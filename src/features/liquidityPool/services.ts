import {
	TOKEN_PROGRAM_ID,
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	createInitializeMintInstruction
} from '@bbachain/spl-token'
import { CurveType, createInitializeInstruction, PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID } from '@bbachain/spl-token-swap'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { Keypair, PublicKey, SystemProgram, Transaction, Connection } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import BN from 'bn.js'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'
import { formatTokenToDaltons } from '@/lib/utils'
import { isNativeBBA, isBBAToken, isNativeBBAPool } from '@/staticData/tokens'

import { getAllPoolsFromOnchain, OnchainPoolData } from './onchain'
import { PoolData, TCreatePoolPayload, TCreatePoolResponse, TGetPoolsResponse } from './types'

// Enhanced retry configuration
const RETRY_CONFIG = {
	attempts: 3,
	delay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
	retryCondition: (error: any) => {
		// Retry on network errors, timeouts, and 5xx errors
		return !error.response || error.response.status >= 500 || error.code === 'NETWORK_ERROR'
	}
}

// Enhanced error types for better error handling
export enum PoolCreationErrorType {
	WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
	INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
	INVALID_TOKENS = 'INVALID_TOKENS',
	NETWORK_ERROR = 'NETWORK_ERROR',
	TRANSACTION_FAILED = 'TRANSACTION_FAILED',
	ACCOUNT_CREATION_FAILED = 'ACCOUNT_CREATION_FAILED',
	AUTHORITY_TRANSFER_FAILED = 'AUTHORITY_TRANSFER_FAILED',
	LIQUIDITY_TRANSFER_FAILED = 'LIQUIDITY_TRANSFER_FAILED',
	POOL_INITIALIZATION_FAILED = 'POOL_INITIALIZATION_FAILED',
	NATIVE_BBA_ERROR = 'NATIVE_BBA_ERROR',
	UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class PoolCreationError extends Error {
	public readonly type: PoolCreationErrorType
	public readonly originalError?: Error
	public readonly context?: Record<string, any>
	public readonly retryable: boolean

	constructor(
		type: PoolCreationErrorType,
		message: string,
		originalError?: Error,
		context?: Record<string, any>,
		retryable: boolean = false
	) {
		super(message)
		this.name = 'PoolCreationError'
		this.type = type
		this.originalError = originalError
		this.context = context
		this.retryable = retryable
	}
}

// Enhanced transaction execution with retry logic
async function executeTransactionWithRetry(
	connection: Connection,
	transaction: Transaction,
	sendTransaction: any,
	description: string,
	maxRetries: number = 3
): Promise<string> {
	let lastError: Error | null = null
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`📝 ${description} (Attempt ${attempt}/${maxRetries})...`)
			
			const signature = await sendTransaction(transaction, connection, {
				skipPreflight: false,
				preflightCommitment: 'confirmed'
			})
			
			console.log(`⏳ Transaction sent: ${signature}`)
			
			// Get fresh blockhash for confirmation
			const latestBlockhash = await connection.getLatestBlockhash('confirmed')
			const confirmation = await connection.confirmTransaction(
				{ signature, ...latestBlockhash },
				'confirmed'
			)
			
			if (confirmation.value.err) {
				throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
			}
			
			console.log(`✅ ${description} successful: ${signature}`)
			return signature
			
		} catch (error) {
			lastError = error as Error
			console.error(`❌ ${description} failed (Attempt ${attempt}/${maxRetries}):`, error)
			
			// Don't retry on the last attempt
			if (attempt === maxRetries) {
				break
			}
			
			// Check if error is retryable
			const isRetryable = isTransactionRetryable(error as Error)
			if (!isRetryable) {
				console.log(`🚫 Error is not retryable, stopping attempts`)
				break
			}
			
			// Wait before retrying
			const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
			console.log(`⏱️ Waiting ${delay}ms before retry...`)
			await new Promise(resolve => setTimeout(resolve, delay))
		}
	}
	
	throw new PoolCreationError(
		PoolCreationErrorType.TRANSACTION_FAILED,
		`${description} failed after ${maxRetries} attempts`,
		lastError || undefined,
		{ description, maxRetries },
		false
	)
}

// Check if an error is retryable
function isTransactionRetryable(error: Error): boolean {
	const errorMessage = error.message.toLowerCase()
	
	// Network-related errors that can be retried
	const retryableErrors = [
		'network error',
		'timeout',
		'connection refused',
		'internal server error',
		'rate limit',
		'too many requests',
		'insufficient funds for rent',
		'blockhash not found'
	]
	
	return retryableErrors.some(retryableError => errorMessage.includes(retryableError))
}

// Enhanced balance validation with detailed error messages
async function validateUserBalances(
	connection: Connection,
	ownerAddress: PublicKey,
	payload: TCreatePoolPayload,
	baseAmountDaltons: number,
	quoteAmountDaltons: number
): Promise<void> {
	const baseMint = new PublicKey(payload.baseToken.address)
	const quoteMint = new PublicKey(payload.quoteToken.address)
	
	try {
		// Handle native BBA balance check
		if (isNativeBBA(payload.baseToken.address)) {
			const nativeBalance = await connection.getBalance(ownerAddress)
			if (nativeBalance < baseAmountDaltons) {
				throw new PoolCreationError(
					PoolCreationErrorType.INSUFFICIENT_BALANCE,
					`Insufficient native BBA balance. Required: ${baseAmountDaltons / 1e9} BBA, Available: ${nativeBalance / 1e9} BBA`,
					undefined,
					{ required: baseAmountDaltons, available: nativeBalance, token: 'BBA' }
				)
			}
		} else {
			// Regular SPL token balance check
			const userBaseTokenAccount = await getAssociatedTokenAddress(baseMint, ownerAddress)
			const userBaseInfo = await connection.getAccountInfo(userBaseTokenAccount)
			
			if (!userBaseInfo) {
				throw new PoolCreationError(
					PoolCreationErrorType.INSUFFICIENT_BALANCE,
					`${payload.baseToken.symbol} token account not found. Please ensure you have the required tokens.`,
					undefined,
					{ token: payload.baseToken.symbol, address: userBaseTokenAccount.toBase58() }
				)
			}
			
			const userBaseBalance = new BN(userBaseInfo.data.slice(64, 72), 'le')
			if (userBaseBalance.lt(new BN(baseAmountDaltons))) {
				throw new PoolCreationError(
					PoolCreationErrorType.INSUFFICIENT_BALANCE,
					`Insufficient ${payload.baseToken.symbol} balance. Required: ${baseAmountDaltons / Math.pow(10, payload.baseToken.decimals)}, Available: ${userBaseBalance.div(new BN(Math.pow(10, payload.baseToken.decimals))).toString()}`,
					undefined,
					{ 
						required: baseAmountDaltons, 
						available: userBaseBalance.toString(), 
						token: payload.baseToken.symbol 
					}
				)
			}
		}
		
		// Handle quote token balance check
		if (isNativeBBA(payload.quoteToken.address)) {
			const nativeBalance = await connection.getBalance(ownerAddress)
			if (nativeBalance < quoteAmountDaltons) {
				throw new PoolCreationError(
					PoolCreationErrorType.INSUFFICIENT_BALANCE,
					`Insufficient native BBA balance. Required: ${quoteAmountDaltons / 1e9} BBA, Available: ${nativeBalance / 1e9} BBA`,
					undefined,
					{ required: quoteAmountDaltons, available: nativeBalance, token: 'BBA' }
				)
			}
		} else {
			// Regular SPL token balance check
			const userQuoteTokenAccount = await getAssociatedTokenAddress(quoteMint, ownerAddress)
			const userQuoteInfo = await connection.getAccountInfo(userQuoteTokenAccount)
			
			if (!userQuoteInfo) {
				throw new PoolCreationError(
					PoolCreationErrorType.INSUFFICIENT_BALANCE,
					`${payload.quoteToken.symbol} token account not found. Please ensure you have the required tokens.`,
					undefined,
					{ token: payload.quoteToken.symbol, address: userQuoteTokenAccount.toBase58() }
				)
			}
			
			const userQuoteBalance = new BN(userQuoteInfo.data.slice(64, 72), 'le')
			if (userQuoteBalance.lt(new BN(quoteAmountDaltons))) {
				throw new PoolCreationError(
					PoolCreationErrorType.INSUFFICIENT_BALANCE,
					`Insufficient ${payload.quoteToken.symbol} balance. Required: ${quoteAmountDaltons / Math.pow(10, payload.quoteToken.decimals)}, Available: ${userQuoteBalance.div(new BN(Math.pow(10, payload.quoteToken.decimals))).toString()}`,
					undefined,
					{ 
						required: quoteAmountDaltons, 
						available: userQuoteBalance.toString(), 
						token: payload.quoteToken.symbol 
					}
				)
			}
		}
		
		console.log('✅ User balance validation passed')
		
	} catch (error) {
		if (error instanceof PoolCreationError) {
			throw error
		}
		
		throw new PoolCreationError(
			PoolCreationErrorType.NETWORK_ERROR,
			'Failed to validate user balances',
			error as Error,
			{ baseToken: payload.baseToken.symbol, quoteToken: payload.quoteToken.symbol }
		)
	}
}

// Cache configuration
const CACHE_CONFIG = {
	staleTime: 60000, // 1 minute - data is considered fresh
	gcTime: 300000, // 5 minutes - data stays in cache (renamed from cacheTime)
	refetchInterval: 300000, // Auto-refetch every 5 minutes
	refetchOnWindowFocus: true,
	refetchOnMount: true,
	refetchOnReconnect: true
}

// Legacy API-based pool fetching (deprecated)
export const useGetPoolsFromAPI = () =>
	useQuery<TGetPoolsResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_POOLS + '_api'],
		queryFn: async () => {
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_POOLS_LIST, {
				params: {
					poolType: 'standard',
					poolSortField: 'default',
					sortType: 'desc',
					pageSize: 100,
					page: 1
				}
			})
			const poolsData = res.data.data.data as PoolData[]
			return { message: 'Successfully get pools data', data: poolsData }
		},
		enabled: false // Disabled by default
	})

// Enhanced onchain-based pool fetching
export const useGetPools = () => {
	const { connection } = useConnection()
	const queryClient = useQueryClient()

	return useQuery<{ message: string; data: OnchainPoolData[] }>({
		queryKey: [SERVICES_KEY.POOL.GET_POOLS, connection.rpcEndpoint],
		queryFn: async () => {
			try {
				console.log('🔄 Fetching pools from onchain...')
				const startTime = Date.now()

				const pools = await getAllPoolsFromOnchain(connection)

				const endTime = Date.now()
				const duration = endTime - startTime

				console.log(`✅ Successfully fetched ${pools.length} pools in ${duration}ms`)

				return {
					message: `Successfully fetched ${pools.length} pools from onchain`,
					data: pools,
					meta: {
						fetchTime: new Date().toISOString(),
						duration,
						poolCount: pools.length,
						rpcEndpoint: connection.rpcEndpoint
					}
				}
			} catch (error) {
				console.error('❌ Error fetching pools:', error)

				// Try to return cached data if available
				const cachedData = queryClient.getQueryData([SERVICES_KEY.POOL.GET_POOLS, connection.rpcEndpoint])
				if (cachedData) {
					console.log('📋 Returning cached data due to fetch error')
					return cachedData as { message: string; data: OnchainPoolData[] }
				}

				throw error
			}
		},
		...CACHE_CONFIG,
		retry: RETRY_CONFIG.attempts,
		retryDelay: RETRY_CONFIG.delay
	})
}

// Enhanced pool statistics hook
export const useGetPoolStats = () => {
	const { data: poolsData } = useGetPools()

	return useQuery({
		queryKey: [SERVICES_KEY.POOL.GET_POOL_STATS],
		queryFn: () => {
			if (!poolsData?.data) return null

			const pools = poolsData.data
			const totalLiquidity = pools.reduce((sum, pool) => sum + pool.tvl, 0)
			const totalVolume = pools.reduce((sum, pool) => sum + pool.volume24h, 0)
			const totalFees = pools.reduce((sum, pool) => sum + pool.fees24h, 0)
			const averageAPR = pools.length > 0 ? pools.reduce((sum, pool) => sum + pool.apr24h, 0) / pools.length : 0

			const topPoolsByLiquidity = [...pools].sort((a, b) => b.tvl - a.tvl).slice(0, 10)

			const topPoolsByVolume = [...pools].sort((a, b) => b.volume24h - a.volume24h).slice(0, 10)

			const topPoolsByAPR = [...pools].sort((a, b) => b.apr24h - a.apr24h).slice(0, 10)

			return {
				totalPools: pools.length,
				totalLiquidity,
				totalVolume,
				totalFees,
				averageAPR,
				topPoolsByLiquidity,
				topPoolsByVolume,
				topPoolsByAPR,
				lastUpdated: new Date().toISOString()
			}
		},
		enabled: !!poolsData?.data,
		staleTime: 60000, // 1 minute
		gcTime: 300000 // 5 minutes
	})
}

// Enhanced individual pool fetching
export const useGetPoolById = ({ poolId }: { poolId: string }) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: [SERVICES_KEY.POOL.GET_POOL_BY_ID, poolId],
		queryFn: async () => {
			try {
				// First try to get from onchain data
				const poolsQuery = await getAllPoolsFromOnchain(connection)
				const pool = poolsQuery.find((p) => p.address === poolId)

				if (pool) {
					return {
						message: `Successfully got pool data for ${poolId}`,
						data: pool
					}
				}

				// Fallback to API if needed
				const res = await axios.get(ENDPOINTS.RAYDIUM.GET_POOL_BY_ID, {
					params: { ids: poolId }
				})
				const poolData = res.data.data[0] as PoolData
				return {
					message: `Successfully got pool data for ${poolId}`,
					data: poolData
				}
			} catch (error) {
				console.error(`Error fetching pool ${poolId}:`, error)
				throw error
			}
		},
		enabled: !!poolId,
		staleTime: 30000, // 30 seconds
		retry: 2,
		retryDelay: 1000
	})
}

// Pool refresh mutation
export const useRefreshPools = () => {
	const queryClient = useQueryClient()
	const { connection } = useConnection()

	return useMutation({
		mutationFn: async () => {
			console.log('🔄 Manually refreshing pools...')
			const pools = await getAllPoolsFromOnchain(connection)
			return pools
		},
		onSuccess: (pools) => {
			// Update the main pools cache
			queryClient.setQueryData([SERVICES_KEY.POOL.GET_POOLS, connection.rpcEndpoint], {
				message: `Successfully refreshed ${pools.length} pools`,
				data: pools
			})

			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOL_STATS] })

			console.log(`✅ Manually refreshed ${pools.length} pools`)
		},
		onError: (error) => {
			console.error('❌ Manual refresh failed:', error)
		}
	})
}

// Background sync for real-time updates
export const usePoolsBackgroundSync = () => {
	const { connection } = useConnection()
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: ['pools-background-sync', connection.rpcEndpoint],
		queryFn: async () => {
			try {
				// This runs in the background to keep data fresh
				const pools = await getAllPoolsFromOnchain(connection)

				// Update cache silently
				queryClient.setQueryData([SERVICES_KEY.POOL.GET_POOLS, connection.rpcEndpoint], {
					message: `Background sync: ${pools.length} pools`,
					data: pools
				})

				return pools
			} catch (error) {
				console.warn('Background sync failed:', error)
				throw error
			}
		},
		refetchInterval: 60000, // Every minute
		refetchOnWindowFocus: false,
		enabled: true,
		staleTime: Infinity, // Never mark as stale since this is just for background sync
		retry: 1,
		retryDelay: 5000
	})
}

// Create pool mutation remains the same but with better error handling
export const useCreatePool = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress, sendTransaction, signTransaction } = useWallet()
	const queryClient = useQueryClient()

	return useMutation<TCreatePoolResponse, Error, TCreatePoolPayload>({
		mutationKey: [SERVICES_KEY.POOL.CREATE_POOL, ownerAddress?.toBase58()],
		mutationFn: async (payload) => {
			if (!ownerAddress) {
				throw new PoolCreationError(
					PoolCreationErrorType.WALLET_NOT_CONNECTED,
					'Wallet not connected. Please connect your wallet to create a pool.',
					undefined,
					{ feature: 'pool_creation' }
				)
			}

			if (!signTransaction) {
				throw new PoolCreationError(
					PoolCreationErrorType.WALLET_NOT_CONNECTED,
					'Wallet does not support transaction signing.',
					undefined,
					{ feature: 'transaction_signing' }
				)
			}

			console.log('🚀 Starting BBAChain Liquidity Pool creation process...')
			
			// Check for native BBA involvement
			const isNativeBBAPoolDetected = isNativeBBAPool(payload.baseToken.address, payload.quoteToken.address)
			const hasNativeBBA = isNativeBBA(payload.baseToken.address) || isNativeBBA(payload.quoteToken.address)
			
			console.log('📊 Pool Configuration:', {
				baseToken: `${payload.baseToken.symbol} (${payload.baseToken.address})`,
				quoteToken: `${payload.quoteToken.symbol} (${payload.quoteToken.address})`,
				feeTier: `${payload.feeTier}%`,
				initialPrice: `${payload.initialPrice} ${payload.baseToken.symbol} per ${payload.quoteToken.symbol}`,
				baseAmount: `${payload.baseTokenAmount} ${payload.baseToken.symbol}`,
				quoteAmount: `${payload.quoteTokenAmount} ${payload.quoteToken.symbol}`,
				programId: TOKEN_SWAP_PROGRAM_ID.toBase58(),
				isNativeBBAPool: isNativeBBAPoolDetected,
				hasNativeBBA: hasNativeBBA,
				nativeBBAToken: hasNativeBBA ? (isNativeBBA(payload.baseToken.address) ? 'base' : 'quote') : 'none'
			})

			try {
				// Validate pool creation requirements
				console.log('🔍 Validating pool creation requirements...')

				// Enhanced input validation
				if (payload.baseToken.address === payload.quoteToken.address) {
					throw new PoolCreationError(
						PoolCreationErrorType.INVALID_TOKENS,
						'Base and quote tokens must be different',
						undefined,
						{ baseToken: payload.baseToken.address, quoteToken: payload.quoteToken.address }
					)
				}

				const baseAmount = parseFloat(payload.baseTokenAmount)
				const quoteAmount = parseFloat(payload.quoteTokenAmount)
				const initialPrice = parseFloat(payload.initialPrice)

				if (isNaN(baseAmount) || baseAmount <= 0) {
					throw new PoolCreationError(
						PoolCreationErrorType.INVALID_TOKENS,
						'Base token amount must be a positive number',
						undefined,
						{ baseTokenAmount: payload.baseTokenAmount }
					)
				}

				if (isNaN(quoteAmount) || quoteAmount <= 0) {
					throw new PoolCreationError(
						PoolCreationErrorType.INVALID_TOKENS,
						'Quote token amount must be a positive number',
						undefined,
						{ quoteTokenAmount: payload.quoteTokenAmount }
					)
				}

				if (isNaN(initialPrice) || initialPrice <= 0) {
					throw new PoolCreationError(
						PoolCreationErrorType.INVALID_TOKENS,
						'Initial price must be a positive number',
						undefined,
						{ initialPrice: payload.initialPrice }
					)
				}

				console.log('✅ Pool validation passed')

				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const latestBlockhash = await connection.getLatestBlockhash('confirmed')
				const baseMint = new PublicKey(payload.baseToken.address)
				const quoteMint = new PublicKey(payload.quoteToken.address)

				console.log('🔑 Token mint addresses:', {
					baseMint: baseMint.toBase58(),
					quoteMint: quoteMint.toBase58()
				})

				const tokenSwap = Keypair.generate()
				const [authority, bumpSeed] = PublicKey.findProgramAddressSync(
					[tokenSwap.publicKey.toBuffer()],
					TOKEN_SWAP_PROGRAM_ID
				)

				console.log('🔑 Authority Derivation:', {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					authority: authority.toBase58(),
					bumpSeed,
					programId: TOKEN_SWAP_PROGRAM_ID.toBase58()
				})

				console.log('authority ', authority.toBase58())

				// Create swap's token A account (owned by authority)
				const swapTokenAAccount = await getAssociatedTokenAddress(baseMint, authority, true)
				console.log('🏦 Swap Token A Account:', swapTokenAAccount.toBase58())
				const baseTokenInfo = await connection.getAccountInfo(swapTokenAAccount)

				if (!baseTokenInfo) {
					console.log('📝 Creating swap token A account...')
					const ix = createAssociatedTokenAccountInstruction(ownerAddress, swapTokenAAccount, authority, baseMint)
					const tx = new Transaction().add(ix)
					const sig = await sendTransaction(tx, connection)
					await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')
					console.log('✅ Swap Token A account created:', sig)
				}

				// Create swap's token B account (owned by authority)
				const swapTokenBAccount = await getAssociatedTokenAddress(quoteMint, authority, true)
				console.log('🏦 Swap Token B Account:', swapTokenBAccount.toBase58())
				const quoteTokenInfo = await connection.getAccountInfo(swapTokenBAccount)
				if (!quoteTokenInfo) {
					console.log('📝 Creating swap token B account...')
					const ix = createAssociatedTokenAccountInstruction(ownerAddress, swapTokenBAccount, authority, quoteMint)
					const tx = new Transaction().add(ix)
					const sig = await sendTransaction(tx, connection)
					await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')
					console.log('✅ Swap Token B account created:', sig)
				}

				// === Create LP token mint ===
				console.log('🏭 Creating LP token mint...')
				const poolMint = Keypair.generate()

				console.log('🔑 Generated LP token mint:', poolMint.publicKey.toBase58())

				// Step 1: Create mint account (only requires poolMint signature)
				const createMintIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: poolMint.publicKey,
					space: MINT_SIZE,
					daltons,
					programId: TOKEN_PROGRAM_ID
				})

				// Step 2: Initialize mint with TEMPORARY authority (owner), will transfer later
				const initMintIx = createInitializeMintInstruction(poolMint.publicKey, 2, ownerAddress, null)

				// Step 3: Create user's LP token account
				const poolTokenAccount = await getAssociatedTokenAddress(poolMint.publicKey, ownerAddress)
				const ataIx = createAssociatedTokenAccountInstruction(
					ownerAddress,
					poolTokenAccount,
					ownerAddress,
					poolMint.publicKey
				)

				// Create transaction using sendTransaction with signers (BBA wallet compatible approach)
				console.log('📝 Creating LP mint transaction with temporary authority...')
				const createPoolTx = new Transaction().add(createMintIx, initMintIx, ataIx)

				// Enhanced LP mint creation with retry logic
				try {
					const poolSig = await executeTransactionWithRetry(
						connection,
						createPoolTx,
						(tx: Transaction, conn: Connection) => sendTransaction(tx, conn, {
							signers: [poolMint],
							skipPreflight: false,
							preflightCommitment: 'confirmed'
						}),
						'LP mint creation'
					)
					console.log('✅ LP token mint created successfully:', poolSig)
				} catch (error) {
					throw new PoolCreationError(
						PoolCreationErrorType.ACCOUNT_CREATION_FAILED,
						'Failed to create LP token mint',
						error as Error,
						{ poolMint: poolMint.publicKey.toBase58() }
					)
				}

				// === CRITICAL: Transfer Pool Mint Authority to Swap Authority ===
				console.log('🔄 Transferring pool mint authority to swap authority...')
				const { createSetAuthorityInstruction, AuthorityType } = await import('@bbachain/spl-token')

				const setAuthorityIx = createSetAuthorityInstruction(
					poolMint.publicKey,
					ownerAddress, // Current authority
					AuthorityType.MintTokens,
					authority // New authority (swap authority)
				)

				// Enhanced authority transfer with retry logic
				try {
					const transferSig = await executeTransactionWithRetry(
						connection,
						new Transaction().add(setAuthorityIx),
						sendTransaction,
						'Pool mint authority transfer'
					)
					console.log('✅ Pool mint authority transferred to swap authority:', transferSig)
				} catch (error) {
					throw new PoolCreationError(
						PoolCreationErrorType.AUTHORITY_TRANSFER_FAILED,
						'Failed to transfer pool mint authority to swap authority',
						error as Error,
						{ 
							poolMint: poolMint.publicKey.toBase58(),
							swapAuthority: authority.toBase58()
						}
					)
				}

				// === Enhanced Fee Configuration ===
				const feeTierMap: Record<string, { numerator: number; denominator: number }> = {
					'0.01': { numerator: 1, denominator: 10000 }, // 0.01%
					'0.05': { numerator: 5, denominator: 10000 }, // 0.05%
					'0.1': { numerator: 1, denominator: 1000 }, // 0.1%
					'0.25': { numerator: 25, denominator: 10000 }, // 0.25%
					'0.3': { numerator: 3, denominator: 1000 }, // 0.3%
					'1': { numerator: 1, denominator: 100 } // 1%
				}
				const feeConfig = feeTierMap[payload.feeTier]
				if (!feeConfig) {
					throw new Error(
						`Invalid fee tier: ${payload.feeTier}%. Supported tiers: ${Object.keys(feeTierMap).join(', ')}%`
					)
				}

				console.log('💰 Pool fee configuration:', {
					tier: `${payload.feeTier}%`,
					numerator: feeConfig.numerator,
					denominator: feeConfig.denominator
				})

				console.log('token swap ', tokenSwap.publicKey.toBase58())
				console.log('authority ', authority.toBase58())
				console.log('token A ', swapTokenAAccount.toBase58())
				console.log('token B ', swapTokenBAccount.toBase58())
				console.log('Pool mint ', poolMint.publicKey.toBase58())
				console.log('Token program id ', TOKEN_PROGRAM_ID.toBase58())

				const feeAccount = await getAssociatedTokenAddress(poolMint.publicKey, ownerAddress)
				const feeInfo = await connection.getAccountInfo(feeAccount)
				if (!feeInfo) {
					const feeIx = createAssociatedTokenAccountInstruction(
						ownerAddress,
						feeAccount,
						ownerAddress,
						poolMint.publicKey
					)
					const tx = new Transaction().add(feeIx)
					const sig = await sendTransaction(tx, connection)
					await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')
					console.log('✅ Fee account created:', sig)
				}

				// Verify all accounts exist before initialization
				console.log('🔍 Verifying all required accounts exist...')
				const [baseInfo, quoteInfo, poolInfo, feeUpdatedInfo] = await Promise.all([
					connection.getAccountInfo(swapTokenAAccount),
					connection.getAccountInfo(swapTokenBAccount),
					connection.getAccountInfo(poolMint.publicKey),
					connection.getAccountInfo(feeAccount)
				])

				console.log('📋 Account Verification:', {
					swapTokenAAccount: !!baseInfo,
					swapTokenBAccount: !!quoteInfo,
					poolMint: !!poolInfo,
					feeAccount: !!feeUpdatedInfo,
					allExist: !!(baseInfo && quoteInfo && poolInfo && feeUpdatedInfo)
				})

				if (!baseInfo || !quoteInfo || !poolInfo || !feeUpdatedInfo) {
					throw new Error('Some required accounts do not exist. Cannot proceed with pool initialization.')
				}

				// === CRITICAL: Deposit Initial Liquidity ===
				console.log('💰 Adding initial liquidity to pool token accounts...')

				// Convert amounts to proper decimals using actual token decimals
				const liquidityBaseAmount = parseFloat(payload.baseTokenAmount)
				const liquidityInitialPrice = parseFloat(payload.initialPrice)
				const liquidityQuoteAmount = liquidityBaseAmount / liquidityInitialPrice

				const baseAmountDaltons = formatTokenToDaltons(liquidityBaseAmount, payload.baseToken.decimals)
				const quoteAmountDaltons = formatTokenToDaltons(liquidityQuoteAmount, payload.quoteToken.decimals)

				console.log('💰 Initial Liquidity Amounts:', {
					baseAmount: payload.baseTokenAmount,
					calculatedQuoteAmount: liquidityQuoteAmount,
					initialPrice: liquidityInitialPrice,
					baseAmountDaltons,
					quoteAmountDaltons,
					baseDecimals: payload.baseToken.decimals,
					quoteDecimals: payload.quoteToken.decimals,
					swapTokenAAccount: swapTokenAAccount.toBase58(),
					swapTokenBAccount: swapTokenBAccount.toBase58(),
					isNativeBBAPool: isNativeBBAPoolDetected
				})

				// Enhanced balance validation with native BBA support
				await validateUserBalances(
					connection,
					ownerAddress,
					payload,
					baseAmountDaltons,
					quoteAmountDaltons
				)

				// Get user token accounts for transfer operations
				const userBaseTokenAccount = await getAssociatedTokenAddress(baseMint, ownerAddress)
				const userQuoteTokenAccount = await getAssociatedTokenAddress(quoteMint, ownerAddress)

				// Enhanced transfer with native BBA support
				const { createTransferInstruction, createSyncNativeInstruction } = await import('@bbachain/spl-token')
				const transferInstructions = []

				// Handle base token transfer (could be native BBA)
				if (isNativeBBA(payload.baseToken.address)) {
					console.log('🔄 Handling native BBA for base token...')
					
					// For native BBA, transfer daltons directly to the WBBA account and sync
					const transferBBAIx = SystemProgram.transfer({
						fromPubkey: ownerAddress,
						toPubkey: swapTokenAAccount,
						daltons: baseAmountDaltons
					})
					
					const syncBBAIx = createSyncNativeInstruction(swapTokenAAccount)
					
					transferInstructions.push(transferBBAIx, syncBBAIx)
					console.log(`✅ Native BBA transfer prepared: ${liquidityBaseAmount} BBA`)
				} else {
					// Regular SPL token transfer
					const transferBaseIx = createTransferInstruction(
						userBaseTokenAccount,
						swapTokenAAccount,
						ownerAddress,
						baseAmountDaltons
					)
					transferInstructions.push(transferBaseIx)
					console.log(`✅ SPL token transfer prepared: ${liquidityBaseAmount} ${payload.baseToken.symbol}`)
				}

				// Handle quote token transfer (could be native BBA)
				if (isNativeBBA(payload.quoteToken.address)) {
					console.log('🔄 Handling native BBA for quote token...')
					
					// For native BBA, transfer daltons directly to the WBBA account and sync
					const transferBBAIx = SystemProgram.transfer({
						fromPubkey: ownerAddress,
						toPubkey: swapTokenBAccount,
						daltons: quoteAmountDaltons
					})
					
					const syncBBAIx = createSyncNativeInstruction(swapTokenBAccount)
					
					transferInstructions.push(transferBBAIx, syncBBAIx)
					console.log(`✅ Native BBA transfer prepared: ${liquidityQuoteAmount} BBA`)
				} else {
					// Regular SPL token transfer
					const transferQuoteIx = createTransferInstruction(
						userQuoteTokenAccount,
						swapTokenBAccount,
						ownerAddress,
						quoteAmountDaltons
					)
					transferInstructions.push(transferQuoteIx)
					console.log(`✅ SPL token transfer prepared: ${liquidityQuoteAmount} ${payload.quoteToken.symbol}`)
				}

				// Enhanced liquidity transfer with retry logic
				try {
					console.log(`📝 Sending liquidity transfer with ${transferInstructions.length} instructions...`)
					const liquiditySig = await executeTransactionWithRetry(
						connection,
						new Transaction().add(...transferInstructions),
						sendTransaction,
						'Initial liquidity transfer'
					)
					console.log('✅ Enhanced initial liquidity transferred to pool accounts:', liquiditySig)
				} catch (error) {
					throw new PoolCreationError(
						PoolCreationErrorType.LIQUIDITY_TRANSFER_FAILED,
						hasNativeBBA ? 
							'Failed to transfer initial liquidity (including native BBA)' :
							'Failed to transfer initial liquidity',
						error as Error,
						{ 
							hasNativeBBA,
							transferInstructions: transferInstructions.length,
							baseAmount: liquidityBaseAmount,
							quoteAmount: liquidityQuoteAmount
						}
					)
				}

				// === Swap Initialization ===
				const swapCurve = {
					curveType: CurveType.ConstantProduct,
					calculator: new Array(32).fill(0) // 32 bytes for curve parameters
				}

				const fees = {
					tradeFeeNumerator: new BN(feeConfig.numerator),
					tradeFeeDenominator: new BN(feeConfig.denominator),
					ownerTradeFeeNumerator: new BN(0),
					ownerTradeFeeDenominator: new BN(0),
					ownerWithdrawFeeNumerator: new BN(0),
					ownerWithdrawFeeDenominator: new BN(0),
					hostFeeNumerator: new BN(0),
					hostFeeDenominator: new BN(0)
				}

				console.log('🔧 Creating token swap instruction using @bbachain/spl-token-swap...')

				// Create the token swap initialization instruction with all required accounts
				console.log('🔧 Preparing swap initialization accounts...')
				console.log('📋 Account Details:', {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					authority: authority.toBase58(),
					tokenA: swapTokenAAccount.toBase58(),
					tokenB: swapTokenBAccount.toBase58(),
					poolMint: poolMint.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					destination: poolTokenAccount.toBase58(),
					tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
					// Also log the mint addresses for debugging
					mintA: baseMint.toBase58(),
					mintB: quoteMint.toBase58()
				})

				// Use library function for exact BBAChain compatibility
				console.log('🔧 Using @bbachain/spl-token-swap createInitializeInstruction...')

				const swapIx = createInitializeInstruction(
					{
						tokenSwap: tokenSwap.publicKey,
						authority: authority,
						tokenA: swapTokenAAccount,
						tokenB: swapTokenBAccount,
						poolMint: poolMint.publicKey,
						feeAccount,
						destination: poolTokenAccount,
						tokenProgram: TOKEN_PROGRAM_ID
					},
					{
						fees,
						swapCurve
					}
				)

				console.log('📋 Library Instruction Analysis:', {
					programId: swapIx.programId.toBase58(),
					dataLength: swapIx.data.length,
					accountCount: swapIx.keys.length,
					firstDataBytes: Array.from(swapIx.data.slice(0, 10))
						.map((b) => `0x${b.toString(16).padStart(2, '0')}`)
						.join(' '),
					fees: {
						tradeFeeNum: fees.tradeFeeNumerator.toString(),
						tradeFeeDenom: fees.tradeFeeDenominator.toString()
					},
					bumpSeed: bumpSeed,
					// Complete instruction data dump for analysis
					completeDataHex: Array.from(swapIx.data)
						.map((b) => `0x${b.toString(16).padStart(2, '0')}`)
						.join(' ')
				})

				console.log('🔍 Library-Generated Account List:', {
					accountCount: swapIx.keys.length,
					accounts: swapIx.keys.map(
						(key, index) => `${index}. ${key.pubkey.toBase58()} (signer: ${key.isSigner}, writable: ${key.isWritable})`
					)
				})

				console.log('✅ Token swap instruction created successfully')
				console.log('📋 Swap Instruction Details:', {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					authority: authority.toBase58(),
					tokenA: swapTokenAAccount.toBase58(),
					tokenB: swapTokenBAccount.toBase58(),
					poolMint: poolMint.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					destination: poolTokenAccount.toBase58(),
					curveType: 'ConstantProduct',
					tradeFee: `${feeConfig.numerator}/${feeConfig.denominator}`
				})

				// Log the instruction keys for debugging
				console.log(
					'🔍 Instruction accounts:',
					swapIx.keys.map((key, index) => ({
						index,
						pubkey: key.pubkey.toBase58(),
						isSigner: key.isSigner,
						isWritable: key.isWritable
					}))
				)

				// === Create TokenSwap Account + Initialize in Single Transaction ===
				console.log('🏗️ Creating TokenSwap account and initializing...')
				// Import TokenSwapLayout to get exact span
				const { TokenSwapLayout } = await import('./onchain')
				const tokenSwapAccountSize = TokenSwapLayout.span // Use exact layout span instead of hardcoded 324
				console.log('📏 TokenSwap account size from layout:', tokenSwapAccountSize)
				const swapAccountDaltons = await connection.getMinimumBalanceForRentExemption(tokenSwapAccountSize)

				const createSwapAccountIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: tokenSwap.publicKey,
					space: tokenSwapAccountSize,
					daltons: swapAccountDaltons,
					programId: TOKEN_SWAP_PROGRAM_ID
				})

				console.log('📋 Transaction Instructions:', {
					createAccount: 'Create TokenSwap account',
					initialize: 'Initialize TokenSwap',
					totalInstructions: 2
				})

				// === Single Transaction Approach (Matching Working Test) ===
				console.log('🏗️ Creating single transaction with create + initialize...')
				const finalTx = new Transaction().add(createSwapAccountIx, swapIx)

				// Set recent blockhash and fee payer
				finalTx.recentBlockhash = latestBlockhash.blockhash
				finalTx.feePayer = ownerAddress

				console.log('📋 Final Transaction Analysis:', {
					instructionCount: finalTx.instructions.length,
					estimatedFee: 'Will be calculated by wallet',
					signers: [ownerAddress.toBase58(), tokenSwap.publicKey.toBase58()],
					recentBlockhash: latestBlockhash.blockhash.slice(0, 8) + '...'
				})

				// Enhanced pool initialization with retry logic
				try {
					console.log('📝 Sending final pool initialization transaction...')
					const finalSig = await executeTransactionWithRetry(
						connection,
						finalTx,
						(tx: Transaction, conn: Connection) => sendTransaction(tx, conn, {
							signers: [tokenSwap],
							skipPreflight: false,
							preflightCommitment: 'confirmed'
						}),
						'Pool initialization'
					)

					console.log('✅ TokenSwap created and initialized successfully!')
					console.log('🎉 Pool creation completed successfully!')
								} catch (error) {
					throw new PoolCreationError(
						PoolCreationErrorType.POOL_INITIALIZATION_FAILED,
						'Failed to initialize liquidity pool',
						error as Error,
						{ 
							tokenSwapAccount: tokenSwap.publicKey.toBase58(),
							swapAuthority: authority.toBase58(),
							hasNativeBBA,
							isNativeBBAPool: isNativeBBAPoolDetected
						}
					)
				}

				// Return data in the expected format with enhanced info
				return {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					poolMint: poolMint.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					lpTokenAccount: poolTokenAccount.toBase58(),
					signature: 'Pool created successfully',
					message: hasNativeBBA ? 
						'Pool created successfully with native BBA support! 🔄' : 
						'Pool created successfully!',
					isNativeBBAPool: isNativeBBAPoolDetected,
					hasNativeBBA: hasNativeBBA,
					poolDetails: {
						baseToken: `${payload.baseToken.symbol} (${isNativeBBA(payload.baseToken.address) ? 'Native BBA' : 'SPL Token'})`,
						quoteToken: `${payload.quoteToken.symbol} (${isNativeBBA(payload.quoteToken.address) ? 'Native BBA' : 'SPL Token'})`,
						feeTier: `${payload.feeTier}%`,
						swapAuthority: authority.toBase58(),
						tokenAVault: swapTokenAAccount.toBase58(),
						tokenBVault: swapTokenBAccount.toBase58()
					}
				}
			} catch (error) {
				console.error('❌ Pool creation failed:', error)
				
				// Re-throw PoolCreationError as-is, wrap others
				if (error instanceof PoolCreationError) {
					throw error
				}
				
				// Wrap unknown errors
				throw new PoolCreationError(
					PoolCreationErrorType.UNKNOWN_ERROR,
					'An unexpected error occurred during pool creation',
					error as Error,
					{ 
						baseToken: payload.baseToken.symbol,
						quoteToken: payload.quoteToken.symbol,
						hasNativeBBA,
						isNativeBBAPool: isNativeBBAPoolDetected
					}
				)
			}
		},
		onSuccess: (result) => {
			console.log('✅ Pool creation successful')
			// Invalidate pools cache to refresh the list
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOLS] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOL_STATS] })
		},
		onError: (error) => {
			console.error('❌ Pool creation failed:', error)
		}
	})
}
