import {
	getAssociatedTokenAddress,
	TOKEN_PROGRAM_ID,
	NATIVE_MINT,
	createApproveInstruction,
	createAssociatedTokenAccountInstruction,
	createSyncNativeInstruction,
	createCloseAccountInstruction
} from '@bbachain/spl-token'
import {
	createSwapInstruction,
	PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID
} from '@bbachain/spl-token-swap'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import {
	PublicKey,
	SystemProgram,
	Transaction,
	type TransactionInstruction
} from '@bbachain/web3.js'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'
import { getAllPoolsFromOnchain } from '@/features/liquidityPool/onchain'
import type {
	TExecuteSwapPayload,
	TExecuteSwapResponse,
	TExecuteSwapResponseData,
	TGetSwapQuotePayload,
	TGetSwapQuoteResponse,
	TGetUserBalanceData
} from '@/features/swap/types'
import { calculateOutputAmount, calculatePriceImpact, findBestPool } from '@/features/swap/utils'
import { bbaTodaltons, daltonsToBBA } from '@/lib/bbaWrapping'
import { isNativeBBA } from '@/staticData/tokens'

export const useGetUserBalanceByMint = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetUserBalanceData>({
		queryKey: [SERVICES_KEY.SWAP.GET_USER_BALANCE_BY_MINT, mintAddress],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			try {
				// Import the native BBA detection function
				const { isNativeBBA } = await import('@/staticData/tokens')

				// Handle native BBA token differently
				if (isNativeBBA(mintAddress)) {
					console.log('🪙 Fetching native BBA balance...')
					const balance = await connection.getBalance(ownerAddress)
					console.log('💰 Native BBA balance:', balance, 'daltons')
					return { balance }
				}

				// Handle SPL tokens (existing logic)
				console.log('🪙 Fetching SPL token balance for:', mintAddress)
				const mint = new PublicKey(mintAddress)
				const ata = await getAssociatedTokenAddress(mint, ownerAddress)
				const balanceAmount = await connection.getTokenAccountBalance(ata)
				console.log('💰 SPL token balance:', balanceAmount.value.amount, 'base units')

				return { balance: Number(balanceAmount.value.amount) }
			} catch (e) {
				console.error('Balance fetch error:', e)
				return { balance: 0 }
			}
		},
		enabled: !!mintAddress && !!ownerAddress
	})
}

export const useGetCoinGeckoTokenPrice = ({ coinGeckoId }: { coinGeckoId?: string }) =>
	useQuery<number>({
		queryKey: [SERVICES_KEY.SWAP.GET_COIN_GECKO_TOKEN_PRICE, coinGeckoId],
		queryFn: async () => {
			if (!coinGeckoId) return 0
			const res = await axios.get(ENDPOINTS.COIN_GECKO.GET_SIMPLE_PRICE, {
				params: {
					ids: coinGeckoId,
					vs_currencies: 'usd'
				}
			})
			const usdRate = res.data[coinGeckoId].usd ?? 0
			// Only log price if it's actually different from previous value to reduce spam
			console.log(`💰 ${coinGeckoId} price: $${usdRate}`)
			return usdRate
		},
		enabled: !!coinGeckoId,
		refetchInterval: 300000, // Reduced to 5 minutes to avoid spam
		staleTime: 60000 // Cache for 1 minute
	})

export const useGetSwapQuote = ({
	inputMint,
	outputMint,
	inputAmount,
	slippage = 0.5
}: TGetSwapQuotePayload) => {
	const { connection } = useConnection()

	return useQuery<TGetSwapQuoteResponse | null, Error>({
		queryKey: [SERVICES_KEY.SWAP.GET_SWAP_QUOTE, inputMint, outputMint, inputAmount, slippage],
		queryFn: async () => {
			if (!inputAmount || Number(inputAmount) <= 0) return null

			if (inputMint === outputMint) return null

			try {
				const pools = await getAllPoolsFromOnchain(connection)
				const bestPool = findBestPool(pools, inputMint, outputMint)

				if (!bestPool) throw new Error(`No liquidity pool found for this token pair`)

				// Determine which token is A and which is B
				const isInputTokenA = bestPool.mintA.address === inputMint

				const inputReserve = isInputTokenA
					? Number(bestPool.reserveA) / Math.pow(10, bestPool.mintA.decimals)
					: Number(bestPool.reserveB) / Math.pow(10, bestPool.mintB.decimals)
				const outputReserve = isInputTokenA
					? Number(bestPool.reserveB) / Math.pow(10, bestPool.mintB.decimals)
					: Number(bestPool.reserveA) / Math.pow(10, bestPool.mintA.decimals)

				// Validate reserves
				if (inputReserve <= 0 || outputReserve <= 0) throw new Error('Pool has invalid reserves')

				const inputAmountNumber = Number(inputAmount)

				// Convert fee rate from percentage to decimal (1.0% -> 0.01)
				const feeRateDecimal = bestPool.feeRate > 1 ? bestPool.feeRate / 100 : bestPool.feeRate

				const outputAmount = calculateOutputAmount(
					inputAmountNumber,
					inputReserve,
					outputReserve,
					feeRateDecimal
				)
				const priceImpact = calculatePriceImpact(
					inputAmountNumber,
					inputReserve,
					outputReserve,
					feeRateDecimal
				)

				// Validate calculation results
				if (outputAmount <= 0) throw new Error('Cannot calculate valid output amount')

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
				} as TGetSwapQuoteResponse

				return result
			} catch (error) {
				console.error('❌ Error in swap quote calculation:', error)
				throw error
			}
		},
		enabled:
			!!inputMint &&
			!!outputMint &&
			!!inputAmount &&
			Number(inputAmount) > 0 &&
			inputMint !== outputMint,
		staleTime: 10000, // 10 seconds
		refetchInterval: 15000, // Refresh every 15 seconds
		retry: (failureCount, error) => {
			console.log('🔄 Retrying swap quote:', { failureCount, error: error?.message })
			return failureCount < 2 // Retry up to 2 times
		}
	})
}

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

