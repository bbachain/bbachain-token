'use client'

import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AiOutlineInfo } from 'react-icons/ai'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { IoIosSwap } from 'react-icons/io'
import { IoAdd } from 'react-icons/io5'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getFeeTierColor } from '@/features/liquidityPool/components/Columns'
import { getTransactionListColumns } from '@/features/liquidityPool/components/TransactionColumns'
import { TransactionDataTable } from '@/features/liquidityPool/components/TransactionDataTable'
import { useGetPoolById, useGetTransactionsByPoolId } from '@/features/liquidityPool/services'
import { PoolData } from '@/features/liquidityPool/types'
import { cn } from '@/lib/utils'

const isPoolData = (data: any): data is PoolData => {
	return data && typeof data === 'object' && 'week' in data
}

function PoolAmountBar({
	mintAAmount,
	mintBAmount,
	mintASymbol,
	mintBSymbol
}: {
	mintAAmount: number
	mintBAmount: number
	mintASymbol: string
	mintBSymbol: string
}) {
	const total = mintAAmount + mintBAmount
	const mintAPercentage = (mintAAmount / total) * 100
	const mintBPercentage = (mintBAmount / total) * 100

	const formatAmount = (value: number) => {
		if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
		if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
		return value.toString()
	}

	return (
		<div className="w-full  mx-auto flex flex-col space-y-3">
			{/* Labels */}
			<div className="flex justify-between text-base">
				<p className="text-main-black">
					{formatAmount(mintAAmount)} <span className="text-dark-grey">{mintASymbol}</span>
				</p>
				<p className="text-main-black">
					{formatAmount(mintBAmount)} <span className="text-dark-grey">{mintBSymbol}</span>
				</p>
			</div>

			{/* Progress Bar */}
			<div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden flex">
				<div className="bg-blue-600 h-full" style={{ width: `${mintAPercentage}%` }} />
				<div className="bg-green-500 h-full" style={{ width: `${mintBPercentage}%` }} />
			</div>
		</div>
	)
}

function StatsItem({
	title,
	info,
	content,
	className
}: {
	title: string
	info: string
	content: string
	className?: string
}) {
	return (
		<div className={cn('flex flex-col space-y-1.5', className)}>
			<section className="flex items-center space-x-2">
				<h4 className="text-lg text-dark-grey">{title}</h4>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							className="border-main-green bg-transparent rounded-full w-4 h-4 [&_svg]:size-3"
							size="icon"
						>
							<AiOutlineInfo className="text-main-green" />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="bg-main-white">
						<p className="text-xs text-dark-grey">{info}</p>
					</TooltipContent>
				</Tooltip>
			</section>
			<p className="text-2xl font-medium text-main-black">{content}</p>
		</div>
	)
}

