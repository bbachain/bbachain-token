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
import { useGetPoolById } from '@/features/liquidityPool/services'
import { TTokenFarmProps } from '@/features/liquidityPool/types'
import SwapItem from '@/features/swap/components/SwapItem'
import { useGetTokenPrice, useGetUserBalanceByMint } from '@/features/swap/services'
import { TTokenProps } from '@/features/swap/types'

const initialTokeProps: TTokenProps = {
	chainId: 101,
	address: '',
	programId: '',
	name: '',
	symbol: '',
	logoURI: '',
	decimals: 0,
	tags: [],
	extensions: {}
}

const tokenFarmData: TTokenFarmProps[] = [
	{
		id: '1',
		fromToken: {
			chainId: 101,
			address: 'abcd',
			programId: 'abcd',
			name: 'Binance Coin',
			symbol: 'BNB',
			logoURI: '/bnb-swap-icon.svg',
			decimals: 6,
			tags: [],
			extensions: {}
		},
		toToken: {
			chainId: 101,
			address: 'efgh',
			programId: 'abcd',
			name: 'BBA Coin',
			symbol: 'BBA',
			logoURI: '/bba-swap-icon.svg',
			decimals: 6,
			tags: [],
			extensions: {}
		},
		tvl: '$1,435.34',
		apr: '0%'
	},
	{
		id: '2',
		fromToken: {
			chainId: 101,
			address: 'abcd',
			programId: 'abcd',
			name: 'Binance Coin',
			symbol: 'BNB',
			logoURI: '/bnb-swap-icon.svg',
			decimals: 6,
			tags: [],
			extensions: {}
		},
		toToken: {
			chainId: 101,
			address: 'efgh',
			programId: 'abcd',
			name: 'BBA Coin',
			symbol: 'BBA',
			logoURI: '/bba-swap-icon.svg',
			decimals: 6,
			tags: [],
			extensions: {}
		},
		tvl: '$2,547.00',
		apr: '0.25%'
	},
	{
		id: '3',
		fromToken: {
			chainId: 101,
			address: 'abcd',
			programId: 'abcd',
			name: 'Binance Coin',
			symbol: 'BNB',
			logoURI: '/bnb-swap-icon.svg',
			decimals: 6,
			tags: [],
			extensions: {}
		},
		toToken: {
			chainId: 101,
			address: 'efgh',
			programId: 'abcd',
			name: 'BBA Coin',
			symbol: 'BBA',
			logoURI: '/bba-swap-icon.svg',
			decimals: 6,
			tags: [],
			extensions: {}
		},
		tvl: '$11,400.50',
		apr: '0.69%'
	}
]

const farmAmountOptions = [25, 50, 75, 100] as const

export default function LiquidityPoolDeposit({ params }: { params: { poolId: string } }) {
	const poolId = params.poolId
	const getPoolByIdQuery = useGetPoolById({ poolId })
	const poolDetailData = getPoolByIdQuery.data?.data
	const router = useRouter()

	const [fromAmount, setFromAmount] = useState<string>('')
	const [toAmount, setToAmount] = useState<string>('')
	const [farmAmount, setFarmAmount] = useState<string>('')
	const [farmAmountPercentage, setFarmAmountPercentage] = useState<number>(0)
	const [selectedFarmTokenId, setSelectedFarmTokenId] = useState<string>(tokenFarmData[0].id)
	const [slippage, setSlippage] = useState<number>(1)
	const [isSlippageDialogOpen, setIsSlippageDialogOpen] = useState<boolean>(false)

	const selectedFarmToken = tokenFarmData.find((t) => t.id === selectedFarmTokenId)

	const getMintABalance = useGetUserBalanceByMint({ mintAddress: poolDetailData?.mintA.address ?? '' })
	const getMintBBalance = useGetUserBalanceByMint({ mintAddress: poolDetailData?.mintB.address ?? '' })
	const getMintATokenPrice = useGetTokenPrice({ mintAddress: poolDetailData?.mintA.address ?? '' })
	const getMintBTokenPrice = useGetTokenPrice({ mintAddress: poolDetailData?.mintB.address ?? '' })

	const mintABalance = getMintABalance.data ? getMintABalance.data.balance : 0
	const mintBBalance = getMintBBalance.data ? getMintBBalance.data.balance : 0
	const mintAInitialPrice = getMintATokenPrice.data ? getMintATokenPrice.data.usdRate : 0
	const mintBInitialPrice = getMintBTokenPrice.data ? getMintBTokenPrice.data.usdRate : 0

	const baseTokenPrice = Number(fromAmount) > 0 ? Number(fromAmount) * mintAInitialPrice : 0
	const quoteTokenPrice = Number(toAmount) > 0 ? Number(toAmount) * mintBInitialPrice : 0

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
										tokenProps={poolDetailData?.mintA ?? initialTokeProps}
										balance={mintABalance}
										price={baseTokenPrice}
										inputAmount={fromAmount}
										setInputAmount={setFromAmount}
									/>
									<SwapItem
										noTitle
										type="to"
										tokenProps={poolDetailData?.mintB ?? initialTokeProps}
										balance={mintBBalance}
										price={quoteTokenPrice}
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
								<p className="text-lg font-bold text-main-black">{poolDetailData?.week.apr.toFixed(2)}%</p>
							</div>
							<div className="flex flex-col space-y-3">
								<div className="flex justify-between items-center text-sm text-dark-grey">
									<h4>Fees</h4>
									<p>{poolDetailData?.week.feeApr}%</p>
								</div>
								{poolDetailData?.week &&
									poolDetailData?.week.rewardApr.length > 0 &&
									poolDetailData.week.rewardApr.map((value, index) => (
										<div key={index} className="flex justify-between items-center text-sm text-dark-grey">
											<section className="flex items-center space-x-[3px]">
												<h4>Rewards</h4>
												<Image
													className="rounded-full"
													src={poolDetailData.rewardDefaultInfos[index].mint.logoURI ?? ''}
													width={11}
													height={11}
													alt={`${poolDetailData.rewardDefaultInfos[index].mint.name} - icon`}
												/>
											</section>
											<p>{value.toFixed(2)}%</p>
										</div>
									))}
							</div>
							<div className="flex flex-col space-y-3">
								<div className="flex justify-between items-center text-sm text-main-black">
									<h4>Pool Liquidity</h4>
									<p>${poolDetailData?.tvl.toLocaleString()}</p>
								</div>
								<div className="flex justify-between items-center text-sm text-dark-grey">
									<section className="flex items-center space-x-[3px]">
										<h4>Pooled {poolDetailData?.mintA.symbol}</h4>
										<Image
											className="rounded-full"
											src={poolDetailData?.mintA.logoURI ?? ''}
											width={11}
											height={11}
											alt={`${poolDetailData?.mintA.symbol} - icon`}
										/>
									</section>
									<p>{poolDetailData?.mintAmountA.toLocaleString()}</p>
								</div>
								<div className="flex justify-between items-center text-sm text-dark-grey">
									<section className="flex items-center space-x-[3px]">
										<h4>Pooled {poolDetailData?.mintB.symbol}</h4>
										<Image
											className="rounded-full"
											src={poolDetailData?.mintB.logoURI ?? ''}
											width={11}
											height={11}
											alt={`${poolDetailData?.mintB.symbol} - icon`}
										/>
									</section>
									<p>{poolDetailData?.mintAmountB.toLocaleString()}</p>
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
