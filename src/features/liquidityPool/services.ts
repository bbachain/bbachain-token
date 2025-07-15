import {
	TOKEN_PROGRAM_ID,
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	createInitializeMintInstruction,
	createSetAuthorityInstruction,
	AuthorityType,
	NATIVE_MINT,
	createSyncNativeInstruction,
	createInitializeAccountInstruction,
	createTransferInstruction
} from '@bbachain/spl-token'
import { CurveType, createInitializeInstruction, PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID } from '@bbachain/spl-token-swap'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { Keypair, PublicKey, SystemProgram, Transaction, Connection, TransactionInstruction } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import BN from 'bn.js'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'
import { formatTokenToDaltons } from '@/lib/utils'

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

/**
 * Helper function to create token account manually following pattern from BBAChain example
 */
async function createTokenAccountManual(
	connection: Connection,
	payer: Keypair | PublicKey,
	mint: PublicKey,
	owner: PublicKey
): Promise<PublicKey> {
	const tokenAccount = Keypair.generate()

	// Get minimum balance for token account
	const tokenAccountSpace = 165 // Standard token account size
	const rentExemptAmount = await connection.getMinimumBalanceForRentExemption(tokenAccountSpace)

	// Create account instruction
	const createAccountIx = SystemProgram.createAccount({
		fromPubkey: payer instanceof PublicKey ? payer : payer.publicKey,
		newAccountPubkey: tokenAccount.publicKey,
		daltons: rentExemptAmount,
		space: tokenAccountSpace,
		programId: TOKEN_PROGRAM_ID
	})

	// Initialize token account instruction
	const initAccountIx = createInitializeAccountInstruction(tokenAccount.publicKey, mint, owner)

	return tokenAccount.publicKey
}

/**
 * Helper function to wrap BBA to WBBA following BBAChain example
 */
async function prepareBBAForPool(
	connection: Connection,
	payer: PublicKey,
	owner: PublicKey,
	amount: number
): Promise<{ wbbaAccount: PublicKey; instructions: TransactionInstruction[] }> {
	console.log('🔄 Preparing BBA for pool operations...')

	const tokenAccount = Keypair.generate()

	// Get minimum balance for token account
	const tokenAccountSpace = 165
	const rentExemptAmount = await connection.getMinimumBalanceForRentExemption(tokenAccountSpace)

	const instructions = []

	// Create account instruction
	const createAccountIx = SystemProgram.createAccount({
		fromPubkey: payer,
		newAccountPubkey: tokenAccount.publicKey,
		daltons: rentExemptAmount,
		space: tokenAccountSpace,
		programId: TOKEN_PROGRAM_ID
	})
	instructions.push(createAccountIx)

	// Initialize token account instruction
	const initAccountIx = createInitializeAccountInstruction(tokenAccount.publicKey, NATIVE_MINT, owner)
	instructions.push(initAccountIx)

	// Transfer BBA to the token account
	const transferIx = SystemProgram.transfer({
		fromPubkey: payer,
		toPubkey: tokenAccount.publicKey,
		daltons: amount
	})
	instructions.push(transferIx)

	// Sync native instruction to wrap BBA
	const syncIx = createSyncNativeInstruction(tokenAccount.publicKey)
	instructions.push(syncIx)

	console.log(`✅ Prepared BBA for pool: ${tokenAccount.publicKey.toBase58()}`)

	return {
		wbbaAccount: tokenAccount.publicKey,
		instructions
	}
}

