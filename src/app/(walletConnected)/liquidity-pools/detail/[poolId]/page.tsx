'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AiOutlineInfo } from 'react-icons/ai'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { IoIosSwap } from 'react-icons/io'
import { IoAdd } from 'react-icons/io5'
import { LuArrowUpDown } from 'react-icons/lu'

import { CopyButton } from '@/components/common/CopyButton'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getFeeTierColor } from '@/features/liquidityPool/components/Columns'
import {
	InitialPoolDetailSkeleton,
	PoolDetailTransactionSkeleton
} from '@/features/liquidityPool/components/PoolDetailSkeleton'
import { getTransactionListColumns } from '@/features/liquidityPool/components/TransactionColumns'
import { TransactionDataTable } from '@/features/liquidityPool/components/TransactionDataTable'
import {
	useGetPoolById,
	useGetTransactionsByPoolId,
	useGetUserPoolStats
} from '@/features/liquidityPool/services'
import { useIsMobile } from '@/hooks/isMobile'
import { formatTokenBalance } from '@/lib/token'
import { cn, getExplorerAddress, shortenAddress } from '@/lib/utils'

function PoolAmountBar({
	mintAAmount,
	mintBAmount,
	mintASymbol,
	mintBSymbol,
	isLoading
}: {
	mintAAmount: number
	mintBAmount: number
	mintASymbol: string
	mintBSymbol: string
	isLoading?: boolean
}) {
	const total = mintAAmount + mintBAmount
	const mintAPercentage = (mintAAmount / total) * 100
	const mintBPercentage = (mintBAmount / total) * 100

	const formatAmount = (value: number) => {
		if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
		if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
		return value.toFixed(3)
	}

	if (isLoading) {
		return (
			<div className="w-full  mx-auto flex flex-col md:space-y-3 space-y-[3px]">
				<div className="flex justify-between">
					<Skeleton className="h-5 w-16 rounded-sm" />
					<Skeleton className="h-5 w-16 rounded-sm" />
				</div>
				<Skeleton className="h-4 w-full rounded" />
			</div>
		)
	}

	return (
		<div className="w-full  mx-auto flex flex-col md:space-y-3 space-y-[3px]">
			<div className="flex justify-between md:text-base text-sm">
				<p className="text-main-black">
					{formatAmount(mintAAmount)} <span className="text-dark-grey">{mintASymbol}</span>
				</p>
				<p className="text-main-black">
					{formatAmount(mintBAmount)} <span className="text-dark-grey">{mintBSymbol}</span>
				</p>
			</div>
			{/* Progress Bar */}
			<div className="w-full md:h-4 h-2.5 rounded-full bg-gray-200 overflow-hidden flex">
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
	className,
	isLoading
}: {
	title: string
	info: string
	content: string
	className?: string
	isLoading?: boolean
}) {
	return (
		<div className={cn('flex flex-col space-y-1.5', className)}>
			<section className="flex items-center space-x-2">
				<h4 className="lg:text-lg md:text-base text-sm text-dark-grey">{title}</h4>
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
			{isLoading ? (
				<Skeleton className="h-6 w-28" />
			) : (
				<p className="lg:text-2xl md:text-lg text-base font-medium text-main-black">{content}</p>
			)}
		</div>
	)
}

