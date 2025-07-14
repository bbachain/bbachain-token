/**
 * Enhanced Liquidity Pool Services for BBAChain
 * Integrates new pool utilities with existing services for better native BBA support
 */

import { NATIVE_MINT } from '@bbachain/spl-token'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { PublicKey, Keypair } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import SERVICES_KEY from '@/constants/service'
import { isNativeBBA, isNativeBBAPool, getBBATokenInfo } from '@/staticData/tokens'

import {
	createEnhancedPool,
	validatePoolCreationParams,
	getPoolCreationSummary,
	wrapBBAtoWBBA,
	createTokenAccountManual,
	EnhancedPoolCreationParams,
	EnhancedPoolCreationResult
} from './poolUtils'
import { MintInfo } from './types'

/**
 * Enhanced pool creation payload with native BBA support
 */
export interface EnhancedCreatePoolPayload {
	baseToken: MintInfo
	quoteToken: MintInfo
	baseTokenAmount: string
	quoteTokenAmount: string
	feeTier: string
	initialPrice: string
	enableNativeBBA?: boolean // Whether to enable native BBA wrapping
}

/**
 * Enhanced pool creation response
 */
export interface EnhancedCreatePoolResponse {
	poolAddress: string
	poolMint: string
	tokenAVault: string
	tokenBVault: string
	swapAuthority: string
	signature: string
	isNativeBBAPool: boolean
	lpTokenAccount: string
	feeAccount: string
	message: string
}

/**
 * Enhanced balance hook that handles native BBA properly
 */
export const useEnhancedBBABalance = () => {
	const { connection } = useConnection()
	const { publicKey: walletAddress } = useWallet()

	return useQuery({
		queryKey: [SERVICES_KEY.POOL.GET_ENHANCED_BBA_BALANCE, walletAddress?.toBase58()],
		queryFn: async () => {
			if (!walletAddress) {
				throw new Error('Wallet not connected')
			}

			// Get native BBA balance
			const nativeBalance = await connection.getBalance(walletAddress)

			// Convert to human-readable format
			const bbaDecimals = 9
			const humanBalance = nativeBalance / Math.pow(10, bbaDecimals)

			return {
				nativeBalance,
				humanBalance,
				tokenInfo: getBBATokenInfo(),
				isNative: true
			}
		},
		enabled: !!walletAddress,
		refetchInterval: 10000, // Refetch every 10 seconds
		staleTime: 5000 // 5 seconds stale time
	})
}

/**
 * Enhanced pool creation with native BBA support
 */
export const useEnhancedCreatePool = () => {
	const { connection } = useConnection()
	const { publicKey: walletAddress, signTransaction, sendTransaction } = useWallet()
	const queryClient = useQueryClient()

	return useMutation<EnhancedCreatePoolResponse, Error, EnhancedCreatePoolPayload>({
		mutationKey: [SERVICES_KEY.POOL.CREATE_ENHANCED_POOL, walletAddress?.toBase58()],
		mutationFn: async (payload) => {
			if (!walletAddress) {
				throw new Error('Wallet not connected. Please connect your wallet to create a pool.')
			}

			if (!signTransaction) {
				throw new Error('Wallet does not support transaction signing.')
			}

			console.log('🚀 Starting enhanced pool creation with native BBA support...')
			console.log('📊 Enhanced Pool Configuration:', {
				baseToken: `${payload.baseToken.symbol} (${payload.baseToken.address})`,
				quoteToken: `${payload.quoteToken.symbol} (${payload.quoteToken.address})`,
				feeTier: `${payload.feeTier}%`,
				initialPrice: `${payload.initialPrice}`,
				baseAmount: `${payload.baseTokenAmount}`,
				quoteAmount: `${payload.quoteTokenAmount}`,
				isNativeBBAPool: isNativeBBAPool(payload.baseToken.address, payload.quoteToken.address),
				enableNativeBBA: payload.enableNativeBBA
			})

			// Create temporary authority keypair
			const authority = Keypair.generate()

			// Convert addresses to PublicKey
			const tokenAMint = new PublicKey(payload.baseToken.address)
			const tokenBMint = new PublicKey(payload.quoteToken.address)

			// Parse amounts
			const tokenAAmount = parseFloat(payload.baseTokenAmount)
			const tokenBAmount = parseFloat(payload.quoteTokenAmount)
			const feeTier = parseFloat(payload.feeTier)

			// Validate inputs
			if (tokenAAmount <= 0 || tokenBAmount <= 0) {
				throw new Error('Token amounts must be greater than zero')
			}

			if (feeTier <= 0 || feeTier > 10) {
				throw new Error('Fee tier must be between 0.01% and 10%')
			}

			// Note: Enhanced pool creation uses a different approach that works with web wallets
			// We'll adapt the enhanced logic to work with sendTransaction instead of direct keypair signing

			// For now, we'll use the standard pool creation but with enhanced validation and native BBA support
			// This maintains compatibility with web wallets while providing enhanced features
			console.log('🔧 Using enhanced pool creation flow adapted for web wallets...')

			// This will be implemented as an enhanced version of the standard pool creation
			// that includes native BBA support and better validation
			throw new Error(
				'Enhanced pool creation with native BBA support is being implemented. Please use the standard pool creation for now.'
			)
		},
		onSuccess: (result) => {
			console.log('✅ Enhanced pool creation successful:', result)

			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOLS] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_POOL_STATS] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_ENHANCED_BBA_BALANCE] })
		},
		onError: (error) => {
			console.error('❌ Enhanced pool creation failed:', error)
		}
	})
}

