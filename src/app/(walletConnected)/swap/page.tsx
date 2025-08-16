'use client'

import { NATIVE_MINT } from '@bbachain/spl-token'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { IoMdSettings } from 'react-icons/io'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import REGEX from '@/constants/regex'
import ExpertModeWarningDialog from '@/features/swap/components/ExpertModeWarningDialog'
import SettingDialog from '@/features/swap/components/SettingDialog'
import SwapItem from '@/features/swap/components/SwapItem'
import TokenListDialog from '@/features/swap/components/TokenListDialog'
import {
	useGetSwapQuote,
	useGetUserBalanceByMint,
	useExecuteSwap,
	useCanSwap,
	useGetSwapRoute,
	useGetTokensFromAPI,
	useGetCoinGeckoTokenPrice
} from '@/features/swap/services'
import { TTokenProps } from '@/features/swap/types'
import { getCoinGeckoId } from '@/features/swap/utils'
import { cn } from '@/lib/utils'

const initialBaseTokenProps: TTokenProps = {
	name: 'BBA Coin',
	symbol: 'BBA',
	address: NATIVE_MINT.toBase58(),
	logoURI: '/bba_logo.svg',
	decimals: 9,
	tags: ['native']
}

const initialQuoteTokenProps: TTokenProps = {
	name: 'Tether USD',
	symbol: 'USDT',
	address: 'C5CpKwRY2Q5kPYhx78XimCg2eRT3YUgPFAoocFF7Vgf',
	logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
	decimals: 6,
	tags: ['stablecoin']
}