export const useExecuteSwap = () => {
	const { connection } = useConnection()
	const { publicKey, sendTransaction } = useWallet()
	const queryClient = useQueryClient()

	return useMutation<TExecuteSwapResponse, Error, TExecuteSwapPayload>({
		mutationFn: async (params) => {
			const startTime = Date.now()
			console.log('🔄 Swap execution started:', params)

			if (!publicKey) throw new Error('Wallet not connected')

			const { inputMint, outputMint, inputAmount, slippage, poolAddress } = params

			// === BBA Detection (must be early) ===
			const isInputBBA = isNativeBBA(inputMint)
			const isOutputBBA = isNativeBBA(outputMint)
			const isBBASwap = isInputBBA || isOutputBBA

			// Get pool data to access swap authority and token accounts
			const pools = await getAllPoolsFromOnchain(connection)
			const pool = pools.find((p) => p.address === poolAddress)
			if (!pool) throw new Error('Pool not found')

			// Calculate all required values for debugging
			const effectiveInputMint = isInputBBA ? NATIVE_MINT.toBase58() : inputMint
			const isInputTokenA = pool.mintA.address === effectiveInputMint

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
			const expectedOutput = calculateOutputAmount(
				inputAmountNumber,
				inputReserve,
				outputReserve,
				feeRateDecimal
			)
			const expectedOutputDaltons = Math.floor(expectedOutput * Math.pow(10, outputDecimals))

			const slippageMultiplier = 1 - slippage / 100
			const minimumOutputDaltons = Math.floor(expectedOutputDaltons * slippageMultiplier)

			let userInputTokenAccount: PublicKey
			let userOutputTokenAccount: PublicKey
			let createdWBBAInputAccount = false
			let preTxInstructions: TransactionInstruction[] = []
			let postTxInstructions: TransactionInstruction[] = []

			if (isBBASwap) {
				if (isInputBBA) {
					const userBBABalance = await connection.getBalance(publicKey)
					const requiredBBA = bbaTodaltons(inputAmountNumber)

					if (userBBABalance < requiredBBA)
						throw new Error(
							`Insufficient BBA balance. Required: ${inputAmountNumber} BBA, Available: ${daltonsToBBA(userBBABalance)} BBA`
						)

					userInputTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, publicKey)

					// Create WBBA account if it doesn't exist and fund it
					const wbbaAccountInfo = await connection.getAccountInfo(userInputTokenAccount)
					if (!wbbaAccountInfo) {
						const createWBBAIx = createAssociatedTokenAccountInstruction(
							publicKey,
							userInputTokenAccount,
							publicKey,
							NATIVE_MINT
						)
						preTxInstructions.push(createWBBAIx)
						createdWBBAInputAccount = true
					}

					// Add instructions to transfer BBA and sync
					const transferBBAIx = SystemProgram.transfer({
						fromPubkey: publicKey,
						toPubkey: userInputTokenAccount,
						daltons: requiredBBA
					})
					const syncBBAIx = createSyncNativeInstruction(userInputTokenAccount)
					preTxInstructions.push(transferBBAIx, syncBBAIx)

					// For output, use standard token account
					userOutputTokenAccount = await getAssociatedTokenAddress(
						new PublicKey(outputMint),
						publicKey
					)

					// If we created a temporary WBBA input ATA for this swap, close it after swap to reclaim rent
					if (createdWBBAInputAccount) {
						const closeWbbaInputIx = createCloseAccountInstruction(
							userInputTokenAccount,
							publicKey,
							publicKey
						)
						postTxInstructions.push(closeWbbaInputIx)
					}
				} else if (isOutputBBA) {
					// For input, use standard token account
					userInputTokenAccount = await getAssociatedTokenAddress(
						new PublicKey(inputMint),
						publicKey
					)

					userOutputTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, publicKey)

					// Create WBBA account if it doesn't exist
					const wbbaAccountInfo = await connection.getAccountInfo(userOutputTokenAccount)
					if (!wbbaAccountInfo) {
						console.log('📝 Creating WBBA account for output...')
						const createWBBAIx = createAssociatedTokenAccountInstruction(
							publicKey,
							userOutputTokenAccount,
							publicKey,
							NATIVE_MINT
						)
						preTxInstructions.push(createWBBAIx)
					}

					const closeWBBAIx = createCloseAccountInstruction(
						userOutputTokenAccount,
						publicKey,
						publicKey
					)
					postTxInstructions.push(closeWBBAIx)
				} else {
					throw new Error('Unexpected BBA swap state')
				}
			} else {
				// Standard token/token swap
				console.log('🔄 Standard token/token swap')
				userInputTokenAccount = await getAssociatedTokenAddress(new PublicKey(inputMint), publicKey)
				userOutputTokenAccount = await getAssociatedTokenAddress(
					new PublicKey(outputMint),
					publicKey
				)
			}

			// Get pool info from BBA Chain
			const poolInfo = pool.swapData

			// Derive swap authority from pool account
			const [swapAuthority] = PublicKey.findProgramAddressSync(
				[new PublicKey(poolAddress).toBuffer()],
				TOKEN_SWAP_PROGRAM_ID
			)

			const accounts = {
				tokenSwap: new PublicKey(poolAddress),
				authority: swapAuthority,
				userTransferAuthority: publicKey,
				source: userInputTokenAccount,
				swapSource: isInputTokenA
					? new PublicKey(poolInfo.tokenAccountA)
					: new PublicKey(poolInfo.tokenAccountB),
				swapDestination: isInputTokenA
					? new PublicKey(poolInfo.tokenAccountB)
					: new PublicKey(poolInfo.tokenAccountA),
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

			// Create transaction with BBA wrapping/unwrapping support
			const transaction = new Transaction()

			// Add pre-swap instructions (BBA wrapping if needed)
			if (preTxInstructions.length > 0) {
				console.log(`📝 Adding ${preTxInstructions.length} pre-swap instructions (BBA wrapping)`)
				preTxInstructions.forEach((ix) => transaction.add(ix))
			}

			console.log(
				'📦 preTxInstructions',
				preTxInstructions.map((ix, i) => ({
					index: i,
					programId: ix.programId.toBase58(),
					keys: ix.keys.map((k: any) => k.pubkey.toBase58()),
					data: ix.data.toString('hex')
				}))
			)

			// Add approve instruction for input token if needed
			if (isBBASwap && isInputBBA) {
				// For WBBA, need to approve the swap to spend tokens
				const approveIx = createApproveInstruction(
					userInputTokenAccount,
					publicKey,
					publicKey,
					bbaTodaltons(inputAmountNumber)
				)
				transaction.add(approveIx)
			}

			// Add the main swap instruction
			transaction.add(swapInstruction)

			// Add post-swap instructions (BBA unwrapping if needed)
			if (postTxInstructions.length > 0) {
				console.log(
					`📝 Adding ${postTxInstructions.length} post-swap instructions (BBA unwrapping)`
				)
				postTxInstructions.forEach((ix) => transaction.add(ix))
			}

			// Send transaction
			const signature = await sendTransaction(transaction, connection)

			console.log('📤 Transaction sent with signature:', signature)

			// Wait for confirmation
			const confirmation = await connection.confirmTransaction(signature, 'confirmed')

			if (confirmation.value.err) {
				throw new Error(`Transaction failed: ${confirmation.value.err}`)
			}

			console.log('✅ Swap transaction confirmed!')

			const responseData = {
				signature,
				inputAmount: inputAmountNumber,
				outputAmount: expectedOutput,
				actualOutputAmount: expectedOutput, // TODO: Get actual from transaction logs
				priceImpact: calculatePriceImpact(
					inputAmountNumber,
					inputReserve,
					outputReserve,
					feeRateDecimal
				),
				executionTime: Date.now() - startTime,
				poolDetail: pool
			} as TExecuteSwapResponseData

			// Return execution result
			return {
				message: `Swap successful! Received ${responseData.actualOutputAmount.toFixed(6)} ${pool.mintB.symbol}`,
				data: responseData
			}
		},
		onSuccess: (response) => {
			const result = response.data
			const poolId = result.poolDetail?.address
			const baseMint = result.poolDetail?.mintA
			const quoteMint = result.poolDetail?.mintB

			// Invalidate relevant queries to refresh balances and pool data
			queryClient.invalidateQueries({ queryKey: ['swap-quote'] })
			queryClient.invalidateQueries({ queryKey: ['user-balance'] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.SWAP.GET_USER_BALANCE_BY_MINT] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOLS] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOL_BY_ID, poolId] })
			queryClient.invalidateQueries({
				queryKey: [
					SERVICES_KEY.POOL.GET_TRANSACTIONS_BY_POOL_ID,
					poolId,
					baseMint?.address,
					quoteMint?.address
				]
			})
			queryClient.invalidateQueries({
				queryKey: [
					SERVICES_KEY.POOL.GET_TRANSACTIONS_BY_POOL_ID,
					poolId,
					quoteMint?.address,
					baseMint?.address
				]
			})
			queryClient.invalidateQueries({
				queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, publicKey?.toBase58()]
			})
		}
	})
}
