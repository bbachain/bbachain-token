'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { HiOutlineAdjustmentsHorizontal } from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import LPSlippageDialog from '@/features/liquidityPool/components/LPSlippageDialog'
import SelectTokenFarm from '@/features/liquidityPool/components/SelectTokenFarm'
import TokenFarmItem from '@/features/liquidityPool/components/TokenFarmItem'
import { TTokenFarmProps } from '@/features/liquidityPool/types'
import SwapItem from '@/features/swap/components/SwapItem'
import { TTokenProps } from '@/features/swap/types'

import { PoolStaticData } from '../../page'

const initialTokeProps: TTokenProps = {
	address: '',
	name: '',
	symbol: '',
	icon: '',
	balance: 0
}

const tokenFarmData: TTokenFarmProps[] = [
	{
		id: '1',
		fromToken: {
			address: 'abcd',
			name: 'Binance Coin',
			symbol: 'BNB',
			icon: '/bnb-swap-icon.svg',
			balance: 2.8989
		},
		toToken: {
			address: 'efgh',
			name: 'BBA Coin',
			symbol: 'BBA',
			icon: '/bba-swap-icon.svg',
			balance: 3.9899
		},
		tvl: '$1,435.34',
		apr: '0%'
	},
	{
		id: '2',
		fromToken: {
			address: 'abcd',
			name: 'Ethereum',
			symbol: 'ETH',
			icon: '/bnb-swap-icon.svg',
			balance: 2.8989
		},
		toToken: {
			address: 'efgh',
			name: 'BBA Coin',
			symbol: 'BBA',
			icon: '/bba-swap-icon.svg',
			balance: 3.9899
		},
		tvl: '$2,547.00',
		apr: '0.25%'
	},
	{
		id: '3',
		fromToken: {
			address: 'abcd',
			name: 'Binance Coin',
			symbol: 'BNB',
			icon: '/bnb-swap-icon.svg',
			balance: 2.8989
		},
		toToken: {
			address: 'efgh',
			name: 'BBA Coin',
			symbol: 'BBA',
			icon: '/bba-swap-icon.svg',
			balance: 3.9899
		},
		tvl: '$11,400.50',
		apr: '0.69%'
	}
]

const farmAmountOptions = [25, 50, 75, 100] as const

