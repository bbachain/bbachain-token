import {
	TOKEN_PROGRAM_ID,
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	createInitializeMintInstruction,
	getMint,
	NATIVE_MINT,
	createSyncNativeInstruction
} from '@bbachain/spl-token'
import {
	CurveType,
	createInitializeInstruction,
	PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID,
	createDepositAllTokenTypesInstruction,
	TokenSwap
} from '@bbachain/spl-token-swap'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import BN from 'bn.js'
import moment from 'moment'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'
import type {
	TCreatePoolData,
	TCreatePoolPayload,
	TCreatePoolResponse,
	TDepositToPoolPayload,
	TDepositToPoolResponse,
	TFormattedTransactionData,
	TGetPoolByIdResponse,
	TGetPoolsResponse,
	TGetPoolStatsResponse,
	TGetPoolTransactionResponse,
	TGetUserPoolStatsResponse,
	TOnchainPoolData,
	TransactionData,
	TUserPoolStatsData
} from '@/features/liquidityPool/types'
import {
	calculatePoolMetrics,
	calculateTVL,
	classifyType,
	getPoolAccounts,
	getSignerWallet,
	getTotalLPSupply,
	getTransactionDelta,
	getUserLPTokens,
	processPoolAccount,
	isBBAPool,
	getBBAPositionInPool
} from '@/features/liquidityPool/utils'
import { useGetAllTokenPrices } from '@/features/tokens/services'
import {
	formatTokenToDaltons,
	getBBAFromDaltons,
	getDaltonsFromBBA,
	isNativeBBA,
	formatTokenBalance
} from '@/lib/token'
import { confirmTransactionWithTimeout, sendTransactionWithRetry } from '@/lib/wallet'
import { TSuccessMessage } from '@/types'

export const useGetPools = () => {
	const { connection } = useConnection()
	const getAllTokenPrices = useGetAllTokenPrices()
	const allTokenPrices = getAllTokenPrices.data
	const getPoolsWithPrices = useQuery<TGetPoolsResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_POOLS, allTokenPrices],
		queryFn: async () => {
			const poolAccounts = await getPoolAccounts(connection)
			const batchSize = 10
			const pools = []

			for (let i = 0; i < poolAccounts.length; i += batchSize) {
				const batch = poolAccounts.slice(i, i + batchSize)
				const batchResults = await Promise.all(
					batch.map(({ pubkey, account }) => processPoolAccount(connection, pubkey, account.data))
				)
				pools.push(...(batchResults.filter(Boolean) as TOnchainPoolData[]))
			}

			const poolsWithPrices = await Promise.all(
				pools.map(async (pool) => {
					const mintAPrice = allTokenPrices ? allTokenPrices[pool.mintA.symbol] : 0
					const mintBPrice = allTokenPrices ? allTokenPrices[pool.mintB.symbol] : 0

					const tvl = calculateTVL(
						pool.reserveA,
						pool.reserveB,
						pool.mintA,
						pool.mintB,
						mintAPrice,
						mintBPrice
					)
					const metrics = calculatePoolMetrics(tvl, pool.feeRate)

					return { ...pool, mintAPrice, mintBPrice, tvl, ...metrics } satisfies TOnchainPoolData
				})
			)
			return { message: 'Successfully get pools data', data: poolsWithPrices }
		},
		enabled: !!allTokenPrices,
		refetchInterval: 300000,
		staleTime: 60000
	})

	return {
		...getPoolsWithPrices,
		isLoading: getAllTokenPrices.isLoading || getPoolsWithPrices.isLoading
	}
}

export const useGetPoolById = ({ poolId }: { poolId: string }) => {
	const { connection } = useConnection()
	const getAllTokenPrices = useGetAllTokenPrices()
	const allTokenPrices = getAllTokenPrices.data

	const getPoolWithPricesQuery = useQuery<TGetPoolByIdResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_POOL_BY_ID, poolId, allTokenPrices],
		queryFn: async () => {
			const pubKey = new PublicKey(poolId)
			const accountInfo = await connection.getAccountInfo(pubKey)
			if (!accountInfo) return { message: 'Pool no found', data: null }

			const pool = await processPoolAccount(connection, pubKey, accountInfo.data)
			if (!pool) return { message: 'Pool no found', data: null }

			const mintAPrice = allTokenPrices ? allTokenPrices[pool.mintA.symbol] : 0
			const mintBPrice = allTokenPrices ? allTokenPrices[pool.mintB.symbol] : 0

			const tvl = calculateTVL(
				pool.reserveA,
				pool.reserveB,
				pool.mintA,
				pool.mintB,
				mintAPrice,
				mintBPrice
			)
			const metrics = calculatePoolMetrics(tvl, pool.feeRate)

			const data: TOnchainPoolData = { ...pool, mintAPrice, mintBPrice, tvl, ...metrics }

			return { message: `Successfully get pool data by id ${data.address}`, data }
		},
		enabled: !!allTokenPrices,
		refetchInterval: 300000,
		staleTime: 60000
	})

	return {
		...getPoolWithPricesQuery,
		isLoading: getAllTokenPrices.isLoading || getPoolWithPricesQuery.isLoading
	}
}

