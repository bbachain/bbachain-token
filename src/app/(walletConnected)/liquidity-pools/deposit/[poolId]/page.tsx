'use client'

import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { HiOutlineAdjustmentsHorizontal } from 'react-icons/hi2'
import { IoCheckmarkCircle } from 'react-icons/io5'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import DepositDetailSkeleton from '@/features/liquidityPool/components/DepositDetailSkeleton'
import LPSlippageDialog from '@/features/liquidityPool/components/LPSlippageDialog'
import LPSuccessDialog from '@/features/liquidityPool/components/LPSuccessDialog'
import {
	useDepositToPool,
	useGetPoolById,
	useGetUserPoolStats
} from '@/features/liquidityPool/services'
import { MintInfo } from '@/features/liquidityPool/types'
import {
	calculateOptimalAmountADeposit,
	calculateOptimalAmountBDeposit
} from '@/features/liquidityPool/utils'
import SwapItem from '@/features/swap/components/SwapItem'
import { useGetTokenPriceByCoinGeckoId } from '@/features/tokens/services'
import { formatTokenBalance, getCoinGeckoId } from '@/lib/token'
import { cn } from '@/lib/utils'
import { useGetTokenBalanceByMint } from '@/services/wallet'

const initialTokeProps: MintInfo = {
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

export default function LiquidityPoolDeposit({ params }: { params: { poolId: string } }) {
	const poolId = params.poolId
	const router = useRouter()

	const getPoolByIdQuery = useGetPoolById({ poolId })
	const poolDetailData = getPoolByIdQuery.data?.data

	const getUserPoolStats = useGetUserPoolStats({ pool: poolDetailData })
	const userStatsData = getUserPoolStats.data?.data

	const [fromAmount, setFromAmount] = useState<string>('')
	const [toAmount, setToAmount] = useState<string>('')
	const [slippage, setSlippage] = useState<number>(1)
	const [isSlippageDialogOpen, setIsSlippageDialogOpen] = useState<boolean>(false)
	const [isCalculating, setIsCalculating] = useState<boolean>(false)
	const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState<boolean>(false)
	const [lastChangedField, setLastChangedField] = useState<'from' | 'to' | null>(null)
	const [successData, setSuccessData] = useState<{
		signature: string
		amountA: string
		amountB: string
		totalValue: string
	} | null>(null)

	const getMintABalance = useGetTokenBalanceByMint({
		mintAddress: poolDetailData?.mintA.address ?? ''
	})
	const getMintBBalance = useGetTokenBalanceByMint({
		mintAddress: poolDetailData?.mintB.address ?? ''
	})

	// Convert balance from daltons to UI units using token decimals
	const mintABalance = formatTokenBalance(
		getMintABalance.data ?? 0,
		poolDetailData?.mintA.decimals ?? 0
	)
	const mintBBalance = formatTokenBalance(
		getMintBBalance.data ?? 0,
		poolDetailData?.mintB.decimals ?? 0
	)

	// Get unit prices from CoinGecko API
	const getMintACoinGeckoId = getCoinGeckoId(poolDetailData?.mintA.address ?? '')
	const getMintBCoinGeckoId = getCoinGeckoId(poolDetailData?.mintB.address ?? '')
	const getMintAPrice = useGetTokenPriceByCoinGeckoId({ coinGeckoId: getMintACoinGeckoId })
	const getMintBPrice = useGetTokenPriceByCoinGeckoId({ coinGeckoId: getMintBCoinGeckoId })
	const mintAPrice = getMintAPrice.data ?? 0
	const mintBPrice = getMintBPrice.data ?? 0
	const inputAmountPrice = mintAPrice * Number(fromAmount)
	const outputAmountPrice = mintBPrice * Number(toAmount)

	const depositMutation = useDepositToPool()

	// Auto-calculate optimal ratio
	useEffect(() => {
		if (!poolDetailData || isCalculating) return

		const reserveA = poolDetailData.reserveA
		const reserveB = poolDetailData.reserveB

		if (reserveA === BigInt(0) || reserveB === BigInt(0)) return

		setIsCalculating(true)

		if (lastChangedField === 'from' && fromAmount) {
			const optimalB = calculateOptimalAmountBDeposit(
				fromAmount,
				reserveA,
				reserveB,
				poolDetailData.mintA.decimals,
				poolDetailData.mintB.decimals
			)
			if (optimalB !== toAmount) {
				setToAmount(optimalB)
			}
		} else if (lastChangedField === 'to' && toAmount) {
			const optimalA = calculateOptimalAmountADeposit(
				toAmount,
				reserveA,
				reserveB,
				poolDetailData.mintA.decimals,
				poolDetailData.mintB.decimals
			)
			if (optimalA !== fromAmount) {
				setFromAmount(optimalA)
			}
		}

		setIsCalculating(false)
	}, [fromAmount, toAmount, poolDetailData, lastChangedField, isCalculating])

	// Validation - use same converted balances as display
	const userMintABalance = mintABalance
	const userMintBBalance = mintBBalance
	const hasInsufficientBalanceA = Number(fromAmount) > userMintABalance
	const hasInsufficientBalanceB = Number(toAmount) > userMintBBalance

	const canDeposit =
		!!poolDetailData &&
		Number(fromAmount) > 0 &&
		Number(toAmount) > 0 &&
		!hasInsufficientBalanceA &&
		!hasInsufficientBalanceB &&
		!depositMutation.isPending

	const handleFromAmountChange = (value: string) => {
		setFromAmount(value)
		setLastChangedField('from')
	}

	const handleToAmountChange = (value: string) => {
		setToAmount(value)
		setLastChangedField('to')
	}

	const handleDeposit = async () => {
		if (!poolDetailData || !canDeposit) return

		try {
			const result = await depositMutation.mutateAsync({
				pool: poolDetailData,
				mintAAmount: parseFloat(fromAmount),
				mintBAmount: parseFloat(toAmount),
				slippage
			})

			// Show success dialog with transaction details
			setSuccessData({
				signature: result.data.signature,
				amountA: fromAmount,
				amountB: toAmount,
				totalValue: (inputAmountPrice + outputAmountPrice).toFixed(2)
			})

			setFromAmount('')
			setToAmount('')

			// Refresh balances
			getMintABalance.refetch()
			getMintBBalance.refetch()
			getPoolByIdQuery.refetch()
		} catch (error: any) {
			toast.error(error.message || 'Failed to deposit liquidity')
		}
	}

	useEffect(() => {
		if (depositMutation.isSuccess && depositMutation.data) {
			setIsSuccessDialogOpen(true)
		}
	}, [depositMutation.data, depositMutation.isSuccess])

	if (getPoolByIdQuery.isLoading) return <DepositDetailSkeleton />

	return (
		<div className="w-full px-[15px]">
			<Button
				variant="ghost"
				onClick={() => router.back()}
				className={
					'md:flex hidden w-32 mb-14 xl:ml-36 lg:ml-10 text-main-black items-center space-x-2.5 text-xl'
				}
			>
				<HiOutlineArrowNarrowLeft />
				<h4>Back</h4>
			</Button>
			<div className="flex justify-center md:flex-row md:space-x-[30px] md:space-y-0 space-x-0 flex-col space-y-6 items-center">
				<Card className="md:w-[500px] h-full w-full border-hover-green border-[1px] rounded-[12px] drop-shadow-lg">
					<CardHeader className="pb-4">
						<CardTitle className="text-xl font-semibold text-main-black flex items-center gap-3">
							<div className="flex items-center -space-x-2">
								<Image
									src={poolDetailData?.mintA.logoURI || '/icon-placeholder.svg'}
									width={24}
									height={24}
									className="rounded-full border-2 border-white"
									alt={`${poolDetailData?.mintA.symbol} icon`}
									onError={(e) => {
										e.currentTarget.src = '/icon-placeholder.svg'
									}}
								/>
								<Image
									src={poolDetailData?.mintB.logoURI || '/icon-placeholder.svg'}
									width={24}
									height={24}
									className="rounded-full border-2 border-white"
									alt={`${poolDetailData?.mintB.symbol} icon`}
									onError={(e) => {
										e.currentTarget.src = '/icon-placeholder.svg'
									}}
								/>
							</div>
							Add Liquidity to {poolDetailData?.mintA.symbol}-{poolDetailData?.mintB.symbol}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col space-y-4">
							<SwapItem
								noTitle
								type="from"
								tokenProps={poolDetailData?.mintA ?? initialTokeProps}
								balance={userMintABalance}
								price={inputAmountPrice}
								inputAmount={fromAmount}
								setInputAmount={handleFromAmountChange}
							/>
							<SwapItem
								noTitle
								type="to"
								tokenProps={poolDetailData?.mintB ?? initialTokeProps}
								balance={userMintBBalance}
								price={outputAmountPrice}
								inputAmount={toAmount}
								setInputAmount={handleToAmountChange}
							/>
						</div>

						{/* Pool Ratio Info */}
						{poolDetailData && fromAmount && toAmount && (
							<div className="mt-4 p-3 bg-box-3 rounded-lg">
								<h5 className="text-sm font-medium text-main-black mb-2">Pool Ratio</h5>
								<div className="flex text-xs text-dark-grey items-center justify-between">
									<span>
										1 {poolDetailData.mintA.symbol} ={' '}
										{(Number(toAmount) / Number(fromAmount)).toFixed(6)}{' '}
										{poolDetailData.mintB.symbol}
									</span>
									<span>
										1 {poolDetailData.mintB.symbol} ={' '}
										{(Number(fromAmount) / Number(toAmount)).toFixed(6)}{' '}
										{poolDetailData.mintA.symbol}
									</span>
								</div>
							</div>
						)}

						{/* Total Deposit */}
						<div className="p-2.5 my-4 text-sm flex justify-between items-center w-full rounded-[10px] bg-light-blue">
							<h5 className="font-medium text-main-blue text-xs">Total Deposit Value</h5>
							<p className="font-semibold text-main-black text-xs">
								${(inputAmountPrice + outputAmountPrice).toFixed(2)}
							</p>
						</div>

						{/* Slippage Settings */}
						<div className="flex mb-4 w-full items-center justify-between">
							<div className="text-xs text-main-black">
								<span className="font-medium">Pool Share: </span>
								<span className="text-dark-grey">
									~
									{(
										((inputAmountPrice + outputAmountPrice) / (poolDetailData?.tvl || 1)) *
										100
									).toFixed(4)}
									%
								</span>
							</div>
							<Button
								onClick={() => setIsSlippageDialogOpen(true)}
								className="min-w-16 bg-box hover:bg-box-2 h-8 text-xs text-main-black rounded-lg flex items-center gap-1"
							>
								<HiOutlineAdjustmentsHorizontal />
								{slippage}% slippage
							</Button>
						</div>

						{/* Deposit Button */}
						<Button
							type="button"
							size="lg"
							className={cn(
								'rounded-[26px] h-12 text-lg font-medium text-main-white py-3 w-full transition-all',
								canDeposit ? 'bg-main-green hover:bg-hover-green ' : 'bg-light-grey'
							)}
							disabled={!canDeposit}
							onClick={handleDeposit}
						>
							{depositMutation.isPending ? (
								<div className="flex items-center gap-2">
									<Loader2 className="animate-spin" />
									Depositing...
								</div>
							) : !fromAmount || !toAmount ? (
								'Enter Amounts'
							) : hasInsufficientBalanceA || hasInsufficientBalanceB ? (
								'Insufficient Balance'
							) : (
								<div className="flex items-center gap-2">
									<IoCheckmarkCircle className="w-5 h-5" />
									Deposit Liquidity
								</div>
							)}
						</Button>
					</CardContent>
				</Card>
				<div className="flex md:w-auto w-full flex-col md:space-y-[30px] space-y-3">
					<Card className="md:w-80 w-full border-hover-green border-[1px] rounded-[12px] p-6 drop-shadow-lg">
						<CardContent className="p-0 flex flex-col space-y-[18px]">
							<div className="flex justify-between items-center">
								<h4 className="text-sm text-dark-grey">Total APR 7D</h4>
								<p className="text-lg font-bold text-main-black">
									{`${poolDetailData?.apr24h.toFixed(2) ?? 0.0}%`}
								</p>
							</div>
							<div className="flex flex-col space-y-3">
								<div className="flex justify-between items-center text-sm text-dark-grey">
									<h4>Fees</h4>
									<p>{`${(poolDetailData?.feeRate ?? 0 * 100).toFixed(2)}%`}</p>
								</div>
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
									<p>
										{formatTokenBalance(
											Number(poolDetailData?.reserveA ?? 0),
											poolDetailData?.mintA.decimals ?? 0
										).toLocaleString()}
									</p>
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
									<p>
										{formatTokenBalance(
											Number(poolDetailData?.reserveB ?? 0),
											poolDetailData?.mintB.decimals ?? 0
										).toLocaleString()}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className="md:w-80 w-full border-hover-green border-[1px] rounded-[12px] p-6 drop-shadow-lg">
						<CardContent className="p-0 flex flex-col space-y-[18px]">
							<div className="flex justify-between items-center font-normal text-sm text-dark-grey">
								<h4>My Position</h4>
								{getUserPoolStats.isLoading ? (
									<Skeleton className="h-4 w-12" />
								) : (
									<p>${userStatsData?.userReserveTotalPrice.toLocaleString()}</p>
								)}
							</div>
							<div className="flex flex-col space-y-3 text-dark-grey">
								<h3 className="text-main-black">LP Token Balances</h3>
								<div className="flex items-center justify-between">
									<h4>Staked/Unstaked</h4>
									{getUserPoolStats.isLoading ? (
										<Skeleton className="h-4 w-12" />
									) : (
										<p>{userStatsData?.userLPToken} LP</p>
									)}
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

				{successData && poolDetailData && (
					<LPSuccessDialog
						isNewTab
						isOpen={isSuccessDialogOpen}
						onOpenChange={setIsSuccessDialogOpen}
						title="Deposit Successful"
						contents={[
							'Your liquidity was added successfully',
							`Total deposit value $${successData.totalValue}`
						]}
						linkText="View Position"
						link={`https://explorer.bbachain.com/tx/${successData.signature}`}
					/>
				)}
			</div>
		</div>
	)
}
