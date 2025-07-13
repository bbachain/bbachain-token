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
import { Keypair, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import BN from 'bn.js'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'

import { getAllPoolsFromOnchain, OnchainPoolData } from './onchain'
import { PoolData, TCreatePoolPayload, TCreatePoolResponse, TGetPoolDetailResponse, TGetPoolsResponse } from './types'

// Enhanced retry configuration
const RETRY_CONFIG = {
	attempts: 3,
	delay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
	retryCondition: (error: any) => {
		// Retry on network errors, timeouts, and 5xx errors
		return !error.response || error.response.status >= 500 || error.code === 'NETWORK_ERROR'
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
				throw new Error('Wallet not connected. Please connect your wallet to create a pool.')
			}

			if (!signTransaction) {
				throw new Error('Wallet does not support transaction signing.')
			}

			console.log('🚀 Starting BBAChain Liquidity Pool creation process...')
			console.log('📊 Pool Configuration:', {
				baseToken: `${payload.baseToken.symbol} (${payload.baseToken.address})`,
				quoteToken: `${payload.quoteToken.symbol} (${payload.quoteToken.address})`,
				feeTier: `${payload.feeTier}%`,
				initialPrice: `${payload.initialPrice} ${payload.baseToken.symbol} per ${payload.quoteToken.symbol}`,
				baseAmount: `${payload.baseTokenAmount} ${payload.baseToken.symbol}`,
				quoteAmount: `${payload.quoteTokenAmount} ${payload.quoteToken.symbol}`,
				programId: TOKEN_SWAP_PROGRAM_ID.toBase58()
			})

			try {
				// Validate pool creation requirements
				console.log('🔍 Validating pool creation requirements...')

				// Check if tokens are different
				if (payload.baseToken.address === payload.quoteToken.address) {
					throw new Error('Base and quote tokens must be different')
				}

				// Check if amounts are valid
				const baseAmount = parseFloat(payload.baseTokenAmount)
				const quoteAmount = parseFloat(payload.quoteTokenAmount)

				if (baseAmount <= 0 || quoteAmount <= 0) {
					throw new Error('Token amounts must be greater than zero')
				}

				// Check if initial price is valid
				const initialPrice = parseFloat(payload.initialPrice)
				if (initialPrice <= 0) {
					throw new Error('Initial price must be greater than zero')
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

				// Use sendTransaction which can handle additional signers
				const poolSig = await sendTransaction(createPoolTx, connection, {
					signers: [poolMint], // Pass poolMint as additional signer
					skipPreflight: false,
					preflightCommitment: 'confirmed'
				})

				console.log('⏳ LP mint transaction sent:', poolSig)

				await connection.confirmTransaction({ signature: poolSig, ...latestBlockhash }, 'confirmed')
				console.log('✅ LP token mint created successfully')

				// === CRITICAL: Transfer Pool Mint Authority to Swap Authority ===
				console.log('🔄 Transferring pool mint authority to swap authority...')
				const { createSetAuthorityInstruction, AuthorityType } = await import('@bbachain/spl-token')

				const setAuthorityIx = createSetAuthorityInstruction(
					poolMint.publicKey,
					ownerAddress, // Current authority
					AuthorityType.MintTokens,
					authority // New authority (swap authority)
				)

				const transferAuthorityTx = new Transaction().add(setAuthorityIx)
				const transferSig = await sendTransaction(transferAuthorityTx, connection)
				await connection.confirmTransaction({ signature: transferSig, ...latestBlockhash }, 'confirmed')
				console.log('✅ Pool mint authority transferred to swap authority:', transferSig)

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

				// Convert amounts to proper decimals (assuming 6 decimals for both tokens)
				// Calculate quote amount from initial price: baseAmount / initialPrice
				const liquidityBaseAmount = parseFloat(payload.baseTokenAmount)
				const liquidityInitialPrice = parseFloat(payload.initialPrice) // SHIB per USDT
				const liquidityQuoteAmount = liquidityBaseAmount / liquidityInitialPrice // USDT amount

				const baseAmountLamports = Math.floor(liquidityBaseAmount * Math.pow(10, 6))
				const quoteAmountLamports = Math.floor(liquidityQuoteAmount * Math.pow(10, 6))

				console.log('💰 Initial Liquidity Amounts:', {
					baseAmount: payload.baseTokenAmount,
					calculatedQuoteAmount: liquidityQuoteAmount,
					initialPrice: liquidityInitialPrice,
					baseAmountLamports,
					quoteAmountLamports,
					swapTokenAAccount: swapTokenAAccount.toBase58(),
					swapTokenBAccount: swapTokenBAccount.toBase58()
				})

				// === BETTER APPROACH: Mint directly to pool accounts (like working test) ===
				const { mintTo } = await import('@bbachain/spl-token')

				// First verify we have enough user balance
				const userBaseTokenAccount = await getAssociatedTokenAddress(baseMint, ownerAddress)
				const userQuoteTokenAccount = await getAssociatedTokenAddress(quoteMint, ownerAddress)

				// Check user balances
				const [userBaseInfo, userQuoteInfo] = await Promise.all([
					connection.getAccountInfo(userBaseTokenAccount),
					connection.getAccountInfo(userQuoteTokenAccount)
				])

				if (!userBaseInfo || !userQuoteInfo) {
					throw new Error('User token accounts not found. Please ensure you have the required tokens.')
				}

				// Parse user balances
				const userBaseBalance = new BN(userBaseInfo.data.slice(64, 72), 'le')
				const userQuoteBalance = new BN(userQuoteInfo.data.slice(64, 72), 'le')

				console.log('👤 User Token Balances:', {
					baseBalance: userBaseBalance.toString(),
					quoteBalance: userQuoteBalance.toString(),
					baseBalanceFormatted: userBaseBalance.div(new BN(1000000)).toString() + ` ${payload.baseToken.symbol}`,
					quoteBalanceFormatted: userQuoteBalance.div(new BN(1000000)).toString() + ` ${payload.quoteToken.symbol}`,
					requiredBase: baseAmountLamports,
					requiredQuote: quoteAmountLamports
				})

				// Verify sufficient balance
				if (userBaseBalance.lt(new BN(baseAmountLamports))) {
					throw new Error(
						`Insufficient ${payload.baseToken.symbol} balance. Required: ${liquidityBaseAmount}, Available: ${userBaseBalance.div(new BN(1000000)).toString()}`
					)
				}

				if (userQuoteBalance.lt(new BN(quoteAmountLamports))) {
					throw new Error(
						`Insufficient ${payload.quoteToken.symbol} balance. Required: ${liquidityQuoteAmount}, Available: ${userQuoteBalance.div(new BN(1000000)).toString()}`
					)
				}

				// Transfer from user to pool accounts
				const { createTransferInstruction } = await import('@bbachain/spl-token')

				const transferBaseIx = createTransferInstruction(
					userBaseTokenAccount,
					swapTokenAAccount,
					ownerAddress,
					baseAmountLamports
				)

				const transferQuoteIx = createTransferInstruction(
					userQuoteTokenAccount,
					swapTokenBAccount,
					ownerAddress,
					quoteAmountLamports
				)

				// Send initial liquidity transfer
				const liquidityTx = new Transaction().add(transferBaseIx, transferQuoteIx)
				const liquiditySig = await sendTransaction(liquidityTx, connection)
				await connection.confirmTransaction({ signature: liquiditySig, ...latestBlockhash }, 'confirmed')
				console.log('✅ Initial liquidity transferred to pool accounts:', liquiditySig)

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

				// === IMPORTANT: Use sendTransaction with additional signers ===
				console.log('📝 Sending final transaction with BBA wallet...')
				const finalSig = await sendTransaction(finalTx, connection, {
					signers: [tokenSwap], // Additional signer required
					skipPreflight: false,
					preflightCommitment: 'confirmed'
				})

				console.log('⏳ Final transaction sent:', finalSig)

				// Wait for confirmation
				const confirmation = await connection.confirmTransaction(
					{ signature: finalSig, ...latestBlockhash },
					'confirmed'
				)

				if (confirmation.value.err) {
					throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
				}

				console.log('✅ TokenSwap created and initialized successfully!')
				console.log('🎉 Pool creation completed successfully!')

				// Return data in the expected format
				return {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					poolMint: poolMint.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					lpTokenAccount: poolTokenAccount.toBase58(),
					signature: finalSig,
					message: 'Pool created successfully!'
				}
			} catch (error) {
				console.error('❌ Pool creation failed:', error)
				throw error
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