// Enhanced pool statistics hook
export const useGetPoolStats = ({ pools }: { pools: TOnchainPoolData[] | undefined }) => {
	return useQuery<TGetPoolStatsResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_POOL_STATS, pools],
		queryFn: () => {
			if (!pools) return { message: 'No pool stats', data: null }
			const totalLiquidity = pools.reduce((sum, pool) => sum + pool.tvl, 0)
			const totalVolume = pools.reduce((sum, pool) => sum + pool.volume24h, 0)
			const totalFees = pools.reduce((sum, pool) => sum + pool.fees24h, 0)
			const averageAPR =
				pools.length > 0 ? pools.reduce((sum, pool) => sum + pool.apr24h, 0) / pools.length : 0

			const topPoolsByLiquidity = [...pools].sort((a, b) => b.tvl - a.tvl).slice(0, 10)
			const topPoolsByVolume = [...pools].sort((a, b) => b.volume24h - a.volume24h).slice(0, 10)
			const topPoolsByAPR = [...pools].sort((a, b) => b.apr24h - a.apr24h).slice(0, 10)

			const data = {
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

			return { message: 'Successfully get pool stats', data }
		},
		enabled: !!pools,
		staleTime: 60000, // 1 minute
		gcTime: 300000 // 5 minutes
	})
}

export const useGetUserPoolStats = ({ pool }: { pool: TOnchainPoolData | null | undefined }) => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress } = useWallet()

	return useQuery<TGetUserPoolStatsResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_USER_POOL_STATS, pool?.address, ownerAddress?.toBase58()],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('Wallet not connected.')
			if (!pool) return { message: 'No user pool stats found', data: null }

			const lpMint = new PublicKey(pool.address)
			const userLPToken = await getUserLPTokens(connection, lpMint, ownerAddress)
			const totalLpTokens = await getTotalLPSupply(connection, lpMint)

			const userShare = userLPToken / totalLpTokens

			// coverts daltos units
			const reserveA = formatTokenBalance(Number(pool.reserveA), pool.mintA.decimals)
			const reserveB = formatTokenBalance(Number(pool.reserveB), pool.mintB.decimals)

			// value of how much user's reserves in this pool
			const userReserveA = userShare * reserveA
			const userReserveB = userShare * reserveB

			const userReserveAPrice = userReserveA * pool.mintAPrice
			const userReserveBPrice = userReserveB * pool.mintBPrice
			const userReserveTotalPrice = userReserveAPrice + userReserveBPrice

			// value of daily fees that user gets
			const totalDailyFees = pool.volume24h * pool.feeRate
			const dailyFeeEarnings = totalDailyFees * userShare

			const data = {
				userShare,
				userLPToken,
				userReserveA,
				userReserveB,
				userReserveTotalPrice,
				dailyFeeEarnings
			} satisfies TUserPoolStatsData

			return {
				message: `Successfully get user pool stats with pool id ${pool.address} and owner address ${ownerAddress}`,
				data
			}
		},
		enabled: !!pool,
		refetchInterval: 300000,
		staleTime: 60000
	})
}

// Background sync for real-time updates
export const usePoolsBackgroundSync = () => {
	const { connection } = useConnection()
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: [SERVICES_KEY.POOL.GET_POOLS_SYNC, connection.rpcEndpoint],
		queryFn: async () => {
			try {
				const poolAccounts = await getPoolAccounts(connection)
				const batchSize = 10
				const pools = []

				for (let i = 0; i < poolAccounts.length; i += batchSize) {
					const batch = poolAccounts.slice(i, i + batchSize)
					const batchResults = await Promise.all(
						batch.map(({ pubkey, account }) => processPoolAccount(connection, pubkey, account.data))
					)
					pools.push(...(batchResults.filter(Boolean) as TOnchainPoolData[]))
				}

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

export const useGetTransactionsByPoolId = ({
	pool
}: {
	pool: TOnchainPoolData | null | undefined
}) =>
	useQuery<TGetPoolTransactionResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_TRANSACTIONS_BY_POOL_ID, pool?.address],
		queryFn: async () => {
			if (!pool) return { message: 'No pool transactions found', data: [] }
			try {
				const { data } = await axios.get(`${ENDPOINTS.BBASCAN.GET_DATA_BY_ADDRESS}/${pool.address}`)
				const transactionData = data.transactions as TransactionData[]

				const responseData = transactionData
					.map((tx) => {
						const wallet = getSignerWallet(tx)
						if (!wallet) return null

						const mintAPreBalances = isNativeBBA(pool.mintA.address)
							? tx.meta.preBalances
							: tx.meta.preTokenBalances
						const mintAPostBalances = isNativeBBA(pool.mintA.address)
							? tx.meta.postBalances
							: tx.meta.postTokenBalances

						const mintBPreBalances = isNativeBBA(pool.mintB.address)
							? tx.meta.preBalances
							: tx.meta.preTokenBalances
						const mintBPostBalances = isNativeBBA(pool.mintB.address)
							? tx.meta.postBalances
							: tx.meta.postTokenBalances

						const mintADelta = getTransactionDelta(
							mintAPreBalances,
							mintAPostBalances,
							pool.mintA,
							wallet
						)
						const mintBDelta = getTransactionDelta(
							mintBPreBalances,
							mintBPostBalances,
							pool.mintB,
							wallet
						)
						const type = classifyType(mintADelta, mintBDelta)

						const mintAAmount = Math.abs(mintADelta)
						const mintBAmount = Math.abs(mintBDelta)

						const mintAAmountPrice = mintAAmount * pool.mintAPrice
						const mintBAmountPrice = mintBAmount * pool.mintBPrice

						return {
							ownerAddress: wallet,
							time: moment.unix(tx.blockTime).fromNow(),
							transactionType: type,
							mintA: pool.mintA,
							mintB: pool.mintB,
							mintADelta,
							mintBDelta,
							mintAAmount,
							mintBAmount,
							mintAAmountPrice,
							mintBAmountPrice
						} satisfies TFormattedTransactionData
					})
					.filter((item): item is TFormattedTransactionData => item !== null)
				return { message: 'Successfully get transaction data', data: responseData }
			} catch (e) {
				console.error('Failed to fetch transactions:', e)
				return { message: 'Failed to fetch transactions', data: [] }
			}
		},
		refetchInterval: 300000,
		staleTime: 60000
	})

