'use client'

import Image from 'next/image'
import { useState } from 'react'
import { IoMdSettings } from 'react-icons/io'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import ExpertModeWarningDialog from '@/features/swap/components/ExpertModeWarningDialog'
import SettingDialog from '@/features/swap/components/SettingDialog'
import SwapItem from '@/features/swap/components/SwapItem'
import TokenListDialog from '@/features/swap/components/TokenListDialog'
import { TTokenProps } from '@/features/swap/types'
import { useGetTokens } from '@/features/tokens/services'
import { TGetTokenDataResponse } from '@/features/tokens/types'

const initialFromTokenProps: TTokenProps = {
	address: 'abcd',
	name: 'Binance Coin',
	symbol: 'BNB',
	icon: '/bnb-swap-icon.svg',
	balance: 2.8989
}

const initialToTokenProps: TTokenProps = {
	address: 'efgh',
	name: 'BBA Coin',
	symbol: 'BBA',
	icon: '/bba-swap-icon.svg',
	balance: 3.9899
}

const swapTokenListMapper = (data: TGetTokenDataResponse[]): TTokenProps[] => {
	return data.map((token) => {
		const fallback = `${token.mintAddress.slice(0, 6)}...`
		const { name, symbol, metadataOffChain } = token.metadata

		return {
			address: token.mintAddress,
			name: name ?? fallback,
			symbol: symbol ?? fallback,
			icon: metadataOffChain.data.image ? metadataOffChain.data.image : '/icon-placeholder.svg',
			balance: token.supply ?? 0
		} satisfies TTokenProps
	})
}

export default function Swap() {
	const getTokensQuery = useGetTokens()
	const tokenListData = getTokensQuery.data ? swapTokenListMapper(getTokensQuery.data.data) : []

	const [fromAmount, setFromAmount] = useState<string>('')
	const [toAmount, setToAmount] = useState<string>('')
	const [fromTokenProps, setFromTokenProps] = useState<TTokenProps>(initialFromTokenProps)
	const [toTokenProps, setToTokenProps] = useState<TTokenProps>(initialToTokenProps)
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useState<boolean>(false)
	const [maxSlippage, setMaxSlippage] = useState<string>('0.05%')
	const [timeLimit, setTimeLimit] = useState<string>('0')
	const [isExpertMode, setIsExpertMode] = useState<boolean>(false)
	const [isSettingDialogOpen, setIsSettingDialogOpen] = useState<boolean>(false)
	const [isExpertModeDialogOpen, setIsExpertModeDialogOpen] = useState<boolean>(false)
	const [typeItem, setTypeItem] = useState<'from' | 'to'>('from')

	const onSelectTokenFrom = () => {
		setTypeItem('from')
		setIsTokenDialogOpen(true)
	}

	const onSelectTokenTo = () => {
		setTypeItem('to')
		setIsTokenDialogOpen(true)
	}

	const onReverseSwap = () => {
		setFromAmount('')
		setFromAmount('')
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
								setTokenProps={onSelectTokenFrom}
								inputAmount={fromAmount}
								setInputAmount={setFromAmount}
							/>
							<SwapItem
								type="to"
								tokenProps={toTokenProps}
								setTokenProps={onSelectTokenTo}
								inputAmount={toAmount}
								setInputAmount={setToAmount}
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
						Max slippage: <span className="text-main-black">{maxSlippage}</span>
					</p>
					<div className="flex flex-col space-y-2.5 border-2 border-dark-grey rounded-[10px] p-2.5">
						<section className="flex text-xs justify-between">
							<p className="text-dark-grey">Rate</p>
							<p className="text-main-black">1 ETH = 1000.000 USDT</p>
						</section>
						<section className="flex text-xs justify-between">
							<p className="text-dark-grey">Minimum Received</p>
							<p className="text-main-black">1000.000 USDT</p>
						</section>
						<section className="flex text-xs justify-between">
							<p className="text-dark-grey">Price Impact</p>
							<p className="text-main-black">0.11%</p>
						</section>
					</div>
				</CardContent>
				<CardFooter className="pt-[18px] !px-0 !pb-0">
					<Button
						type="button"
						className="rounded-[48px] md:h-[55px] h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green"
					>
						Swap
					</Button>
				</CardFooter>
			</Card>
			<TokenListDialog
				data={tokenListData}
				isDataLoading={getTokensQuery.isLoading}
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