export default function PoolDetail({ params }: { params: { poolId: string } }) {
	const router = useRouter()
	const poolId = params.poolId

	const [isReversed, setIsReversed] = useState(false)

	const handleReverse = () => {
		setIsReversed((prev) => !prev)
	}

	const getPoolById = useGetPoolById({ poolId })

	const { data: poolDetailData } = getPoolById?.data ?? {}

	const baseMint = isReversed ? poolDetailData?.mintB : poolDetailData?.mintA
	const quoteMint = isReversed ? poolDetailData?.mintA : poolDetailData?.mintB

	const getTransactionsByPoolId = useGetTransactionsByPoolId({
		poolId,
		baseMint,
		quoteMint
	})
	const transactionData = getTransactionsByPoolId.data ? getTransactionsByPoolId.data.data : []

	const transactionColumn = getTransactionListColumns(baseMint?.symbol ?? '', quoteMint?.symbol ?? '')

	const mintAPoolAmount = useMemo(() => {
		if (!poolDetailData) return 0

		if (isPoolData(poolDetailData)) {
			return isReversed ? poolDetailData.mintAmountB : poolDetailData.mintAmountA
		}

		const reserve = isReversed ? poolDetailData.reserveB : poolDetailData.reserveA
		const decimals = isReversed ? poolDetailData.mintB.decimals : poolDetailData.mintA.decimals

		return Number(reserve) / Math.pow(10, decimals)
	}, [poolDetailData, isReversed])

	const mintBPoolAmount = useMemo(() => {
		if (!poolDetailData) return 0

		if (isPoolData(poolDetailData)) {
			return isReversed ? poolDetailData.mintAmountA : poolDetailData.mintAmountB
		}

		const reserve = isReversed ? poolDetailData.reserveA : poolDetailData.reserveB
		const decimals = isReversed ? poolDetailData.mintA.decimals : poolDetailData.mintB.decimals

		return Number(reserve) / Math.pow(10, decimals)
	}, [poolDetailData, isReversed])

	const apr7Day = useMemo(() => {
		if (!poolDetailData) return '0.00%'
		const apr = isPoolData(poolDetailData) ? poolDetailData.week.apr : poolDetailData.apr24h
		return `${apr.toFixed(2)}%`
	}, [poolDetailData])

	const fee24H = useMemo(() => {
		if (!poolDetailData) return '$0'
		const fee = isPoolData(poolDetailData) ? poolDetailData.day.feeApr : poolDetailData.fees24h
		return `$${fee}`
	}, [poolDetailData])

	const volume24H = useMemo(() => {
		if (!poolDetailData) return '$0'
		const volume = isPoolData(poolDetailData) ? poolDetailData.day.volume : poolDetailData.volume24h
		return `$${volume}`
	}, [poolDetailData])

	useEffect(() => {
		if (getTransactionsByPoolId.isSuccess) {
			console.log('Transactions:', getTransactionsByPoolId.data)
		}
	}, [getTransactionsByPoolId.data, getTransactionsByPoolId.isSuccess])

	useEffect(() => {
		if (getTransactionsByPoolId.isError) {
			console.error('Transaction fetch error:', getTransactionsByPoolId.error)
		}
	}, [getTransactionsByPoolId.error, getTransactionsByPoolId.isError])

	if (getPoolById.isPending || getTransactionsByPoolId.isPending) {
		return (
			<div className="h-full w-full md:mt-20 mt-40 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p className="text-gray-600 dark:text-gray-400">Please wait</p>
			</div>
		)
	}

	return (
		<div className="w-full mx-auto 2xl:max-w-7xl lg:max-w-6xl md:max-w-5xl px-[15px]">
			<Button
				variant="ghost"
				onClick={() => router.push('/liquidity-pools')}
				className="md:flex p-0 hidden justify-start w-32 mb-14 text-main-black items-center space-x-2.5 text-xl"
			>
				<HiOutlineArrowNarrowLeft />
				<h4>Pools</h4>
			</Button>
			<div className="flex justify-between items-center">
				<section className="flex space-x-3 items-center">
					<section className="flex items-center flex-shrink-0 relative">
						<Image
							src={
								poolDetailData?.mintA.logoURI && poolDetailData?.mintA.logoURI !== ''
									? poolDetailData?.mintA.logoURI
									: '/icon-placeholder.svg'
							}
							width={28}
							height={28}
							className="rounded-full relative"
							alt={`${poolDetailData?.mintA.name} icon`}
							onError={(e) => {
								e.currentTarget.src = '/icon-placeholder.svg'
							}}
						/>
						<Image
							src={
								poolDetailData?.mintB.logoURI && poolDetailData?.mintB.logoURI !== ''
									? poolDetailData?.mintB.logoURI
									: '/icon-placeholder.svg'
							}
							width={28}
							height={28}
							className="rounded-full relative -ml-2"
							alt={`${poolDetailData?.mintB.name} icon`}
							onError={(e) => {
								e.currentTarget.src = '/icon-placeholder.svg'
							}}
						/>
						<h4 className="text-2xl text-main-black">{`${poolDetailData?.mintA.symbol}-${poolDetailData?.mintB.symbol}`}</h4>
					</section>
					<section className="flex items-center gap-1">
						<p
							className={cn(
								'text-xs text-center text-dark-grey px-1.5 py-0.5 rounded font-medium',
								getFeeTierColor(poolDetailData?.feeRate ?? 0)
							)}
						>
							{(poolDetailData?.feeRate ?? 0 * 100).toFixed(2)}%
						</p>
					</section>
				</section>
				<section className="flex space-x-2.5 items-center">
					<Button
						size="lg"
						variant="outline"
						className="border-main-green hover:text-hover-green px-6 py-3 text-main-green font-medium text-lg rounded-[26px]"
					>
						<IoIosSwap />
						Swap
					</Button>
					<Button
						size="lg"
						variant="default"
						className="bg-main-green hover:bg-hover-green px-6 py-3 text-main-white font-medium text-lg rounded-[26px]"
					>
						<IoAdd />
						Add Liquidity
					</Button>
				</section>
			</div>
			<div className="bg-box-3 mt-6 p-6 rounded-[8px]">
				<Tabs defaultValue="pool-stats">
					<TabsList className="rounded-[4px] mb-6 bg-dark-grey p-0">
						<TabsTrigger
							className="w-full h-full p-1.5 text-base text-main-white font-normal hover:bg-main-green focus-visible:bg-main-green data-[state=active]:bg-main-green data-[state=active]:text-main-white data-[state=active]:rounded-[4px]"
							value="pool-stats"
						>
							Pool Stats
						</TabsTrigger>
						<TabsTrigger
							className="w-full h-full p-1.5 text-base text-main-white font-normal hover:bg-main-green focus-visible:bg-main-green data-[state=active]:bg-main-green data-[state=active]:text-main-white data-[state=active]:rounded-[4px]"
							value="my-stats"
						>
							My Stats
						</TabsTrigger>
					</TabsList>
					<TabsContent value="pool-stats">
						<div>
							<div className="flex flex-col space-y-3">
								<section className="flex items-center space-x-2">
									<h3 className="text-lg text-dark-grey">Pool balances</h3>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												className="border-main-green rounded-full bg-transparent w-4 h-4 [&_svg]:size-3"
												size="icon"
											>
												<AiOutlineInfo className="text-main-green" />
											</Button>
										</TooltipTrigger>
										<TooltipContent className="bg-main-white">
											<p className="text-xs text-dark-grey">
												Total value of tokens currently held in this pool, displayed per token.
											</p>
										</TooltipContent>
									</Tooltip>
								</section>
								<PoolAmountBar
									mintAAmount={mintAPoolAmount}
									mintBAmount={mintBPoolAmount}
									mintASymbol={poolDetailData?.mintA.symbol ?? ''}
									mintBSymbol={poolDetailData?.mintB.symbol ?? ''}
								/>
							</div>
							<div className="mt-6 flex items-center justify-between">
								<StatsItem
									title="APR(7 days)"
									info="Annual Percentage Rate earned by liquidity providers from trading fees and rewards."
									content={apr7Day}
								/>
								<hr className="w-px h-12 bg-light-grey border-0" />
								<StatsItem
									title="TVL"
									info="The total dollar value of assets locked in this liquidity pool."
									content={`$${poolDetailData?.tvl.toLocaleString() ?? 0}`}
								/>
								<hr className="w-px h-12 bg-light-grey border-0" />
								<StatsItem
									title="Fees(24h)"
									info="Trading fees generated by this pool in the past 24 hours."
									content={fee24H}
								/>
								<hr className="w-px h-12 bg-light-grey border-0" />
								<StatsItem
									title="Volume(24h)"
									info="Total swap volume (trades) processed in this pool within the last 24 hours."
									content={volume24H}
								/>
							</div>
							<div className="mt-9">
								<h2>Links</h2>
								<div>
									<section></section>
									<section></section>
								</div>
							</div>
						</div>
					</TabsContent>
					<TabsContent value="my-stats"></TabsContent>
				</Tabs>
			</div>
			<div className="flex flex-col space-y-6 mt-14">
				<h2 className="font-semibold text-2xl text-main-black">Transactions</h2>
				<TransactionDataTable columns={transactionColumn} data={transactionData} />
			</div>
		</div>
	)
}