export default function Swap() {
	/**
	 * Enhanced Swap Page with URL Parameter Support
	 *
	 * Features:
	 * - URL parameters: /swap?from=<token_address>&to=<token_address>
	 * - Dynamic token fetching from /api/tokens endpoint
	 * - Automatic URL sync when tokens are selected
	 * - Fallback to hardcoded tokens if URL params not found
	 *
	 * Example: /swap?from=LUGhbMWAWsMCmNDRivANNg1adxw2Bgqz6sAm8QYA1Qq&to=GyWmvShQr9QGGYsqpVJtMHsyLAng4QtZRgDmwWvYTMaR
	 */
	const searchParams = useSearchParams()
	const router = useRouter()
	const [amountIn, setAmountIn] = useState<string>('')
	const [fromTokenProps, setFromTokenProps] = useState<TTokenProps>(initialBaseTokenProps)
	const [toTokenProps, setToTokenProps] = useState<TTokenProps>(initialQuoteTokenProps)
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useState<boolean>(false)
	const [maxSlippage, setMaxSlippage] = useState<number>(0.5)
	const [timeLimit, setTimeLimit] = useState<string>('0')
	const [isExpertMode, setIsExpertMode] = useState<boolean>(false)
	const [isSettingDialogOpen, setIsSettingDialogOpen] = useState<boolean>(false)
	const [isExpertModeDialogOpen, setIsExpertModeDialogOpen] = useState<boolean>(false)
	const [typeItem, setTypeItem] = useState<'from' | 'to'>('from')

	// Get all tokens from API for lookup
	const { data: allTokens } = useGetTokensFromAPI('')

	// Handle URL parameters for token initialization
	useEffect(() => {
		const fromParam = searchParams.get('from')
		const toParam = searchParams.get('to')

		// Function to find token by address from API
		const findTokenByAddress = (address: string): TTokenProps | null => {
			if (!allTokens?.data) return null

			const token = allTokens.data.find((token) => token.address === address)
			if (!token) return null

			return {
				address: token.address,
				logoURI: token.logoURI,
				symbol: token.symbol,
				name: token.name,
				decimals: token.decimals,
				tags: token.tags || []
			}
		}

		if (fromParam && allTokens?.data) {
			const fromToken = findTokenByAddress(fromParam)
			if (fromToken) {
				console.log('🔄 Setting from token from URL:', fromToken)
				setFromTokenProps(fromToken)
			}
		}

		if (toParam && allTokens?.data) {
			const toToken = findTokenByAddress(toParam)
			if (toToken) {
				console.log('🔄 Setting to token from URL:', toToken)
				setToTokenProps(toToken)
			}
		}
	}, [searchParams, allTokens])

	// Function to update URL with current token selection
	const updateURLParams = useCallback(
		(fromToken: TTokenProps, toToken: TTokenProps) => {
			const params = new URLSearchParams()
			params.set('from', fromToken.address)
			params.set('to', toToken.address)

			// Update URL without page reload
			router.push(`/swap?${params.toString()}`, { scroll: false })
		},
		[router]
	)

	useEffect(() => {
		updateURLParams(fromTokenProps, toTokenProps)
	}, [fromTokenProps, toTokenProps, updateURLParams])

	// Enhanced swap quote using onchain pools
	const swapQuoteQuery = useGetSwapQuote({
		inputMint: fromTokenProps.address,
		outputMint: toTokenProps.address,
		inputAmount: amountIn,
		slippage: maxSlippage
	})

	const isSwapQuoteLoading = swapQuoteQuery.isLoading || swapQuoteQuery.isRefetching

	// Check if swap is possible
	const canSwapQuery = useCanSwap(fromTokenProps.address, toTokenProps.address)

	// Get swap route information
	const swapRouteQuery = useGetSwapRoute(fromTokenProps.address, toTokenProps.address)

	// Get user balances
	const getMintABalance = useGetUserBalanceByMint({ mintAddress: fromTokenProps.address })
	const getMintBBalance = useGetUserBalanceByMint({ mintAddress: toTokenProps.address })

	// Get token prices (fallback to external API if needed)
	const getMintATokenPrice = useGetCoinGeckoTokenPrice({ coinGeckoId: getCoinGeckoId(fromTokenProps.address) })
	const getMintBTokenPrice = useGetCoinGeckoTokenPrice({ coinGeckoId: getCoinGeckoId(toTokenProps.address) })

	// Swap execution
	const executeSwapMutation = useExecuteSwap()

	// Debug logging
	useEffect(() => {
		console.log('🔍 Swap Debug Info:', {
			inputAmount: amountIn,
			inputAmountNumber: Number(amountIn),
			inputAmountValid: amountIn && Number(amountIn) > 0,
			fromToken: fromTokenProps.symbol,
			toToken: toTokenProps.symbol,
			swapQuoteLoading: swapQuoteQuery.isLoading || swapQuoteQuery.isRefetching,
			swapQuoteError: swapQuoteQuery.error,
			swapQuoteData: swapQuoteQuery.data,
			canSwap: canSwapQuery.data,
			canSwapLoading: canSwapQuery.isLoading,
			route: swapRouteQuery.data
		})
	}, [amountIn, fromTokenProps.symbol, toTokenProps.symbol, swapQuoteQuery, canSwapQuery, swapRouteQuery])

	// Computed values
	const swapQuote = swapQuoteQuery.data
	const mintABalance = getMintABalance.data?.balance ?? 0
	const mintBBalance = getMintBBalance.data?.balance ?? 0
	const mintAInitialPrice = getMintATokenPrice.data ?? 0
	const mintBInitialPrice = getMintBTokenPrice.data ?? 0

	// Calculate USD values
	const inputAmount = swapQuote?.inputAmount ?? 0
	const outputAmount = swapQuote?.outputAmount ?? 0
	const baseTokenPrice = inputAmount * mintAInitialPrice
	const quoteTokenPrice = outputAmount * mintBInitialPrice

	useEffect(() => {
		console.log('base token price ', baseTokenPrice)
	}, [baseTokenPrice])

	// Improved validation
	const userInputAmount = Number(amountIn) || 0
	const userTokenBalance = mintABalance / Math.pow(10, fromTokenProps.decimals)
	const isBaseTokenBalanceNotEnough = userInputAmount > userTokenBalance
	// Allow positive decimals for swap input
	const isAmountPositive = REGEX.POSITIVE_DECIMAL.test(amountIn) && userInputAmount > 0
	const hasValidTokenPair = fromTokenProps.address !== toTokenProps.address
	const isValid =
		!isBaseTokenBalanceNotEnough && isAmountPositive && hasValidTokenPair && canSwapQuery.data === true && swapQuote

	// Exchange rate and other computed values
	const exchangeRate = swapQuote?.exchangeRate
		? `1 ${fromTokenProps.symbol} = ${swapQuote.exchangeRate.toFixed(6)} ${toTokenProps.symbol}`
		: '-'
	const minimumReceived = swapQuote?.minimumReceived
		? `${swapQuote.minimumReceived.toFixed(6)} ${toTokenProps.symbol}`
		: '-'
	const priceImpact = swapQuote?.priceImpact ? `${swapQuote.priceImpact.toFixed(2)}%` : '-'

	const onSelectTokenFrom = () => {
		setTypeItem('from')
		setIsTokenDialogOpen(true)
	}

	const onSelectTokenTo = () => {
		setTypeItem('to')
		setIsTokenDialogOpen(true)
	}

	const handleInputChange = (val: string) => {
		console.log('💰 Input amount changed:', val)
		setAmountIn(val)
	}

	// Enhanced token setters that update URL
	const setFromTokenWithURL = (token: TTokenProps) => {
		setFromTokenProps(token)
	}

	const setToTokenWithURL = (token: TTokenProps) => {
		setToTokenProps(token)
	}

	const onReverseSwap = () => {
		console.log('🔄 Reversing swap tokens')
		setAmountIn('')
		const newFromToken = toTokenProps
		const newToToken = fromTokenProps
		setFromTokenProps(newFromToken)
		setToTokenProps(newToToken)
	}

	const handleSwap = async () => {
		if (!swapQuote || !isValid) {
			console.error('❌ Cannot execute swap:', { swapQuote: !!swapQuote, isValid })
			return
		}

		try {
			const result = await executeSwapMutation.mutateAsync({
				inputMint: fromTokenProps.address,
				outputMint: toTokenProps.address,
				inputAmount: amountIn,
				slippage: maxSlippage,
				poolAddress: swapQuote.poolAddress
			})

			toast.success(`Swap successful! Received ${result.actualOutputAmount.toFixed(6)} ${toTokenProps.symbol}`, {
				duration: 5000
			})

			// Reset form
			setAmountIn('')
		} catch (error) {
			console.error('Swap failed:', error)
			toast.error(error instanceof Error ? error.message : 'Swap failed. Please try again.', {
				duration: 5000
			})
		}
	}

	return (
		<div className="px-[15px] flex flex-col items-center lg:space-y-14 md:space-y-9 space-y-3">
			<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">Swap Assets</h1>

			<Card className="md:w-[550px] w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
				<CardHeader className="text-center flex flex-row items-center justify-between space-y-0 p-0 md:pb-[18px] pb-3">
					<CardTitle className="md:text-xl text-lg text-main-black font-medium">Swap</CardTitle>
					<Button
						type="button"
						onClick={() => setIsSettingDialogOpen(true)}
						className="[&_svg]:size-5"
						size="icon"
						variant="ghost"
					>
						<IoMdSettings />
					</Button>
				</CardHeader>

				<CardContent className="p-0 flex flex-col space-y-[18px]">
					<section className="relative">
						<div className="flex flex-col space-y-3">
							<SwapItem
								type="from"
								tokenProps={fromTokenProps}
								balance={userTokenBalance}
								price={baseTokenPrice}
								setTokenProps={onSelectTokenFrom}
								inputAmount={amountIn}
								setInputAmount={handleInputChange}
							/>
							<SwapItem
								type="to"
								tokenProps={toTokenProps}
								balance={mintBBalance / Math.pow(10, toTokenProps.decimals)}
								price={quoteTokenPrice}
								setTokenProps={onSelectTokenTo}
								inputAmount={outputAmount > 0 ? outputAmount.toString() : ''}
								setInputAmount={() => {}} // Output is read-only
								disable={true}
							/>
						</div>
						<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
							<Button
								onClick={onReverseSwap}
								type="button"
								variant="ghost"
								size="icon"
								className="rounded-full border-4 bg-box border-main-green w-14 h-14"
							>
								<Image src="/swap-arrow-icon.svg" width={24} height={24} alt="swap arrow icon" />
							</Button>
						</div>
					</section>

					{/* Enhanced swap information */}
					<div className="flex flex-col space-y-2">
						<p className="text-xs text-dark-grey">
							Max slippage: <span className="text-main-black">{maxSlippage}%</span>
						</p>

						{/* Loading state for quote */}
						{isSwapQuoteLoading && (
							<p className="text-xs text-blue-600 flex items-center gap-2">
								<Loader2 className="w-3 h-3 animate-spin" />
								Calculating best price...
							</p>
						)}

						{/* Error state */}
						{swapQuoteQuery.error && (
							<p className="text-xs text-red-500">
								Error: {swapQuoteQuery.error instanceof Error ? swapQuoteQuery.error.message : 'Failed to get quote'}
							</p>
						)}

						{/* Pool information */}
						{swapQuote && (
							<p className="text-xs text-dark-grey">
								Pool TVL: <span className="text-main-black">${swapQuote.poolTvl.toLocaleString()}</span>
							</p>
						)}

						{/* Routing information */}
						{swapRouteQuery.data && (
							<p className="text-xs text-dark-grey">
								Route: <span className="text-main-black">{swapRouteQuery.data.type}</span>
							</p>
						)}

						{/* Warning for no liquidity */}
						{canSwapQuery.data === false && (
							<p className="text-xs text-red-500">No liquidity pool available for this token pair</p>
						)}

						{/* Input validation warnings */}
						{amountIn && !isAmountPositive && (
							<p className="text-xs text-red-500">Please enter a valid positive amount</p>
						)}

						{amountIn && isBaseTokenBalanceNotEnough && (
							<p className="text-xs text-red-500">Insufficient {fromTokenProps.symbol} balance</p>
						)}
					</div>

					<div className="flex flex-col space-y-2.5 border-2 border-dark-grey rounded-[10px] p-2.5">
						<section className="flex text-xs justify-between">
							<p className="text-dark-grey">Rate</p>
							<p className="text-main-black">{exchangeRate}</p>
						</section>
						<section className="flex text-xs justify-between">
							<p className="text-dark-grey">Minimum Received</p>
							<p className="text-main-black">{minimumReceived}</p>
						</section>
						<section className="flex text-xs justify-between">
							<p className="text-dark-grey">Price Impact</p>
							<p
								className={cn(
									'text-main-black',
									swapQuote?.priceImpact && swapQuote.priceImpact > 5 && 'text-red-500',
									swapQuote?.priceImpact && swapQuote.priceImpact > 1 && swapQuote.priceImpact <= 5 && 'text-yellow-500'
								)}
							>
								{priceImpact}
							</p>
						</section>
						{swapQuote && (
							<section className="flex text-xs justify-between">
								<p className="text-dark-grey">Trading Fee</p>
								<p className="text-main-black">{swapQuote.feeRate.toFixed(2)}%</p>
							</section>
						)}
					</div>
				</CardContent>

				<CardFooter className="pt-[18px] !px-0 !pb-0">
					<Button
						disabled={!isValid || isSwapQuoteLoading || executeSwapMutation.isPending}
						type="button"
						onClick={handleSwap}
						className={cn(
							'rounded-[48px] md:h-[55px] h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green',
							!isValid && 'hover:cursor-not-allowed'
						)}
					>
						{(isSwapQuoteLoading || executeSwapMutation.isPending) && <Loader2 className="animate-spin mr-2" />}
						{executeSwapMutation.isPending
							? 'Swapping...'
							: isSwapQuoteLoading
								? 'Computing...'
								: !hasValidTokenPair
									? 'Select Different Tokens'
									: canSwapQuery.data === false
										? 'No Pool Available'
										: !isAmountPositive
											? 'Enter Amount'
											: isBaseTokenBalanceNotEnough
												? 'Insufficient Balance'
												: 'Swap'}
					</Button>
				</CardFooter>
			</Card>

			{/* Enhanced Token Selection Dialog */}
			<TokenListDialog
				isOpen={isTokenDialogOpen}
				setIsOpen={setIsTokenDialogOpen}
				type={typeItem}
				selectedFrom={fromTokenProps}
				setSelectedFrom={setFromTokenWithURL}
				selectedTo={toTokenProps}
				setSelectedTo={setToTokenWithURL}
			/>

			<SettingDialog
				isOpen={isSettingDialogOpen}
				setIsOpen={setIsSettingDialogOpen}
				maxSlippage={maxSlippage}
				setMaxSlippage={setMaxSlippage}
				timeLimit={timeLimit}
				setTimeLimit={setTimeLimit}
				isExpertMode={isExpertMode}
				setIsExpertMode={setIsExpertMode}
				setIsExpertModeOpen={setIsExpertModeDialogOpen}
			/>

			<ExpertModeWarningDialog
				isOpen={isExpertModeDialogOpen}
				setIsOpen={setIsExpertModeDialogOpen}
				setIsExpertMode={setIsExpertMode}
			/>
		</div>
	)
}