export const useReversePool = () => {
	const queryClient = useQueryClient()
	const { publicKey: ownerAddress } = useWallet()
	return useMutation<TSuccessMessage, Error, TOnchainPoolData | null | undefined>({
		mutationKey: [SERVICES_KEY.POOL.ON_REVERSE_POOL],
		mutationFn: async (payload) => {
			const pool = payload
			if (!pool) throw new Error('No pool found')

			// reverse pool detail by id
			queryClient.setQueriesData<TGetPoolByIdResponse>(
				{ queryKey: [SERVICES_KEY.POOL.GET_POOL_BY_ID, pool.address] },
				(oldData) => {
					if (!oldData?.data) return oldData
					const basePool = oldData.data
					const reversedPool: TOnchainPoolData = {
						...basePool,
						mintA: basePool.mintB,
						mintB: basePool.mintA,
						mintAPrice: basePool.mintBPrice,
						mintBPrice: basePool.mintAPrice,
						reserveA: basePool.reserveB,
						reserveB: basePool.reserveA
					}

					return { ...oldData, data: reversedPool }
				}
			)

			// reverse transactions by pool id
			queryClient.setQueryData<TGetPoolTransactionResponse>(
				[SERVICES_KEY.POOL.GET_TRANSACTIONS_BY_POOL_ID, pool.address],
				(oldData) => {
					if (!oldData?.data) return oldData
					const baseTransaction = oldData.data
					const reverseBaseTransaction = baseTransaction?.map((tx) => {
						const type = classifyType(tx.mintBDelta, tx.mintADelta)
						const reversed: TFormattedTransactionData = {
							...tx,
							mintA: tx.mintB,
							mintB: tx.mintA,
							mintADelta: tx.mintBDelta,
							mintBDelta: tx.mintADelta,
							mintAAmount: tx.mintBAmount,
							mintBAmount: tx.mintAAmount,
							mintAAmountPrice: tx.mintBAmountPrice,
							mintBAmountPrice: tx.mintAAmountPrice,
							transactionType: type
						}
						return reversed
					})
					return { ...oldData, data: reverseBaseTransaction }
				}
			)

			// reverse user stats
			queryClient.setQueryData<TGetUserPoolStatsResponse>(
				[SERVICES_KEY.POOL.GET_USER_POOL_STATS, pool.address, ownerAddress?.toBase58()],
				(oldData) => {
					if (!oldData?.data) return oldData
					const baseUserStats = oldData.data

					const reversedUserStats: TUserPoolStatsData = {
						...baseUserStats,
						userReserveA: baseUserStats.userReserveB,
						userReserveB: baseUserStats.userReserveA
					}

					return { ...oldData, data: reversedUserStats }
				}
			)
			return { message: 'Successfully reverse pool' }
		}
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
			if (!ownerAddress) throw new Error('Wallet not connected.')
			if (!signTransaction) throw new Error('Wallet does not support transaction signing.')

			try {
				// Pool Input Validation
				if (payload.baseToken.address === payload.quoteToken.address)
					throw new Error('Base and quote tokens must be different')

				const baseAmount = parseFloat(payload.baseTokenAmount)
				const quoteAmount = parseFloat(payload.quoteTokenAmount)

				if (baseAmount <= 0 || quoteAmount <= 0)
					throw new Error('Token amounts must be greater than zero')

				const initialPrice = parseFloat(payload.initialPrice)
				if (initialPrice <= 0) throw new Error('Initial price must be greater than zero')

				let latestBlockhash = await connection.getLatestBlockhash('confirmed')
				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const baseMint = new PublicKey(payload.baseToken.address)
				const quoteMint = new PublicKey(payload.quoteToken.address)

				// === BBA Pool Detection ===
				const isBBAPoolPair = isBBAPool(payload.baseToken.address, payload.quoteToken.address)
				const bbaPosition = getBBAPositionInPool(
					payload.baseToken.address,
					payload.quoteToken.address
				)
				const isBBABase = bbaPosition === 'base'
				const isBBAQuote = bbaPosition === 'quote'

				const tokenSwap = Keypair.generate()
				const [authority, bumpSeed] = PublicKey.findProgramAddressSync(
					[tokenSwap.publicKey.toBuffer()],
					TOKEN_SWAP_PROGRAM_ID
				)

				// Create swap's token A account (owned by authority)
				const swapTokenAAccount = await getAssociatedTokenAddress(baseMint, authority, true)
				const baseTokenInfo = await connection.getAccountInfo(swapTokenAAccount)

				if (!baseTokenInfo) {
					const ix = createAssociatedTokenAccountInstruction(
						ownerAddress,
						swapTokenAAccount,
						authority,
						baseMint
					)
					const tx = new Transaction().add(ix)
					const sig = await sendTransactionWithRetry(tx, connection, sendTransaction)
					await confirmTransactionWithTimeout(connection, sig, latestBlockhash)
					console.log('✅ Swap Token A account created:', sig)
					// Add delay to prevent wallet extension race condition
					console.log('⏳ Waiting 2 seconds before next transaction...')
					await new Promise((resolve) => setTimeout(resolve, 2000))
				}

				// Create swap's token B account (owned by authority)
				const swapTokenBAccount = await getAssociatedTokenAddress(quoteMint, authority, true)
				const quoteTokenInfo = await connection.getAccountInfo(swapTokenBAccount)

				if (!quoteTokenInfo) {
					const ix = createAssociatedTokenAccountInstruction(
						ownerAddress,
						swapTokenBAccount,
						authority,
						quoteMint
					)
					const tx = new Transaction().add(ix)
					const sig = await sendTransactionWithRetry(tx, connection, sendTransaction)
					await confirmTransactionWithTimeout(connection, sig, latestBlockhash)
					console.log('✅ Swap Token B account created:', sig)
					// Add delay to prevent wallet extension race condition
					console.log('⏳ Waiting 2 seconds before next transaction...')
					await new Promise((resolve) => setTimeout(resolve, 2000))
				}

				// === Create LP token mint ===
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
				const initMintIx = createInitializeMintInstruction(
					poolMint.publicKey,
					2,
					ownerAddress,
					null
				)

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
				const poolSig = await sendTransactionWithRetry(createPoolTx, connection, sendTransaction, {
					signers: [poolMint], // Pass poolMint as additional signer
					skipPreflight: false,
					preflightCommitment: 'confirmed'
				})

				console.log('⏳ LP mint transaction sent:', poolSig)

				latestBlockhash = await connection.getLatestBlockhash('confirmed')
				await confirmTransactionWithTimeout(connection, poolSig, latestBlockhash)
				console.log('✅ LP token mint created successfully')

				// Add delay to prevent wallet extension race condition
				console.log('⏳ Waiting 2 seconds before transferring authority...')
				await new Promise((resolve) => setTimeout(resolve, 2000))

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
				const transferSig = await sendTransactionWithRetry(
					transferAuthorityTx,
					connection,
					sendTransaction
				)
				await confirmTransactionWithTimeout(connection, transferSig, latestBlockhash)
				console.log('✅ Pool mint authority transferred to swap authority:', transferSig)

				// Add delay to prevent wallet extension race condition
				console.log('⏳ Waiting 2 seconds before next transaction...')
				await new Promise((resolve) => setTimeout(resolve, 2000))

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

				latestBlockhash = await connection.getLatestBlockhash('confirmed')
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
					const sig = await sendTransactionWithRetry(tx, connection, sendTransaction)
					await confirmTransactionWithTimeout(connection, sig, latestBlockhash)
					console.log('✅ Fee account created:', sig)

					// Add delay to prevent wallet extension race condition
					console.log('⏳ Waiting 2 seconds before next transaction...')
					await new Promise((resolve) => setTimeout(resolve, 2000))
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
					throw new Error(
						'Some required accounts do not exist. Cannot proceed with pool initialization.'
					)
				}

				// === CRITICAL: Deposit Initial Liquidity ===
				console.log('💰 Adding initial liquidity to pool token accounts...')

				// Convert amounts to proper decimals (assuming 6 decimals for both tokens)
				// Calculate quote amount from initial price: baseAmount / initialPrice
				const liquidityBaseAmount = parseFloat(payload.baseTokenAmount)
				const liquidityInitialPrice = parseFloat(payload.initialPrice) // SHIB per USDT
				const liquidityQuoteAmount = liquidityBaseAmount / liquidityInitialPrice // USDT amount
				const baseTokenDecimal = payload.baseToken.decimals
				const quoteTokenDecimal = payload.quoteToken.decimals

				const baseAmountDaltons = formatTokenToDaltons(liquidityBaseAmount, baseTokenDecimal)
				const quoteAmountDaltons = formatTokenToDaltons(liquidityQuoteAmount, quoteTokenDecimal)

				console.log('💰 Initial Liquidity Amounts:', {
					baseAmount: payload.baseTokenAmount,
					calculatedQuoteAmount: liquidityQuoteAmount,
					initialPrice: liquidityInitialPrice,
					baseAmountDaltons,
					quoteAmountDaltons,
					swapTokenAAccount: swapTokenAAccount.toBase58(),
					swapTokenBAccount: swapTokenBAccount.toBase58()
				})

				// === BBA-AWARE Liquidity Transfer ===
				console.log('💰 Preparing BBA-aware liquidity transfer...')

				latestBlockhash = await connection.getLatestBlockhash('confirmed')
				if (isBBAPoolPair) {
					// === BBA Pool Logic ===
					if (isBBABase) {
						// BBA is base token, other token is quote
						console.log('💰 BBA/Token pool (BBA as base)')

						// Check BBA balance (native daltons)
						const userBBABalance = await connection.getBalance(ownerAddress)
						const requiredBBA = getDaltonsFromBBA(liquidityBaseAmount)

						if (userBBABalance < requiredBBA) {
							throw new Error(
								`Insufficient BBA balance. Required: ${liquidityBaseAmount} BBA, Available: ${getBBAFromDaltons(userBBABalance)} BBA`
							)
						}

						// Check quote token balance
						const userQuoteTokenAccount = await getAssociatedTokenAddress(quoteMint, ownerAddress)
						const userQuoteInfo = await connection.getAccountInfo(userQuoteTokenAccount)

						if (!userQuoteInfo) {
							throw new Error(
								'Quote token account not found. Please ensure you have the required tokens.'
							)
						}

						const userQuoteBalance = new BN(userQuoteInfo.data.slice(64, 72), 'le')
						if (userQuoteBalance.lt(new BN(quoteAmountDaltons))) {
							throw new Error(
								`Insufficient ${payload.quoteToken.symbol} balance. Required: ${liquidityQuoteAmount}, Available: ${userQuoteBalance.div(new BN(1000000)).toString()}`
							)
						}

						// Transfer BBA to pool (using special BBA handling)
						console.log('🔄 Transferring BBA to pool account...')
						const transferBBAIx = SystemProgram.transfer({
							fromPubkey: ownerAddress,
							toPubkey: swapTokenAAccount,
							daltons: requiredBBA
						})

						const { createSyncNativeInstruction } = await import('@bbachain/spl-token')
						const syncBBAIx = createSyncNativeInstruction(swapTokenAAccount)

						// Transfer quote token (standard SPL transfer)
						const { createTransferInstruction } = await import('@bbachain/spl-token')
						const transferQuoteIx = createTransferInstruction(
							userQuoteTokenAccount,
							swapTokenBAccount,
							ownerAddress,
							quoteAmountDaltons
						)

						// Combine all transfers
						const liquidityTx = new Transaction().add(transferBBAIx, syncBBAIx, transferQuoteIx)
						const liquiditySig = await sendTransactionWithRetry(
							liquidityTx,
							connection,
							sendTransaction
						)
						await confirmTransactionWithTimeout(connection, liquiditySig, latestBlockhash)
						console.log('✅ BBA/Token liquidity transferred to pool accounts:', liquiditySig)
					} else if (isBBAQuote) {
						// Token is base, BBA is quote
						console.log('💰 Token/BBA pool (BBA as quote)')

						// Check base token balance
						const userBaseTokenAccount = await getAssociatedTokenAddress(baseMint, ownerAddress)
						const userBaseInfo = await connection.getAccountInfo(userBaseTokenAccount)

						if (!userBaseInfo) {
							throw new Error(
								'Base token account not found. Please ensure you have the required tokens.'
							)
						}

						const userBaseBalance = new BN(userBaseInfo.data.slice(64, 72), 'le')
						if (userBaseBalance.lt(new BN(baseAmountDaltons))) {
							throw new Error(
								`Insufficient ${payload.baseToken.symbol} balance. Required: ${liquidityBaseAmount}, Available: ${userBaseBalance.div(new BN(1000000)).toString()}`
							)
						}

						// Check BBA balance (native daltons)
						const userBBABalance = await connection.getBalance(ownerAddress)
						const requiredBBA = getDaltonsFromBBA(liquidityQuoteAmount)

						if (userBBABalance < requiredBBA) {
							throw new Error(
								`Insufficient BBA balance. Required: ${liquidityQuoteAmount} BBA, Available: ${getBBAFromDaltons(userBBABalance)} BBA`
							)
						}

						// Transfer base token (standard SPL transfer)
						const { createTransferInstruction } = await import('@bbachain/spl-token')
						const transferBaseIx = createTransferInstruction(
							userBaseTokenAccount,
							swapTokenAAccount,
							ownerAddress,
							baseAmountDaltons
						)

						// Transfer BBA to pool (using special BBA handling)
						console.log('🔄 Transferring BBA to pool account...')
						const transferBBAIx = SystemProgram.transfer({
							fromPubkey: ownerAddress,
							toPubkey: swapTokenBAccount,
							daltons: requiredBBA
						})

						const { createSyncNativeInstruction } = await import('@bbachain/spl-token')
						const syncBBAIx = createSyncNativeInstruction(swapTokenBAccount)

						// Combine all transfers
						const liquidityTx = new Transaction().add(transferBaseIx, transferBBAIx, syncBBAIx)
						const liquiditySig = await sendTransactionWithRetry(
							liquidityTx,
							connection,
							sendTransaction
						)
						await confirmTransactionWithTimeout(connection, liquiditySig, latestBlockhash)
						console.log('✅ Token/BBA liquidity transferred to pool accounts:', liquiditySig)
					}
				} else {
					// === Standard Token/Token Pool Logic ===
					console.log('🔄 Standard token/token pool - using SPL transfers')

					// First verify we have enough user balance
					const userBaseTokenAccount = await getAssociatedTokenAddress(baseMint, ownerAddress)
					const userQuoteTokenAccount = await getAssociatedTokenAddress(quoteMint, ownerAddress)

					// Check user balances
					const [userBaseInfo, userQuoteInfo] = await Promise.all([
						connection.getAccountInfo(userBaseTokenAccount),
						connection.getAccountInfo(userQuoteTokenAccount)
					])

					if (!userBaseInfo || !userQuoteInfo) {
						throw new Error(
							'User token accounts not found. Please ensure you have the required tokens.'
						)
					}

					// Parse user balances
					const userBaseBalance = new BN(userBaseInfo.data.slice(64, 72), 'le')
					const userQuoteBalance = new BN(userQuoteInfo.data.slice(64, 72), 'le')

					console.log('👤 User Token Balances:', {
						baseBalance: userBaseBalance.toString(),
						quoteBalance: userQuoteBalance.toString(),
						baseBalanceFormatted:
							userBaseBalance.div(new BN(1000000)).toString() + ` ${payload.baseToken.symbol}`,
						quoteBalanceFormatted:
							userQuoteBalance.div(new BN(1000000)).toString() + ` ${payload.quoteToken.symbol}`,
						requiredBase: baseAmountDaltons,
						requiredQuote: quoteAmountDaltons
					})

					// Verify sufficient balance
					if (userBaseBalance.lt(new BN(baseAmountDaltons))) {
						throw new Error(
							`Insufficient ${payload.baseToken.symbol} balance. Required: ${liquidityBaseAmount}, Available: ${userBaseBalance.div(new BN(1000000)).toString()}`
						)
					}

					if (userQuoteBalance.lt(new BN(quoteAmountDaltons))) {
						throw new Error(
							`Insufficient ${payload.quoteToken.symbol} balance. Required: ${liquidityQuoteAmount}, Available: ${userQuoteBalance.div(new BN(1000000)).toString()}`
						)
					}

					// Transfer from user to pool accounts (standard SPL)
					const { createTransferInstruction } = await import('@bbachain/spl-token')

					const transferBaseIx = createTransferInstruction(
						userBaseTokenAccount,
						swapTokenAAccount,
						ownerAddress,
						baseAmountDaltons
					)

					const transferQuoteIx = createTransferInstruction(
						userQuoteTokenAccount,
						swapTokenBAccount,
						ownerAddress,
						quoteAmountDaltons
					)

					// Send initial liquidity transfer
					const liquidityTx = new Transaction().add(transferBaseIx, transferQuoteIx)
					const liquiditySig = await sendTransactionWithRetry(
						liquidityTx,
						connection,
						sendTransaction
					)
					await confirmTransactionWithTimeout(connection, liquiditySig, latestBlockhash)
					console.log('✅ Standard token liquidity transferred to pool accounts:', liquiditySig)
				}

				// Add delay to prevent wallet extension race condition
				console.log('⏳ Waiting 2 seconds before swap initialization...')
				await new Promise((resolve) => setTimeout(resolve, 2000))

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
						(key, index) =>
							`${index}. ${key.pubkey.toBase58()} (signer: ${key.isSigner}, writable: ${key.isWritable})`
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
				const { TokenSwapLayout } = await import('@/features/liquidityPool/utils')
				const tokenSwapAccountSize = TokenSwapLayout.span // Use exact layout span instead of hardcoded 324
				console.log('📏 TokenSwap account size from layout:', tokenSwapAccountSize)
				const swapAccountDaltons =
					await connection.getMinimumBalanceForRentExemption(tokenSwapAccountSize)

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

				latestBlockhash = await connection.getLatestBlockhash('confirmed')

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
				const finalSig = await sendTransactionWithRetry(finalTx, connection, sendTransaction, {
					signers: [tokenSwap], // Additional signer required
					skipPreflight: false,
					preflightCommitment: 'confirmed'
				})

				console.log('⏳ Final transaction sent:', finalSig)

				// Wait for confirmation
				const confirmation = await confirmTransactionWithTimeout(
					connection,
					finalSig,
					latestBlockhash
				)

				if (confirmation.value?.err)
					throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)

				const data = {
					swapAccount: tokenSwap.publicKey.toBase58(),
					poolMint: poolMint.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					lpTokenAccount: poolTokenAccount.toBase58(),
					signature: finalSig,
					baseToken: payload.baseToken,
					quoteToken: payload.quoteToken,
					baseTokenAmount: Number(payload.baseTokenAmount),
					quoteTokenAmount: Number(payload.quoteTokenAmount)
				} satisfies TCreatePoolData

				return { message: 'Successfully created the pool', data }
			} catch (error) {
				console.error('❌ Pool creation failed:', error)
				throw error
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOLS], exact: true })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOL_STATS] })
			queryClient.invalidateQueries({
				queryKey: [SERVICES_KEY.WALLET.GET_BBA_BALANCE, ownerAddress?.toBase58()]
			})
		},
		onError: (error) => {
			console.error('❌ Pool creation failed:', error)
		}
	})
}