export default function PoolDetail({ params }: { params: { poolId: string } }) {
	const router = useRouter()
	const poolId = params.poolId

	const [isReversed, setIsReversed] = useState<boolean>(false)
	const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)
	const isMobile = useIsMobile()

	const onReverse = () => {
		setIsReversed((prev) => !prev)
	}

	const getPoolById = useGetPoolById({ poolId, isReversed })
	const pool = getPoolById?.data?.data

	const getTransactionsByPoolId = useGetTransactionsByPoolId({ pool })
	const transactions = getTransactionsByPoolId?.data?.data ?? []
	const transactionColumn = getTransactionListColumns(
		pool?.mintA?.symbol ?? '',
		pool?.mintB?.symbol ?? ''
	)

	const getUserStats = useGetUserPoolStats({ pool })
	const userStats = getUserStats.data?.data

	const mintAAmount = formatTokenBalance(
		Number(pool?.reserveA ?? 0),
		Number(pool?.mintA?.decimals ?? 0)
	)
	const mintBAmount = formatTokenBalance(
		Number(pool?.reserveB ?? 0),
		Number(pool?.mintB?.decimals ?? 0)
	)

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

	useEffect(() => {
		if (!(getPoolById.isLoading || getTransactionsByPoolId.isLoading)) {
			setIsInitialLoad(false)
		}
	}, [getPoolById.isLoading, getTransactionsByPoolId.isLoading])

	if (
		isInitialLoad &&
		(getPoolById.isLoading || getTransactionsByPoolId.isLoading || getUserStats.isLoading)
	)
		return (
			<div className="w-full mx-auto 2xl:max-w-7xl lg:max-w-5xl md:max-w-2xl px-[15px]">
				<Button
					variant="ghost"
					onClick={() => router.push('/liquidity-pools')}
					className="md:flex p-0 hidden justify-start w-32 mb-14 text-main-black items-center space-x-2.5 text-xl"
				>
					<HiOutlineArrowNarrowLeft />
					<h4>Pools</h4>
				</Button>
				<InitialPoolDetailSkeleton />
			</div>
		)

	return (
		<div className="w-full mx-auto 2xl:max-w-7xl xl:max-w-5xl lg:max-w-4xl md:max-w-2xl px-[15px]">
			<Button
				variant="ghost"
				onClick={() => router.push('/liquidity-pools')}
				className="md:flex p-0 hidden justify-start w-32 mb-14 text-main-black items-center space-x-2.5 text-xl"
			>
				<HiOutlineArrowNarrowLeft />
				<h4>Pools</h4>
			</Button>
			<div className="flex md:flex-row flex-col md:space-y-0 space-y-6 justify-between md:items-center">
				<section className="flex space-x-3 items-center">
					<section className="flex items-center flex-shrink-0 relative">
						<Image
							src={pool?.mintA?.logoURI ?? '/icon-placeholder.svg'}
							width={isMobile ? 24 : 28}
							height={isMobile ? 24 : 28}
							className="rounded-full relative"
							alt={`${pool?.mintA?.name} icon`}
							onError={(e) => {
								e.currentTarget.src = '/icon-placeholder.svg'
							}}
						/>
						<Image
							src={pool?.mintB?.logoURI ?? '/icon-placeholder.svg'}
							width={isMobile ? 24 : 28}
							height={isMobile ? 24 : 28}
							className="rounded-full relative -ml-2"
							alt={`${pool?.mintB?.name} icon`}
							onError={(e) => {
								e.currentTarget.src = '/icon-placeholder.svg'
							}}
						/>
						<h4 className="md:text-2xl text-xl text-main-black">{`${pool?.mintA?.symbol}-${pool?.mintB?.symbol}`}</h4>
					</section>
					<section className="flex items-center gap-1">
						<p
							className={cn(
								'text-xs text-center text-dark-grey px-1.5 py-0.5 rounded font-medium',
								getFeeTierColor(pool?.feeRate ?? 0)
							)}
						>
							{(pool?.feeRate ?? 0 * 100).toFixed(2)}%
						</p>
					</section>
					<Button size="icon" type="button" variant="ghost" onClick={onReverse}>
						<LuArrowUpDown />
					</Button>
				</section>
				<section className="flex space-x-2.5 items-center">
					<Link
						href={`/swap?from=${pool?.mintA?.address}&to=${pool?.mintB?.address}`}
						className={cn(
							buttonVariants({ size: 'lg', variant: 'outline' }),
							'border-main-green hover:text-hover-green px-6 py-3 text-main-green font-medium text-lg rounded-[26px]'
						)}
					>
						<IoIosSwap />
						Swap
					</Link>
					<Link
						href={`/liquidity-pools/deposit/${poolId}`}
						className={cn(
							buttonVariants({ size: 'lg', variant: 'default' }),
							'bg-main-green hover:bg-hover-green px-6 py-3 text-main-white font-medium text-lg rounded-[26px]'
						)}
					>
						<IoAdd />
						Add Liquidity
					</Link>
				</section>
			</div>
			<div className="bg-box-3 mt-6 md:p-6 p-3 rounded-[8px]">
				<Tabs defaultValue="pool-stats">
					<TabsList className="flex md:w-40 w-full mb-[18px] rounded-md bg-light-grey !p-0">
						<TabsTrigger
							className="flex-1 w-full h-full rounded-md p-1.5 text-sm font-normal 
               data-[state=active]:bg-main-green
			   hover:bg-main-green 
               data-[state=active]:text-main-white
			   data-[state=inactive]:text-box
			   hover:!text-main-white"
							value="pool-stats"
						>
							Pool Stats
						</TabsTrigger>
						<TabsTrigger
							className="flex-1 w-full h-full rounded-md p-1.5 text-sm font-normal 
               data-[state=active]:bg-main-green
			   hover:bg-main-green 
               data-[state=active]:text-main-white
			   data-[state=inactive]:text-box
			   hover:!text-main-white"
							value="my-stats"
						>
							My Stats
						</TabsTrigger>
					</TabsList>
					<TabsContent value="pool-stats">
						<div className="flex flex-col md:space-y-3 space-y-1.5">
							<section className="flex items-center space-x-2">
								<h3 className="lg:text-lg md:text-base text-sm text-dark-grey">Pool balances</h3>
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
								mintAAmount={mintAAmount}
								mintBAmount={mintBAmount}
								mintASymbol={pool?.mintA?.symbol ?? ''}
								mintBSymbol={pool?.mintB?.symbol ?? ''}
								isLoading={getPoolById.isLoading}
							/>
						</div>
						<div className="md:mt-6 mt-3 grid grid-cols-2 lg:flex lg:gap-y-0 gap-y-3  items-center justify-between">
							<StatsItem
								isLoading={getPoolById.isLoading}
								title="APR(7 days)"
								info="Weekly Percentage Rate earned by liquidity providers from trading fees and rewards."
								content={`${pool?.apr24h.toFixed(2) ?? 0.0}%`}
							/>
							<hr className="w-px h-12 lg:block hidden bg-light-grey border-0" />
							<StatsItem
								isLoading={getPoolById.isLoading}
								title="TVL"
								info="The total dollar value of assets locked in this liquidity pool."
								content={`$${pool?.tvl.toLocaleString() ?? 0}`}
							/>
							<hr className="w-px h-12 lg:block hidden bg-light-grey border-0" />
							<StatsItem
								isLoading={getPoolById.isLoading}
								title="Fees(24h)"
								info="Trading fees generated by this pool in the past 24 hours."
								content={`$${pool?.fees24h.toFixed(3) ?? 0}`}
							/>
							<hr className="w-px h-12 lg:block hidden bg-light-grey border-0" />
							<StatsItem
								isLoading={getPoolById.isLoading}
								title="Volume(24h)"
								info="Total swap volume (trades) processed in this pool within the last 24 hours."
								content={`$${pool?.volume24h.toFixed(3) ?? 0}`}
							/>
						</div>
						<div className="md:mt-9 mt-6">
							<h2 className="lg:text-2xl md:text-xl text-lg font-semibold lg:mb-6 md:mb-4 mb-3">
								Links
							</h2>
							<div className="flex md:flex-row flex-col justify-between">
								<section className="flex items-center md:space-x-3 md:justify-normal justify-between">
									<section className="flex items-center space-x-1.5">
										<Image
											src={pool?.mintA?.logoURI ?? '/icon-placeholder.svg'}
											width={isMobile ? 24 : 28}
											height={isMobile ? 24 : 28}
											className="rounded-full relative"
											alt={`${pool?.mintA?.name} icon`}
											onError={(e) => {
												e.currentTarget.src = '/icon-placeholder.svg'
											}}
										/>
										<h4 className="md:text-xl text-sm text-main-black">{pool?.mintA?.symbol}</h4>
									</section>
									<section className="flex items-center space-x-1">
										<a
											className="text-main-green hover:text-hover-green md:text-lg text-sm"
											href={getExplorerAddress(pool?.mintA?.address ?? '')}
											target="_blank"
											rel="noopener noreferrer"
										>
											{shortenAddress(pool?.mintA?.address ?? '', 7)}
										</a>
										<CopyButton
											secretValue={getExplorerAddress(pool?.mintA?.address ?? '')}
											iconSize="xs"
										/>
									</section>
								</section>
								<section className="flex items-center md:space-x-3 md:justify-normal justify-between">
									<section className="flex items-center space-x-1.5">
										<Image
											src={pool?.mintB?.logoURI ?? '/icon-placeholder.svg'}
											width={isMobile ? 24 : 28}
											height={isMobile ? 24 : 28}
											className="rounded-full relative"
											alt={`${pool?.mintB?.name} icon`}
											onError={(e) => {
												e.currentTarget.src = '/icon-placeholder.svg'
											}}
										/>
										<h4 className="md:text-xl text-sm text-main-black">{pool?.mintB?.symbol}</h4>
									</section>
									<section className="flex items-center space-x-1">
										<a
											className="text-main-green hover:text-hover-green md:text-lg text-sm"
											href={getExplorerAddress(pool?.mintB?.address ?? '')}
											target="_blank"
											rel="noopener noreferrer"
										>
											{shortenAddress(pool?.mintB?.address ?? '', 7)}
										</a>
										<CopyButton secretValue={pool?.mintB?.address ?? ''} iconSize="xs" />
									</section>
								</section>
							</div>
						</div>
					</TabsContent>
					<TabsContent value="my-stats">
						<div className="flex flex-col md:space-y-3 space-y-1.5">
							<section className="flex items-center space-x-2">
								<h3 className="lg:text-lg md:text-base text-sm text-dark-grey">Your Deposits</h3>
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
											Total value of tokens currently you deposit in this pool, displayed per token.
										</p>
									</TooltipContent>
								</Tooltip>
							</section>
							<PoolAmountBar
								mintAAmount={userStats?.userReserveA ?? 0}
								mintBAmount={userStats?.userReserveB ?? 0}
								mintASymbol={pool?.mintA?.symbol ?? ''}
								mintBSymbol={pool?.mintB?.symbol ?? ''}
								isLoading={getUserStats.isLoading}
							/>
						</div>
						<div className="md:mt-6 mt-3 grid grid-cols-2 lg:flex lg:gap-y-0 gap-y-3  items-center justify-between">
							<StatsItem
								isLoading={getUserStats.isLoading}
								title="My Pool Share (%)"
								info="This is the percentage of the total liquidity pool that you currently own."
								content={`${userStats?.userShare.toFixed(2) ?? 0}%`}
							/>
							<hr className="w-px h-12 lg:block hidden bg-light-grey border-0" />
							<StatsItem
								isLoading={getUserStats.isLoading}
								title="My Liquidity Value"
								info="The estimated dollar value of the tokens you've contributed to this pool."
								content={`$${userStats?.userReserveTotalPrice.toLocaleString() ?? 0}`}
							/>
							<hr className="w-px h-12 lg:block hidden bg-light-grey border-0" />
							<StatsItem
								isLoading={getUserStats.isLoading}
								title="LP Tokens Held"
								info="The total number of LP (liquidity provider) tokens you own — including both staked and unstaked."
								content={`${userStats?.userLPToken.toLocaleString() ?? 0} LP`}
							/>
							<hr className="w-px h-12 lg:block hidden bg-light-grey border-0" />
							<StatsItem
								isLoading={getUserStats.isLoading}
								title="Fee Earnings(24h)"
								info="Total amount you've earned from trading fees within the last 24 hours."
								content={`$${userStats?.dailyFeeEarnings.toFixed(3) ?? 0}`}
							/>
						</div>
					</TabsContent>
				</Tabs>
			</div>
			<div className="flex flex-col md:space-y-6 space-y-3 md:mt-14 mt-5">
				<h2 className="font-semibold lg:text-2xl text-xl text-main-black">Transactions</h2>
				{getTransactionsByPoolId.isLoading ? (
					<PoolDetailTransactionSkeleton />
				) : (
					<TransactionDataTable columns={transactionColumn} data={transactions} />
				)}
			</div>
		</div>
	)
}