export default function LiquidityPoolDeposit({ params }: { params: { poolId: string } }) {
	const poolId = params.poolId
	const poolDetail = PoolStaticData.find((data) => data.id === poolId)
	const router = useRouter()

	const [fromAmount, setFromAmount] = useState<string>('')
	const [toAmount, setToAmount] = useState<string>('')
	const [farmAmount, setFarmAmount] = useState<string>('')
	const [farmAmountPercentage, setFarmAmountPercentage] = useState<number>(0)
	const [selectedFarmTokenId, setSelectedFarmTokenId] = useState<string>(tokenFarmData[0].id)
	const [slippage, setSlippage] = useState<string>('1%')
	const [isSlippageDialogOpen, setIsSlippageDialogOpen] = useState<boolean>(false)

	const selectedFarmToken = tokenFarmData.find((t) => t.id === selectedFarmTokenId)

	return (
		<div className="w-full px-[15px]">
			<Button
				variant="ghost"
				onClick={() => router.back()}
				className={'md:flex hidden w-32 mb-14 xl:ml-36 lg:ml-10 text-main-black items-center space-x-2.5 text-xl'}
			>
				<HiOutlineArrowNarrowLeft />
				<h4>Back</h4>
			</Button>
			<div className="flex justify-center md:flex-row md:space-x-[30px] md:space-y-0 space-x-0 flex-col space-y-6 items-center">
				<Card className="md:w-[500px] h-full w-full border-hover-green border-[1px] rounded-[12px] p-6 drop-shadow-lg">
					<CardContent className="p-0">
						<Tabs defaultValue="add-liquidity">
							<TabsList className="bg-light-green p-0 w-full h-8 mb-[18px]">
								<TabsTrigger
									className="w-full h-full bg-transparent text-sm text-light-grey font-normal pt-1 hover:bg-main-green hover:text-main-white  focus-visible:bg-main-green focus-visible:text-main-white data-[state=active]:bg-main-green data-[state=active]:text-main-white data-[state=active]:rounded-[4px]"
									value="add-liquidity"
								>
									Add Liquidity
								</TabsTrigger>
								<TabsTrigger
									className="w-full h-full bg-transparent text-sm text-light-grey font-normal pt-1 hover:bg-main-green hover:text-main-white  focus-visible:bg-main-green focus-visible:text-main-white data-[state=active]:bg-main-green data-[state=active]:text-main-white data-[state=active]:rounded-[4px]"
									value="stake-liquidity"
								>
									Stake Liquidity
								</TabsTrigger>
							</TabsList>
							<TabsContent className="w-full" value="add-liquidity">
								<div className="flex flex-col md:space-y-8 space-y-3">
									<SwapItem
										noTitle
										type="from"
										tokenProps={poolDetail?.fromToken ?? initialTokeProps}
										inputAmount={fromAmount}
										setInputAmount={setFromAmount}
									/>
									<SwapItem
										noTitle
										type="to"
										tokenProps={poolDetail?.toToken ?? initialTokeProps}
										inputAmount={toAmount}
										setInputAmount={setToAmount}
									/>
								</div>
								<div className="p-2.5 my-[18px] text-xs h-8 flex justify-between items-center w-full rounded-[10px] border-2 border-dark-grey">
									<h5 className="text-dark-grey">Total Deposit</h5>
									<p className="text-main-black">$0.00</p>
								</div>
								<div className="flex mb-[18px] w-full items-center justify-between">
									<section className="flex text-xs text-main-black items-center space-x-[3px]">
										<p>1 BNB</p>
										<span className="text-dark-grey">≈</span>
										<p>2.8989 USDT</p>
									</section>
									<Button
										onClick={() => setIsSlippageDialogOpen(true)}
										className="min-w-14 bg-box hover:bg-box-2 h-[18px] text-xs text-main-black rounded-[4px]"
									>
										<HiOutlineAdjustmentsHorizontal />
										{slippage}
									</Button>
								</div>
								<Button
									type="button"
									className="rounded-[48px] h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green"
								>
									Enter Token Amount
								</Button>
							</TabsContent>
							<TabsContent value="stake-liquidity" className="flex flex-col space-y-[18px]">
								<div>
									<section className="flex w-full mb-3 justify-between items-center">
										<h3 className="text-lg font-medium text-main-black">Select Farm</h3>
										<Button
											onClick={() => setIsSlippageDialogOpen(true)}
											className="min-w-14 bg-box hover:bg-box-2 h-[18px] text-xs text-main-black rounded-[4px]"
										>
											<HiOutlineAdjustmentsHorizontal />
											{slippage}
										</Button>
									</section>
									<SelectTokenFarm
										selectedTokenId={selectedFarmTokenId}
										setSelectedTokenId={setSelectedFarmTokenId}
										data={tokenFarmData}
									/>
								</div>
								<div>
									<h3 className="text-lg mb-3 font-medium text-main-black">Stake Liquidity</h3>
									<TokenFarmItem
										selectedTokenFarm={selectedFarmToken}
										inputAmount={farmAmount}
										setInputAmount={setFarmAmount}
									/>
								</div>
								<div className="flex flex-col space-y-2.5">
									<section className="w-full flex items-center justify-between">
										<h3 className="text-lg text-main-black">Amount</h3>
										<div className="flex space-x-2.5">
											{farmAmountOptions.map((amount) => (
												<Button
													key={amount}
													onClick={() => setFarmAmountPercentage(amount)}
													className="w-[38px] h-[18px] bg-box hover:bg-box-2 rounded-[4px] text-main-black text-xs"
												>{`${amount}%`}</Button>
											))}
										</div>
									</section>
									<section className="flex space-x-2.5 justify-between">
										<Slider
											defaultValue={[farmAmountPercentage]}
											value={[farmAmountPercentage]}
											onValueChange={(number) => setFarmAmountPercentage(number[0])}
											max={100}
											step={1}
										/>
										<div className="md:p-[6px] p-1 w-32 h-[30px] flex items-center rounded-[4px] border-2 border-light-grey">
											<section className="flex w-full items-center">
												<Input
													className="w-full max-w-[35px] text-main-black text-center !p-0 h-full remove-arrow-input !text-base border-0 outline-none focus-visible:ring-0"
													type="number"
													placeholder="Custom"
													value={farmAmountPercentage}
													min={0}
													max={100}
													onChange={(e) => {
														const value = Number(e.target.value)
														// Limit value between 0 and 100
														setFarmAmountPercentage(Math.min(100, Math.max(0, value)))
													}}
												/>
												<p className="text-base text-light-grey">%</p>
											</section>
											<Button
												variant="ghost"
												className="px-[3px] h-[20px] text-main-green text-base"
												onClick={() => setFarmAmountPercentage(100)}
											>
												Max
											</Button>
										</div>
									</section>
								</div>
								<Button
									type="button"
									className="rounded-[48px] h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green"
								>
									Enter Token Amount
								</Button>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
				<div className="flex md:w-auto w-full flex-col md:space-y-[30px] space-y-3">
					<Card className="md:w-80 w-full border-hover-green border-[1px] rounded-[12px] p-6 drop-shadow-lg">
						<CardContent className="p-0 flex flex-col space-y-[18px]">
							<div className="flex justify-between items-center">
								<h4 className="text-sm text-dark-grey">Total APR 7D</h4>
								<p className="text-lg font-bold text-main-black">20.05%</p>
							</div>
							<div className="flex flex-col space-y-3">
								<div className="flex justify-between items-center text-sm text-dark-grey">
									<h4>Fees</h4>
									<p>{poolDetail?.swapFee}</p>
								</div>
								<div className="flex justify-between items-center text-sm text-dark-grey">
									<h4>Rewards</h4>
									<p>8.19%</p>
								</div>
							</div>
							<div className="flex flex-col space-y-3">
								<div className="flex justify-between items-center text-sm text-main-black">
									<h4>Pool Liquidity</h4>
									<p>{poolDetail?.liquidity}</p>
								</div>
								<div className="flex justify-between items-center text-sm text-dark-grey">
									<section className="flex items-center space-x-[3px]">
										<h4>Pooled {poolDetail?.fromToken.symbol}</h4>
										<Image
											src={poolDetail?.fromToken.icon ?? ''}
											width={11}
											height={11}
											alt={`${poolDetail?.fromToken.name} - icon`}
										/>
									</section>
									<p>{poolDetail?.fromToken.currentPool.toLocaleString()}</p>
								</div>
								<div className="flex justify-between items-center text-sm text-dark-grey">
									<section className="flex items-center space-x-[3px]">
										<h4 className="text-sm text-dark-grey">Pooled {poolDetail?.toToken.symbol}</h4>
										<Image
											src={poolDetail?.toToken.icon ?? ''}
											width={11}
											height={11}
											alt={`${poolDetail?.toToken.name} - icon`}
										/>
									</section>
									<p>{poolDetail?.toToken.currentPool.toLocaleString()}</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className="md:w-80 w-full border-hover-green border-[1px] rounded-[12px] p-6 drop-shadow-lg">
						<CardContent className="p-0 flex flex-col space-y-[18px]">
							<div className="flex justify-between font-normal text-sm text-dark-grey">
								<h4>My Position</h4>
								<p>$0</p>
							</div>
							<div className="flex flex-col space-y-3 text-dark-grey">
								<h3 className="text-main-black">LP Token Balances</h3>
								<div className="flex justify-between">
									<h4>Staked</h4>
									<p>0</p>
								</div>
								<div className="flex justify-between">
									<h4>Unstacked</h4>
									<p>--</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
				<LPSlippageDialog
					isOpen={isSlippageDialogOpen}
					setIsOpen={setIsSlippageDialogOpen}
					maxSlippage={slippage}
					setMaxSlippage={setSlippage}
				/>
			</div>
		</div>
	)
}