/**
 * Enhanced pool availability check
 */
export const useEnhancedPoolAvailability = (baseToken: MintInfo, quoteToken: MintInfo) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: [SERVICES_KEY.POOL.GET_ENHANCED_POOL_AVAILABILITY, baseToken?.address, quoteToken?.address],
		queryFn: async () => {
			if (!baseToken || !quoteToken) {
				return {
					canCreate: false,
					reason: 'Both tokens must be selected'
				}
			}

			if (baseToken.address === quoteToken.address) {
				return {
					canCreate: false,
					reason: 'Base and quote tokens must be different'
				}
			}

			const isNativeBBAInvolved = isNativeBBAPool(baseToken.address, quoteToken.address)

			return {
				canCreate: true,
				isNativeBBAPool: isNativeBBAInvolved,
				nativeBBAToken: isNativeBBAInvolved ? (isNativeBBA(baseToken.address) ? baseToken : quoteToken) : null,
				recommendations: isNativeBBAInvolved
					? [
							'This pool involves native BBA (WBBA)',
							'BBA will be automatically wrapped when deposited',
							'Consider the implications of native token pools'
						]
					: []
			}
		},
		enabled: !!baseToken && !!quoteToken,
		staleTime: 30000 // 30 seconds
	})
}

/**
 * Enhanced swap quote with native BBA support
 */
export const useEnhancedSwapQuote = ({
	inputToken,
	outputToken,
	inputAmount,
	slippage = 0.5
}: {
	inputToken: MintInfo
	outputToken: MintInfo
	inputAmount: string
	slippage?: number
}) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['enhanced-swap-quote', inputToken?.address, outputToken?.address, inputAmount, slippage],
		queryFn: async () => {
			if (!inputToken || !outputToken || !inputAmount || Number(inputAmount) <= 0) {
				return null
			}

			// Handle native BBA properly
			const adjustedInputToken = isNativeBBA(inputToken.address)
				? { ...inputToken, address: NATIVE_MINT.toBase58() }
				: inputToken
			const adjustedOutputToken = isNativeBBA(outputToken.address)
				? { ...outputToken, address: NATIVE_MINT.toBase58() }
				: outputToken

			console.log('🔄 Enhanced swap quote with native BBA support:', {
				inputToken: adjustedInputToken.symbol,
				outputToken: adjustedOutputToken.symbol,
				inputAmount,
				isNativeBBAInvolved: isNativeBBAPool(inputToken.address, outputToken.address)
			})

			// Use existing swap quote logic but with enhanced BBA handling
			// This would integrate with the existing swap services
			return {
				inputAmount: Number(inputAmount),
				outputAmount: 0, // To be calculated
				minimumReceived: 0,
				priceImpact: 0,
				exchangeRate: 0,
				feeRate: 0.25,
				poolAddress: '',
				poolTvl: 0,
				isNativeBBASwap: isNativeBBAPool(inputToken.address, outputToken.address),
				inputToken: adjustedInputToken,
				outputToken: adjustedOutputToken
			}
		},
		enabled: !!inputToken && !!outputToken && !!inputAmount && Number(inputAmount) > 0,
		staleTime: 10000, // 10 seconds
		refetchInterval: 15000 // Refresh every 15 seconds
	})
}

