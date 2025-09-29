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
import { useGetSwapQuote, useExecuteSwap, useGetSwapRoute } from '@/features/swap/services'
import TradeableTokenListDialog from '@/features/tokens/components/TradeableTokenListDialog'
import { useGetTokenPriceByCoinGeckoId, useGetTradeableTokens } from '@/features/tokens/services'
import { TTradeableTokenProps } from '@/features/tokens/types'
import { formatTokenBalance, getCoinGeckoId } from '@/lib/token'
import { cn } from '@/lib/utils'
import { useGetTokenBalanceByMint } from '@/services/wallet'
import { USDT_MINT } from '@/staticData/tokens'

const initialTradeableToken: TTradeableTokenProps = {
	address: '',
	symbol: '',
	name: '',
	decimals: 0
}

export default function Swap() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [amountIn, setAmountIn] = useState<string>('')
	const [fromTokenProps, setFromTokenProps] = useState<TTradeableTokenProps>(initialTradeableToken)
	const [toTokenProps, setToTokenProps] = useState<TTradeableTokenProps>(initialTradeableToken)
	const [maxSlippage, setMaxSlippage] = useState<number>(0.5)
	const [timeLimit, setTimeLimit] = useState<string>('0')
	const [isExpertMode, setIsExpertMode] = useState<boolean>(false)
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useState<boolean>(false)
	const [isSettingDialogOpen, setIsSettingDialogOpen] = useState<boolean>(false)
	const [isExpertModeDialogOpen, setIsExpertModeDialogOpen] = useState<boolean>(false)
	const [tokenDialogType, setTokenDialogType] = useState<'from' | 'to'>('from')
	const [inputType, setInputType] = useState<'from' | 'to'>('from')

	// Get all tokens from API for lookup
	const { data: allTokens, isLoading: isTokensLoading } = useGetTradeableTokens('')

	// Handle URL parameters for token initialization
	useEffect(() => {
		const fromParam = searchParams.get('from')
		const toParam = searchParams.get('to')

		// Function to find token by address from API
		const findTokenByAddress = (address: string): TTradeableTokenProps | null => {
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

		const fromToken = findTokenByAddress(fromParam ?? '')
		const toToken = findTokenByAddress(toParam ?? '')
		if (fromToken) setFromTokenProps(fromToken)
		if (toToken) setToTokenProps(toToken)
	}, [searchParams, allTokens])

	// Function to update URL with current token selection
	const updateURLParams = useCallback(
		(fromToken: TTradeableTokenProps, toToken: TTradeableTokenProps) => {
			const params = new URLSearchParams()
			params.set('from', fromToken.address ? fromToken.address : NATIVE_MINT.toBase58())
			params.set('to', toToken.address ? toToken.address : USDT_MINT.toBase58())
			// Update URL without page reload
			router.push(`/swap?${params.toString()}`, { scroll: false })
		},
		[router]
	)

	useEffect(() => {
		updateURLParams(fromTokenProps, toTokenProps)
	}, [fromTokenProps, toTokenProps, updateURLParams])

	// Get swap route information
	const getSwapRouteQuery = useGetSwapRoute({
		inputMint: fromTokenProps.address,
		outputMint: toTokenProps.address
	})
	const swapRouteData = getSwapRouteQuery?.data

	// Enhanced swap quote using onchain pools
	const getSwapQuoteQuery = useGetSwapQuote({
		pool: swapRouteData?.pools[0],
		inputMint: fromTokenProps.address,
		outputMint: toTokenProps.address,
		inputAmount: amountIn,
		slippage: maxSlippage,
		inputType
	})
	const swapQuoteData = getSwapQuoteQuery.data

	const isSwapQuoteLoading =
		getSwapRouteQuery.isLoading ||
		getSwapRouteQuery.isRefetching ||
		getSwapQuoteQuery.isLoading ||
		getSwapQuoteQuery.isRefetching

	// Swap execution
	const executeSwapMutation = useExecuteSwap()

	// Get user balances
	const getMintABalance = useGetTokenBalanceByMint({ mintAddress: fromTokenProps.address })
	const getMintBBalance = useGetTokenBalanceByMint({ mintAddress: toTokenProps.address })
	const mintABalance = getMintABalance.data ?? 0
	const mintBBalance = getMintBBalance.data ?? 0
	const mintABalanceFormatted = formatTokenBalance(mintABalance, fromTokenProps.decimals)
	const mintBBalanceFormatted = formatTokenBalance(mintBBalance, toTokenProps.decimals)

	// get input/output amounts
	const outputAmount = parseFloat(swapQuoteData?.outputAmount.toFixed(6) ?? '').toString() ?? ''
	const inputAmount = parseFloat(swapQuoteData?.inputAmount.toFixed(6) ?? '').toString() ?? ''

	// Improved validation
	const userInputAmount = Number(inputAmount) || 0
	const userMaximumInputAmount = Number(swapQuoteData?.maximumInput ?? 0)
	const userTokenBalance = mintABalanceFormatted
	const isBalanceEnough =
		inputType === 'from'
			? userInputAmount <= userTokenBalance
			: userMaximumInputAmount <= userTokenBalance
	const isInputPositive = REGEX.POSITIVE_DECIMAL.test(userInputAmount.toString())
	const isTokenPairValid = fromTokenProps.address !== toTokenProps.address
	const isQuoteError = getSwapQuoteQuery.isError && getSwapQuoteQuery.error
	const isValid = isBalanceEnough && isInputPositive && isTokenPairValid && swapQuoteData

	// get mint prices
	const getMintACoinGeckoId = getCoinGeckoId(fromTokenProps.address)
	const getMintBCoinGeckoId = getCoinGeckoId(toTokenProps.address)
	const getMintAPrice = useGetTokenPriceByCoinGeckoId({ coinGeckoId: getMintACoinGeckoId })
	const getMintBPrice = useGetTokenPriceByCoinGeckoId({ coinGeckoId: getMintBCoinGeckoId })
	const mintAPrice = getMintAPrice.data ?? 0
	const mintBPrice = getMintBPrice.data ?? 0
	const inputAmountPrice = mintAPrice * userInputAmount
	const outputAmountPrice = mintBPrice * (Number(outputAmount) || 0)

	// Exchange rate and other computed values for UI
	const exchangeRate = swapQuoteData?.exchangeRate
		? `1 ${fromTokenProps.symbol} = ${swapQuoteData.exchangeRate.toFixed(6)} ${toTokenProps.symbol}`
		: '-'
	const minimumReceived = swapQuoteData?.minimumReceived
		? `${swapQuoteData.minimumReceived.toFixed(6)} ${toTokenProps.symbol}`
		: '-'
	const maximumInput = swapQuoteData?.maximumInput
		? `${swapQuoteData.maximumInput.toFixed(6)} ${fromTokenProps.symbol}`
		: '-'
	const priceImpact = swapQuoteData?.priceImpact ? `${swapQuoteData.priceImpact.toFixed(2)}%` : '-'

	const onSelectTokenFrom = () => {
		setTokenDialogType('from')
		setIsTokenDialogOpen(true)
	}

	const onSelectTokenTo = () => {
		setTokenDialogType('to')
		setIsTokenDialogOpen(true)
	}

	const handleBaseInputChange = (val: string) => {
		setInputType('from')
		setAmountIn(val)
	}

	const handleQuoteInputChange = (val: string) => {
		setInputType('to')
		setAmountIn(val)
	}

	// Enhanced token setters that update URL
	const setFromTokenWithURL = (token: TTradeableTokenProps) => {
		setFromTokenProps(token)
	}

	const setToTokenWithURL = (token: TTradeableTokenProps) => {
		setToTokenProps(token)
	}

	const onReverseSwap = () => {
		const newFromToken = toTokenProps
		const newToToken = fromTokenProps
		setFromTokenProps(newFromToken)
		setToTokenProps(newToToken)
	}

	const handleSwap = async () => {
		if (!swapQuoteData || !isValid) {
			console.error('❌ Cannot execute swap:', { swapQuote: !!swapQuoteData, isValid })
			return
		}

		try {
			const result = await executeSwapMutation.mutateAsync({
				inputMint: fromTokenProps.address,
				outputMint: toTokenProps.address,
				inputAmount,
				slippage: maxSlippage,
				pool: swapRouteData?.pools[0]
			})

			toast.success(result.message, {
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

	const buttonDisplay = () => {
		if (executeSwapMutation.isPending) return 'Swapping...'
		else if (isSwapQuoteLoading) return 'Computing...'
		else if (!isTokenPairValid) return 'Select Different Tokens'
		else if (!isInputPositive) return 'Enter Valid Amount'
		else if (!isBalanceEnough) return 'Insufficient Balance'
		else if (!swapRouteData) return 'No Pool Available'
		else if (isQuoteError) return 'Failed to Get Quote'
		else return 'Swap'
	}

	if (isTokensLoading) {
		return (
			<div className="h-full w-full md:mt-20 mt-40 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p className="text-gray-600 dark:text-gray-400">Loading Token List...</p>
			</div>
		)
	}

	return (
		<div className="px-[15px] flex flex-col items-center lg:space-y-14 md:space-y-9 space-y-3">
			<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">
				Swap Assets
			</h1>

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
								balance={mintABalanceFormatted}
								price={inputAmountPrice}
								setTokenProps={onSelectTokenFrom}
								inputAmount={inputType === 'from' ? amountIn : inputAmount}
								setInputAmount={handleBaseInputChange}
							/>
							<SwapItem
								type="to"
								tokenProps={toTokenProps}
								balance={mintBBalanceFormatted}
								price={outputAmountPrice}
								setTokenProps={onSelectTokenTo}
								inputAmount={inputType === 'to' ? amountIn : outputAmount}
								setInputAmount={handleQuoteInputChange}
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

						{/* Pool information */}
						{swapQuoteData && (
							<p className="text-xs text-dark-grey">
								Pool TVL:{' '}
								<span className="text-main-black">${swapQuoteData.poolTvl.toLocaleString()}</span>
							</p>
						)}

						{/* Routing information */}
						{swapRouteData && (
							<p className="text-xs text-dark-grey">
								Route: <span className="text-main-black">{swapRouteData.type}</span>
							</p>
						)}

						{/* Warning for no liquidity */}
						{swapRouteData && !swapRouteData?.pools[0] && (
							<p className="text-xs text-red-500">
								No liquidity pool available for this token pair
							</p>
						)}

						{/* Error state */}
						{isQuoteError && (
							<p className="text-xs text-red-500">
								Error:{' '}
								{getSwapQuoteQuery.error instanceof Error
									? getSwapQuoteQuery.error.message
									: 'Failed to get quote'}
							</p>
						)}

						{/* Input validation warnings */}
						{isInputPositive === false && (
							<p className="text-xs text-red-500">Please enter a valid positive amount</p>
						)}
						{isBalanceEnough === false && (
							<p className="text-xs text-red-500">Insufficient {fromTokenProps.symbol} balance</p>
						)}
					</div>

					<div className="flex flex-col space-y-2.5 border-2 border-dark-grey rounded-[10px] p-2.5">
						<section className="flex text-xs justify-between">
							<p className="text-dark-grey">Rate</p>
							<p className="text-main-black">{exchangeRate}</p>
						</section>
						{inputType === 'from' && (
							<section className="flex text-xs justify-between">
								<p className="text-dark-grey">Minimum Received</p>
								<p className="text-main-black">{minimumReceived}</p>
							</section>
						)}
						{inputType === 'to' && (
							<section className="flex text-xs justify-between">
								<p className="text-dark-grey">Maximum Input</p>
								<p className="text-main-black">{maximumInput}</p>
							</section>
						)}
						<section className="flex text-xs justify-between">
							<p className="text-dark-grey">Price Impact</p>
							<p
								className={cn(
									'text-main-black',
									swapQuoteData?.priceImpact && swapQuoteData.priceImpact > 5 && 'text-red-500',
									swapQuoteData?.priceImpact &&
										swapQuoteData.priceImpact > 1 &&
										swapQuoteData.priceImpact <= 5 &&
										'text-yellow-500'
								)}
							>
								{priceImpact}
							</p>
						</section>
						{swapQuoteData && (
							<section className="flex text-xs justify-between">
								<p className="text-dark-grey">Trading Fee</p>
								<p className="text-main-black">{swapQuoteData.feeRate.toFixed(2)}%</p>
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
						{(isSwapQuoteLoading || executeSwapMutation.isPending) && (
							<Loader2 className="animate-spin mr-2" />
						)}
						{buttonDisplay()}
					</Button>
				</CardFooter>
			</Card>

			{/* Enhanced Token Selection Dialog */}
			<TradeableTokenListDialog
				isOpen={isTokenDialogOpen}
				setIsOpen={setIsTokenDialogOpen}
				type={tokenDialogType}
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
