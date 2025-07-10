'use client'

import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { IoMdSettings } from 'react-icons/io'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import REGEX from '@/constants/regex'
import ExpertModeWarningDialog from '@/features/swap/components/ExpertModeWarningDialog'
import SettingDialog from '@/features/swap/components/SettingDialog'
import SwapItem from '@/features/swap/components/SwapItem'
import TokenListDialog from '@/features/swap/components/TokenListDialog'
import {
	useGetSwappableTokens,
	useGetSwappableTokens2,
	useGetSwappableTokens3,
	useGetSwapTransactionByMint,
	useGetTokenPrice,
	useGetUserBalanceByMint
} from '@/features/swap/services'
import { TTokenProps } from '@/features/swap/types'
import { cn } from '@/lib/utils'
import StaticTokens from '@/staticData/tokens'

const initialBaseTokenProps: TTokenProps = {
	address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
	logoURI: 'https://img-v1.raydium.io/icon/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB.png',
	symbol: 'USDT',
	name: 'USDT',
	decimals: 6
}

const initialQuoteTokenProps: TTokenProps = {
	chainId: 101,
	address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
	programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
	logoURI: 'https://img-v1.raydium.io/icon/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
	symbol: 'USDC',
	name: 'USD Coin',
	decimals: 6,
	tags: ['hasFreeze'],
	extensions: {}
}

export default function Swap() {
	const [amountIn, setAmountIn] = useState<string>('')
	const [fromTokenProps, setFromTokenProps] = useState<TTokenProps>(initialBaseTokenProps)
	const [toTokenProps, setToTokenProps] = useState<TTokenProps>(initialQuoteTokenProps)
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useState<boolean>(false)
	const [maxSlippage, setMaxSlippage] = useState<number>(0.05)
	const [timeLimit, setTimeLimit] = useState<string>('0')
	const [isExpertMode, setIsExpertMode] = useState<boolean>(false)
	const [isSettingDialogOpen, setIsSettingDialogOpen] = useState<boolean>(false)
	const [isExpertModeDialogOpen, setIsExpertModeDialogOpen] = useState<boolean>(false)
	const [typeItem, setTypeItem] = useState<'from' | 'to'>('from')

	const swapType = typeItem === 'from' ? 'BaseIn' : 'BaseOut'
	const inputMint = fromTokenProps.address
	const outputMint = toTokenProps.address
	const decimals = swapType === 'BaseIn' ? fromTokenProps.decimals : fromTokenProps.decimals

	const getSwapTransactionQuery = useGetSwapTransactionByMint({
		swapType,
		inputMint,
		outputMint,
		amount: amountIn,
		decimals,
		slippage: maxSlippage
	})
	const computeSwapResult = getSwapTransactionQuery.data?.data

	const inputAmount =
		computeSwapResult && fromTokenProps
			? Number(computeSwapResult.inputAmount) / 10 ** fromTokenProps.decimals
			: computeSwapResult?.inputAmount || ''
	const outputAmount =
		computeSwapResult && toTokenProps
			? Number(computeSwapResult.outputAmount) / 10 ** toTokenProps.decimals
			: computeSwapResult?.outputAmount || ''
	const exchangeRate =
		(computeSwapResult &&
			`1 ${fromTokenProps.symbol} = ${Number(outputAmount) / Number(inputAmount)} ${toTokenProps.symbol}`) ||
		'-'
	const minimumReceived = computeSwapResult
		? Number(outputAmount) - Number(outputAmount) * maxSlippage + ' ' + toTokenProps.symbol
		: '-'
	const priceImpact = computeSwapResult ? computeSwapResult.priceImpactPct * 100 + '%' : '-'

	const getMintABalance = useGetUserBalanceByMint({ mintAddress: fromTokenProps.address })
	const getMintBBalance = useGetUserBalanceByMint({ mintAddress: toTokenProps.address })
	const getMintATokenPrice = useGetTokenPrice({ mintAddress: fromTokenProps.address })
	const getMintBTokenPrice = useGetTokenPrice({ mintAddress: toTokenProps.address })

	const mintABalance = getMintABalance.data ? getMintABalance.data.balance : 0
	const mintBBalance = getMintBBalance.data ? getMintBBalance.data.balance : 0
	const mintAInitialPrice = getMintATokenPrice.data ? getMintATokenPrice.data.usdRate : 0
	const mintBInitialPrice = getMintBTokenPrice.data ? getMintBTokenPrice.data.usdRate : 0

	const baseTokenPrice = Number(inputAmount) > 0 ? Number(inputAmount) * mintAInitialPrice : 0
	const quoteTokenPrice = Number(outputAmount) > 0 ? Number(outputAmount) * mintBInitialPrice : 0

	const isBaseTokenBalanceNotEnough = Number(inputAmount) > mintABalance
	const isAmountPositive =
		REGEX.POSITIVE_NUMBER.test(String(inputAmount)) && REGEX.POSITIVE_NUMBER.test(String(inputAmount))
	const isValid = !isBaseTokenBalanceNotEnough && isAmountPositive

	useEffect(() => {
		console.log('mint a balance ', mintABalance)
	}, [mintABalance])

	const onSelectTokenFrom = () => {
		setTypeItem('from')
		setIsTokenDialogOpen(true)
	}

	const onSelectTokenTo = () => {
		setTypeItem('to')
		setIsTokenDialogOpen(true)
	}

	const handleInputChange = (val: string) => {
		setTypeItem('from')
		setAmountIn(val)
	}

	const handleOutputChange = (val: string) => {
		setTypeItem('to')
		setAmountIn(val)
	}

	const onReverseSwap = () => {
		handleInputChange('')
		handleOutputChange('')
		setFromTokenProps(toTokenProps)
		setToTokenProps(fromTokenProps)
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
								balance={mintABalance}
								price={baseTokenPrice}
								setTokenProps={onSelectTokenFrom}
								inputAmount={swapType === 'BaseIn' ? amountIn : inputAmount.toString()}
								setInputAmount={handleInputChange}
							/>
							<SwapItem
								type="to"
								tokenProps={toTokenProps}
								balance={mintBBalance}
								price={quoteTokenPrice}
								setTokenProps={onSelectTokenTo}
								inputAmount={swapType === 'BaseIn' ? outputAmount.toString() : amountIn}
								setInputAmount={handleOutputChange}
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
					<p className="text-xs text-dark-grey">
						Max slippage: <span className="text-main-black">{maxSlippage}%</span>
					</p>
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
							<p className="text-main-black">{priceImpact}</p>
						</section>
					</div>
				</CardContent>
				<CardFooter className="pt-[18px] !px-0 !pb-0">
					<Button
						disabled={!isValid || getSwapTransactionQuery.isLoading}
						type="button"
						className={cn(
							'rounded-[48px] md:h-[55px] h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green',
							!isValid && 'hover:cursor-not-allowed'
						)}
					>
						{getSwapTransactionQuery.isLoading && <Loader2 className="animate-spin" />}
						{getSwapTransactionQuery.isLoading ? 'Computing' : 'Swap'}
					</Button>
				</CardFooter>
			</Card>
			<TokenListDialog
				data={StaticTokens}
				isDataLoading={false}
				isOpen={isTokenDialogOpen}
				setIsOpen={setIsTokenDialogOpen}
				type={typeItem}
				selectedFrom={fromTokenProps}
				setSelectedFrom={setFromTokenProps}
				selectedTo={toTokenProps}
				setSelectedTo={setToTokenProps}
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