/**
 * Enhanced swap execution with native BBA support
 */
export const useEnhancedSwapExecution = () => {
	const { connection } = useConnection()
	const { publicKey: walletAddress } = useWallet()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: {
			inputToken: MintInfo
			outputToken: MintInfo
			inputAmount: string
			slippage: number
			poolAddress: string
		}) => {
			if (!walletAddress) {
				throw new Error('Wallet not connected')
			}

			console.log('🔄 Enhanced swap execution with native BBA support:', {
				inputToken: params.inputToken.symbol,
				outputToken: params.outputToken.symbol,
				inputAmount: params.inputAmount,
				isNativeBBASwap: isNativeBBAPool(params.inputToken.address, params.outputToken.address)
			})

			// Handle native BBA wrapping/unwrapping if needed
			const isNativeBBASwap = isNativeBBAPool(params.inputToken.address, params.outputToken.address)

			if (isNativeBBASwap) {
				console.log('⚠️  Native BBA swap detected - handling WBBA operations')
				// Additional logic for native BBA handling would go here
			}

			// Execute swap with enhanced BBA handling
			// This would integrate with existing swap execution logic
			return {
				signature: 'mock_signature',
				inputAmount: Number(params.inputAmount),
				outputAmount: 0, // To be calculated
				actualOutputAmount: 0,
				priceImpact: 0,
				executionTime: 0,
				isNativeBBASwap
			}
		},
		onSuccess: (result) => {
			console.log('✅ Enhanced swap execution successful:', result)

			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: ['enhanced-swap-quote'] })
			queryClient.invalidateQueries({ queryKey: [SERVICES_KEY.POOL.GET_ENHANCED_BBA_BALANCE] })
		},
		onError: (error) => {
			console.error('❌ Enhanced swap execution failed:', error)
		}
	})
}

/**
 * Get enhanced trading pairs including native BBA
 */
export const useEnhancedTradingPairs = () => {
	return useQuery({
		queryKey: [SERVICES_KEY.POOL.GET_ENHANCED_TRADING_PAIRS],
		queryFn: async () => {
			// Get BBA token info
			const bbaToken = getBBATokenInfo()

			// Create enhanced trading pairs with native BBA support
			const enhancedPairs = [
				{
					base: bbaToken,
					quote: {
						name: 'Tether USD',
						symbol: 'USDT',
						address: 'GyWmvShQr9QGGYsqpVJtMHsyLAng4QtZRgDmwWvYTMaR',
						decimals: 6
					},
					isNativeBBAPool: true,
					recommended: true
				},
				{
					base: bbaToken,
					quote: {
						name: 'USD Coin',
						symbol: 'USDC',
						address: '3ifxm7UKBEFxVnGn3SiZh1QMW7RCJPbAeE4JYh8hiYUd',
						decimals: 9
					},
					isNativeBBAPool: true,
					recommended: true
				},
				{
					base: bbaToken,
					quote: {
						name: 'Shiba Inu',
						symbol: 'SHIB',
						address: 'LUGhbMWAWsMCmNDRivANNg1adxw2Bgqz6sAm8QYA1Qq',
						decimals: 6
					},
					isNativeBBAPool: true,
					recommended: false
				}
			]

			return enhancedPairs
		},
		staleTime: 60000, // 1 minute
		refetchInterval: 300000 // 5 minutes
	})
}

export {
	createEnhancedPool,
	validatePoolCreationParams,
	getPoolCreationSummary,
	wrapBBAtoWBBA,
	createTokenAccountManual
}