// Create pool mutation with fixed BBA handling
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

				// Get blockchain state early for all transactions
				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const latestBlockhash = await connection.getLatestBlockhash('confirmed')

				// === STEP 1: DETERMINE TOKEN TYPES AND PREPARE BBA IF NEEDED ===
				console.log('🔍 Analyzing token types...')

				const isBaseBBA = payload.baseToken.address === NATIVE_MINT.toBase58()
				const isQuoteBBA = payload.quoteToken.address === NATIVE_MINT.toBase58()

				console.log('🔍 Token Analysis:', {
					baseToken: payload.baseToken.symbol,
					isBaseBBA,
					quoteToken: payload.quoteToken.symbol,
					isQuoteBBA,
					nativeMint: NATIVE_MINT.toBase58()
				})

				// Use original token addresses for pool creation
				const baseMint = new PublicKey(payload.baseToken.address)
				const quoteMint = new PublicKey(payload.quoteToken.address)

				console.log('🔑 Token mint addresses:', {
					baseMint: baseMint.toBase58(),
					quoteMint: quoteMint.toBase58()
				})

				// === STEP 2: CREATE POOL KEYPAIRS AND AUTHORITY ===
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

				// === STEP 3: CREATE POOL MINT FOR LP TOKENS ===
				console.log('🏭 Creating LP token mint...')
				const poolMint = Keypair.generate()

				console.log('🔑 Generated LP token mint:', poolMint.publicKey.toBase58())

				// Create mint account
				const createMintIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: poolMint.publicKey,
					space: MINT_SIZE,
					daltons,
					programId: TOKEN_PROGRAM_ID
				})

				// Initialize mint with temporary authority (owner), will transfer later
				const initMintIx = createInitializeMintInstruction(poolMint.publicKey, 2, ownerAddress, null)

				// Create user's LP token account
				const poolTokenAccount = await getAssociatedTokenAddress(poolMint.publicKey, ownerAddress)
				const ataIx = createAssociatedTokenAccountInstruction(
					ownerAddress,
					poolTokenAccount,
					ownerAddress,
					poolMint.publicKey
				)

				// Send LP mint creation transaction
				console.log('📝 Creating LP mint transaction...')
				const createPoolTx = new Transaction().add(createMintIx, initMintIx, ataIx)

				const poolSig = await sendTransaction(createPoolTx, connection, {
					signers: [poolMint],
					skipPreflight: false,
					preflightCommitment: 'confirmed'
				})

				console.log('⏳ LP mint transaction sent:', poolSig)
				await connection.confirmTransaction({ signature: poolSig, ...latestBlockhash }, 'confirmed')
				console.log('✅ LP token mint created successfully')

				// === STEP 4: TRANSFER POOL MINT AUTHORITY TO SWAP AUTHORITY ===
				console.log('🔄 Transferring pool mint authority to swap authority...')

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

				// === STEP 5: CREATE POOL TOKEN ACCOUNTS (VAULTS) MANUALLY ===
				console.log('🏦 Creating pool token accounts (vaults)...')

				// Create token A vault (owned by swap authority)
				const tokenAVault = Keypair.generate()
				const createTokenAVaultIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: tokenAVault.publicKey,
					space: 165,
					daltons: await connection.getMinimumBalanceForRentExemption(165),
					programId: TOKEN_PROGRAM_ID
				})
				const initTokenAVaultIx = createInitializeAccountInstruction(tokenAVault.publicKey, baseMint, authority)

				// Create token B vault (owned by swap authority)
				const tokenBVault = Keypair.generate()
				const createTokenBVaultIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: tokenBVault.publicKey,
					space: 165,
					daltons: await connection.getMinimumBalanceForRentExemption(165),
					programId: TOKEN_PROGRAM_ID
				})
				const initTokenBVaultIx = createInitializeAccountInstruction(tokenBVault.publicKey, quoteMint, authority)

				// Send vault creation transaction
				const createVaultsTx = new Transaction().add(
					createTokenAVaultIx,
					initTokenAVaultIx,
					createTokenBVaultIx,
					initTokenBVaultIx
				)

				const vaultsSig = await sendTransaction(createVaultsTx, connection, {
					signers: [tokenAVault, tokenBVault],
					skipPreflight: false,
					preflightCommitment: 'confirmed'
				})

				await connection.confirmTransaction({ signature: vaultsSig, ...latestBlockhash }, 'confirmed')
				console.log('✅ Pool vaults created:', {
					tokenAVault: tokenAVault.publicKey.toBase58(),
					tokenBVault: tokenBVault.publicKey.toBase58()
				})

				// === STEP 6: CREATE FEE ACCOUNT ===
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

				// === STEP 7: PREPARE USER TOKEN ACCOUNTS AND INITIAL LIQUIDITY ===
				console.log('💰 Preparing initial liquidity...')

				// Calculate amounts in daltons
				const baseAmountDaltons = Math.floor(baseAmount * Math.pow(10, payload.baseToken.decimals))
				const quoteAmountDaltons = Math.floor(quoteAmount * Math.pow(10, payload.quoteToken.decimals))

				console.log('💰 Initial Liquidity Amounts:', {
					baseAmount,
					quoteAmount,
					baseAmountDaltons,
					quoteAmountDaltons
				})

				// === STEP 8: FUND POOL VAULTS WITH INITIAL LIQUIDITY ===
				console.log('💸 Adding initial liquidity to pool vaults...')

				if (isBaseBBA) {
					// For BBA (base token): Transfer directly to vault and sync
					console.log('🔄 Adding BBA to vault directly...')

					const transferBBAToVaultIx = SystemProgram.transfer({
						fromPubkey: ownerAddress,
						toPubkey: tokenAVault.publicKey,
						daltons: baseAmountDaltons
					})

					const syncBBAVaultIx = createSyncNativeInstruction(tokenAVault.publicKey)

					const bbaLiquidityTx = new Transaction().add(transferBBAToVaultIx, syncBBAVaultIx)
					const bbaLiqSig = await sendTransaction(bbaLiquidityTx, connection)
					await connection.confirmTransaction({ signature: bbaLiqSig, ...latestBlockhash }, 'confirmed')
					console.log('✅ BBA added to vault:', bbaLiqSig)
				} else {
					// For SPL tokens: Transfer from user account to vault
					const userBaseTokenAccount = await getAssociatedTokenAddress(baseMint, ownerAddress)
					const transferBaseIx = createTransferInstruction(
						userBaseTokenAccount,
						tokenAVault.publicKey,
						ownerAddress,
						baseAmountDaltons
					)

					const baseLiquidityTx = new Transaction().add(transferBaseIx)
					const baseLiqSig = await sendTransaction(baseLiquidityTx, connection)
					await connection.confirmTransaction({ signature: baseLiqSig, ...latestBlockhash }, 'confirmed')
					console.log('✅ Base token transferred to vault:', baseLiqSig)
				}

				if (isQuoteBBA) {
					// For BBA (quote token): Transfer directly to vault and sync
					console.log('🔄 Adding BBA to quote vault directly...')

					const transferBBAToVaultIx = SystemProgram.transfer({
						fromPubkey: ownerAddress,
						toPubkey: tokenBVault.publicKey,
						daltons: quoteAmountDaltons
					})

					const syncBBAVaultIx = createSyncNativeInstruction(tokenBVault.publicKey)

					const bbaLiquidityTx = new Transaction().add(transferBBAToVaultIx, syncBBAVaultIx)
					const bbaLiqSig = await sendTransaction(bbaLiquidityTx, connection)
					await connection.confirmTransaction({ signature: bbaLiqSig, ...latestBlockhash }, 'confirmed')
					console.log('✅ BBA added to quote vault:', bbaLiqSig)
				} else {
					// For SPL tokens: Transfer from user account to vault
					const userQuoteTokenAccount = await getAssociatedTokenAddress(quoteMint, ownerAddress)
					const transferQuoteIx = createTransferInstruction(
						userQuoteTokenAccount,
						tokenBVault.publicKey,
						ownerAddress,
						quoteAmountDaltons
					)

					const quoteLiquidityTx = new Transaction().add(transferQuoteIx)
					const quoteLiqSig = await sendTransaction(quoteLiquidityTx, connection)
					await connection.confirmTransaction({ signature: quoteLiqSig, ...latestBlockhash }, 'confirmed')
					console.log('✅ Quote token transferred to vault:', quoteLiqSig)
				}

				// === STEP 9: CONFIGURE FEES AND CURVE ===
				const feeTierMap: Record<string, { numerator: number; denominator: number }> = {
					'0.01': { numerator: 1, denominator: 10000 },
					'0.05': { numerator: 5, denominator: 10000 },
					'0.1': { numerator: 1, denominator: 1000 },
					'0.25': { numerator: 25, denominator: 10000 },
					'0.3': { numerator: 3, denominator: 1000 },
					'1': { numerator: 1, denominator: 100 }
				}
				const feeConfig = feeTierMap[payload.feeTier]
				if (!feeConfig) {
					throw new Error(
						`Invalid fee tier: ${payload.feeTier}%. Supported tiers: ${Object.keys(feeTierMap).join(', ')}%`
					)
				}

				const swapCurve = {
					curveType: CurveType.ConstantProduct,
					calculator: new Array(32).fill(0)
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

				console.log('💰 Pool fee configuration:', {
					tier: `${payload.feeTier}%`,
					numerator: feeConfig.numerator,
					denominator: feeConfig.denominator
				})

				// === STEP 10: CREATE SWAP INITIALIZATION INSTRUCTION ===
				console.log('🔧 Creating token swap instruction...')

				const swapIx = createInitializeInstruction(
					{
						tokenSwap: tokenSwap.publicKey,
						authority: authority,
						tokenA: tokenAVault.publicKey,
						tokenB: tokenBVault.publicKey,
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

				console.log('✅ Token swap instruction created successfully')

				// === STEP 11: CREATE TOKEN SWAP ACCOUNT AND INITIALIZE ===
				console.log('🏗️ Creating TokenSwap account and initializing...')

				const { TokenSwapLayout } = await import('./onchain')
				const tokenSwapAccountSize = TokenSwapLayout.span
				const swapAccountDaltons = await connection.getMinimumBalanceForRentExemption(tokenSwapAccountSize)

				const createSwapAccountIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: tokenSwap.publicKey,
					space: tokenSwapAccountSize,
					daltons: swapAccountDaltons,
					programId: TOKEN_SWAP_PROGRAM_ID
				})

				// Create final transaction with create + initialize
				const finalTx = new Transaction().add(createSwapAccountIx, swapIx)

				// Send final transaction
				console.log('📝 Sending final transaction...')
				const finalSig = await sendTransaction(finalTx, connection, {
					signers: [tokenSwap],
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