// Deposit liquidity to an existing pool using @bbachain/spl-token-swap library
export const useDepositToPool = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress, sendTransaction } = useWallet()

	return useMutation<TDepositToPoolResponse, Error, TDepositToPoolPayload>({
		mutationKey: [SERVICES_KEY.POOL.DEPOSIT_LIQUIDITY, ownerAddress?.toBase58()],
		mutationFn: async ({ pool, mintAAmount, mintBAmount, slippage = 1 }) => {
			if (!ownerAddress) throw new Error('Wallet not connected')

			// Validate inputs
			if (mintAAmount <= 0 || mintBAmount <= 0)
				throw new Error('Enter valid amounts for both tokens')

			// Get pool address and load swap state using library
			const poolAddress = pool.address
			const tokenSwapPubkey = new PublicKey(poolAddress)
			const tokenSwapState = await TokenSwap.fromAccountAddress(connection, tokenSwapPubkey)

			console.log('✅ Token swap state loaded:', {
				tokenA: tokenSwapState.tokenA.toBase58(),
				tokenB: tokenSwapState.tokenB.toBase58(),
				poolMint: tokenSwapState.poolMint.toBase58(),
				bumpSeed: tokenSwapState.bumpSeed,
				fees: {
					tradeFeeNum: tokenSwapState.fees.tradeFeeNumerator.toString(),
					tradeFeeDenom: tokenSwapState.fees.tradeFeeDenominator.toString()
				}
			})

			// Derive swap authority using bumpSeed from TokenSwap state (like the program does)
			// Program uses: create_program_address(&[&my_info.to_bytes()[..32], &[bump_seed]], program_id)
			const swapAuthority = PublicKey.createProgramAddressSync(
				[tokenSwapPubkey.toBuffer(), Buffer.from([tokenSwapState.bumpSeed])],
				TOKEN_SWAP_PROGRAM_ID
			)

			console.log('🔑 Derived swap authority with bumpSeed:', {
				authority: swapAuthority.toBase58(),
				bumpSeed: tokenSwapState.bumpSeed,
				swapKey: tokenSwapPubkey.toBase58()
			})

			// Get mint addresses from the swap state (authoritative source)
			const mintA = new PublicKey(pool.mintA.address)
			const mintB = new PublicKey(pool.mintB.address)

			// 🪙 BBA Pool Detection and Handling
			const isBBAPoolPair = isBBAPool(pool.mintA.address, pool.mintB.address)
			const bbaPosition = getBBAPositionInPool(pool.mintA.address, pool.mintB.address)
			const isBBABase = bbaPosition === 'base'
			const isBBAQuote = bbaPosition === 'quote'

			console.log('🪙 BBA Pool Analysis:', {
				isBBAPool: isBBAPoolPair,
				bbaPosition: bbaPosition,
				mintA: pool.mintA.symbol,
				mintB: pool.mintB.symbol,
				mintAAddress: mintA.toBase58(),
				mintBAddress: mintB.toBase58()
			})

			// For BBA pools, we need to use NATIVE_MINT for the BBA side
			let effectiveMintA = mintA
			let effectiveMintB = mintB

			if (isBBAPoolPair) {
				if (isBBABase) {
					// BBA is token A, replace with NATIVE_MINT
					effectiveMintA = NATIVE_MINT
					console.log('🔄 Using NATIVE_MINT for token A (BBA)')
				} else if (isBBAQuote) {
					// BBA is token B, replace with NATIVE_MINT
					effectiveMintB = NATIVE_MINT
					console.log('🔄 Using NATIVE_MINT for token B (BBA)')
				}
			}

			// Verify mints match the swap state (using effective mints for BBA)
			const swapMintA = tokenSwapState.tokenAMint
			const swapMintB = tokenSwapState.tokenBMint

			console.log('🔍 Mint verification:', {
				effectiveMintA: effectiveMintA.toBase58(),
				effectiveMintB: effectiveMintB.toBase58(),
				swapMintA: swapMintA.toBase58(),
				swapMintB: swapMintB.toBase58(),
				mintAMatches: effectiveMintA.equals(swapMintA),
				mintBMatches: effectiveMintB.equals(swapMintB)
			})

			if (!effectiveMintA.equals(swapMintA) || !effectiveMintB.equals(swapMintB)) {
				throw new Error('Pool mint addresses do not match swap state. Pool may be corrupted.')
			}

			// Convert UI amounts to smallest units (daltons)
			const amountADaltons = formatTokenToDaltons(mintAAmount, pool.mintA.decimals)
			const amountBDaltons = formatTokenToDaltons(mintBAmount, pool.mintB.decimals)

			console.log('💰 Token amounts in daltons:', {
				amountA: `${amountADaltons} daltons`,
				amountB: `${amountBDaltons} daltons`
			})

			// Get user source token accounts (where tokens will be taken from)
			// For BBA pools, use NATIVE_MINT for the BBA side
			const sourceA = await getAssociatedTokenAddress(effectiveMintA, ownerAddress)
			const sourceB = await getAssociatedTokenAddress(effectiveMintB, ownerAddress)

			// Get user LP token account (where LP tokens will be deposited)
			const userPoolAccount = await getAssociatedTokenAddress(tokenSwapState.poolMint, ownerAddress)

			console.log('🏦 Account addresses:', {
				sourceA: sourceA.toBase58(),
				sourceB: sourceB.toBase58(),
				userPoolAccount: userPoolAccount.toBase58(),
				swapTokenA: tokenSwapState.tokenA.toBase58(),
				swapTokenB: tokenSwapState.tokenB.toBase58()
			})

			// Prepare transaction with required account creation instructions
			const preInstructions = []

			// Check if user token accounts exist, create if needed
			const [userAccountAInfo, userAccountBInfo, userPoolAccountInfo] = await Promise.all([
				connection.getAccountInfo(sourceA),
				connection.getAccountInfo(sourceB),
				connection.getAccountInfo(userPoolAccount)
			])

			if (!userAccountAInfo) {
				console.log('📝 Creating user token A account...')
				preInstructions.push(
					createAssociatedTokenAccountInstruction(
						ownerAddress,
						sourceA,
						ownerAddress,
						effectiveMintA
					)
				)
			}
			if (!userAccountBInfo) {
				console.log('📝 Creating user token B account...')
				preInstructions.push(
					createAssociatedTokenAccountInstruction(
						ownerAddress,
						sourceB,
						ownerAddress,
						effectiveMintB
					)
				)
			}
			if (!userPoolAccountInfo) {
				console.log('📝 Creating user LP token account...')
				preInstructions.push(
					createAssociatedTokenAccountInstruction(
						ownerAddress,
						userPoolAccount,
						ownerAddress,
						tokenSwapState.poolMint
					)
				)
			}

			// 🪙 BBA Wrapping Logic (Critical for BBA pools)
			if (isBBAPoolPair) {
				console.log('🪙 Handling BBA wrapping for liquidity deposit...')

				if (isBBABase) {
					// BBA is token A - need to wrap BBA to WBBA
					console.log('💰 Wrapping BBA (token A) to WBBA for deposit...')
					const requiredBBA = BigInt(amountADaltons)

					// Check user BBA balance
					const userBBABalance = await connection.getBalance(ownerAddress)
					if (BigInt(userBBABalance) < requiredBBA) {
						throw new Error(
							`Insufficient BBA balance. Required: ${mintAAmount} BBA, Available: ${userBBABalance / 1e9} BBA`
						)
					}

					// Transfer BBA to WBBA account and sync
					const transferBBAIx = SystemProgram.transfer({
						fromPubkey: ownerAddress,
						toPubkey: sourceA,
						daltons: Number(requiredBBA)
					})
					const syncBBAIx = createSyncNativeInstruction(sourceA)
					preInstructions.push(transferBBAIx, syncBBAIx)

					console.log(`✅ Added BBA wrapping instructions: ${requiredBBA} daltons`)
				} else if (isBBAQuote) {
					// BBA is token B - need to wrap BBA to WBBA
					console.log('💰 Wrapping BBA (token B) to WBBA for deposit...')
					const requiredBBA = BigInt(amountBDaltons)

					// Check user BBA balance
					const userBBABalance = await connection.getBalance(ownerAddress)
					if (BigInt(userBBABalance) < requiredBBA) {
						throw new Error(
							`Insufficient BBA balance. Required: ${mintBAmount} BBA, Available: ${userBBABalance / 1e9} BBA`
						)
					}

					// Transfer BBA to WBBA account and sync
					const transferBBAIx = SystemProgram.transfer({
						fromPubkey: ownerAddress,
						toPubkey: sourceB,
						daltons: Number(requiredBBA)
					})
					const syncBBAIx = createSyncNativeInstruction(sourceB)
					preInstructions.push(transferBBAIx, syncBBAIx)

					console.log(`✅ Added BBA wrapping instructions: ${requiredBBA} daltons`)
				}
			}

			// Calculate optimal pool token amount based on current reserves
			console.log('🧮 Calculating optimal pool token amount...')

			// Get pool mint info to check current supply
			const poolMintInfo = await getMint(connection, tokenSwapState.poolMint)
			const totalSupply = BigInt(poolMintInfo.supply.toString())

			// Get current token balances in the pool
			const [poolAccountAInfo, poolAccountBInfo] = await Promise.all([
				connection.getAccountInfo(tokenSwapState.tokenA),
				connection.getAccountInfo(tokenSwapState.tokenB)
			])

			if (!poolAccountAInfo || !poolAccountBInfo) {
				throw new Error('Unable to fetch pool token account information')
			}

			// Parse token account data to get current balances
			const poolBalanceA = new BN(poolAccountAInfo.data.slice(64, 72), 'le')
			const poolBalanceB = new BN(poolAccountBInfo.data.slice(64, 72), 'le')

			console.log('💎 Current pool state:', {
				totalSupply: totalSupply.toString(),
				poolBalanceA: poolBalanceA.toString(),
				poolBalanceB: poolBalanceB.toString()
			})

			// Calculate pool tokens to mint based on proportional deposit
			// poolTokenAmount = min(amountA * totalSupply / poolBalanceA, amountB * totalSupply / poolBalanceB)
			let poolTokenAmount: bigint

			if (totalSupply === BigInt(0)) {
				// Initial deposit - use geometric mean
				poolTokenAmount = BigInt(
					Math.floor(Math.sqrt(Number(amountADaltons) * Number(amountBDaltons)))
				)
			} else {
				// Subsequent deposits - maintain pool ratio
				const tokensFromA = poolBalanceA.gt(new BN(0))
					? (BigInt(amountADaltons) * totalSupply) / BigInt(poolBalanceA.toString())
					: BigInt(0)
				const tokensFromB = poolBalanceB.gt(new BN(0))
					? (BigInt(amountBDaltons) * totalSupply) / BigInt(poolBalanceB.toString())
					: BigInt(0)

				poolTokenAmount = tokensFromA < tokensFromB ? tokensFromA : tokensFromB
			}

			// Apply slippage tolerance (reduce expected LP tokens for safety)
			if (slippage > 0) {
				const slippageFactor = 1 - slippage / 100
				poolTokenAmount = BigInt(Math.floor(Number(poolTokenAmount) * slippageFactor))
			}

			// Maximum token amounts (add slippage buffer)
			const slippageMultiplier = 1 + slippage / 100
			const maximumTokenAAmount = BigInt(Math.ceil(Number(amountADaltons) * slippageMultiplier))
			const maximumTokenBAmount = BigInt(Math.ceil(Number(amountBDaltons) * slippageMultiplier))

			console.log('📊 Calculated amounts:', {
				poolTokenAmount: poolTokenAmount.toString(),
				maximumTokenAAmount: maximumTokenAAmount.toString(),
				maximumTokenBAmount: maximumTokenBAmount.toString()
			})

			// Create deposit instruction using library
			console.log('🔧 Creating deposit instruction...')
			const depositInstruction = createDepositAllTokenTypesInstruction(
				{
					tokenSwap: tokenSwapPubkey,
					authority: swapAuthority,
					userTransferAuthority: ownerAddress,
					sourceA,
					sourceB,
					intoA: tokenSwapState.tokenA,
					intoB: tokenSwapState.tokenB,
					poolMint: tokenSwapState.poolMint,
					poolAccount: userPoolAccount,
					tokenProgram: TOKEN_PROGRAM_ID
				},
				{
					poolTokenAmount: new BN(poolTokenAmount.toString()),
					maximumTokenAAmount: new BN(maximumTokenAAmount.toString()),
					maximumTokenBAmount: new BN(maximumTokenBAmount.toString())
				}
			)

			console.log('✅ Deposit instruction created successfully')

			// Build and send transaction
			const transaction = new Transaction()

			// Add setup instructions first
			preInstructions.forEach((ix) => transaction.add(ix))

			// Add the deposit instruction
			transaction.add(depositInstruction)

			console.log('📡 Sending transaction...')
			console.log('📋 Final transaction details:', {
				instructionCount: transaction.instructions.length,
				instructions: transaction.instructions.map((ix, index) => ({
					index,
					programId: ix.programId.toBase58(),
					dataLength: ix.data.length,
					accountCount: ix.keys.length
				}))
			})

			const latestBlockhash = await connection.getLatestBlockhash('confirmed')

			try {
				const signature = await sendTransactionWithRetry(transaction, connection, sendTransaction, {
					skipPreflight: false,
					preflightCommitment: 'confirmed'
				})
				console.log('✅ Transaction sent successfully:', signature)

				console.log('⏳ Confirming transaction...')
				await confirmTransactionWithTimeout(connection, signature, latestBlockhash)

				return {
					message: `Successfully deposit to pool with address ${pool.address}`,
					data: signature
				}
			} catch (error: any) {
				console.error('❌ Transaction failed:', error)

				// Try to get more detailed error information
				if (error.message?.includes('custom program error')) {
					console.error('🔍 Custom program error detected - this is InvalidProgramAddress')
					console.error('🔧 Debugging hints:')
					console.error('   - Check if authority derivation is correct')
					console.error('   - Verify token account addresses match swap state')
					console.error('   - Ensure pool mint and accounts are valid')
				}
				throw error
			}
		}
	})
}
