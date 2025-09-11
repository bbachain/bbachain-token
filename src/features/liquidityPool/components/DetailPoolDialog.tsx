import { Star } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useGetPoolById } from '@/features/liquidityPool/services'
import { TOnchainPoolData } from '@/features/liquidityPool/types'
import { cn } from '@/lib/utils'

import { getFeeTierColor, formatCurrency } from './Columns'

export default function DetailPoolDialog() {
	const queryKey = useSearchParams()
	const poolId = queryKey.get('poolId')
	const getPoolByIdQuery = useGetPoolById({ poolId: poolId ?? '' })
	const data = getPoolByIdQuery.data?.data as TOnchainPoolData

	const [isOpen, setIsOpen] = useState<boolean>(false)

	useEffect(() => {
		if (poolId) setIsOpen(true)
	}, [poolId])

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="w-full rounded-[8px] p-3 max-w-[290px]">
				<DialogHeader>
					<DialogTitle></DialogTitle>
				</DialogHeader>
				{getPoolByIdQuery.isLoading && (
					<div className="h-full w-full flex flex-col space-y-3 items-center justify-center">
						<Loader2 className="animate-spin" width={40} height={40} />
						<p className="text-gray-600 dark:text-gray-400">Loading pool data...</p>
					</div>
				)}
				{getPoolByIdQuery.isSuccess && getPoolByIdQuery.data && (
					<>
						{data ? (
							<div className="flex flex-col w-full items-center justify-center space-y-3 mt-11">
								<section className="flex w-full flex-col items-center justify-center space-y-1.5">
									<div className="flex items-center justify-center w-full flex-shrink-0 mr-3 relative">
										<Image
											src={
												data.mintA.logoURI && data.mintA.logoURI !== ''
													? data.mintA.logoURI
													: '/icon-placeholder.svg'
											}
											width={44}
											height={44}
											className="rounded-full relative"
											alt={`${data.mintA.name} icon`}
											onError={(e) => {
												e.currentTarget.src = '/icon-placeholder.svg'
											}}
										/>
										<Image
											src={
												data.mintB.logoURI && data.mintB.logoURI !== ''
													? data.mintB.logoURI
													: '/icon-placeholder.svg'
											}
											width={44}
											height={44}
											className="rounded-full relative -ml-2"
											alt={`${data.mintB.name} icon`}
											onError={(e) => {
												e.currentTarget.src = '/icon-placeholder.svg'
											}}
										/>
									</div>
									<div className="flex w-full items-center justify-center space-x-0.5">
										<h2 className="text-sm font-normal text-main-black">{`${data.mintA.symbol} - ${data.mintB.symbol}`}</h2>
										<button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
											<Star className="h-4 w-4 text-gray-400 hover:text-yellow-500 transition-colors" />
										</button>
									</div>
									<div className="flex w-full justify-center items-center gap-1">
										<p
											className={cn(
												'text-xs text-center px-1.5 py-0.5 rounded font-normal',
												getFeeTierColor(data.feeRate)
											)}
										>
											{(data.feeRate * 100).toFixed(2)}%
										</p>
									</div>
								</section>
								<section className="bg-box-3 w-full p-1.5 rounded-[4px] flex items-center space-x-11 justify-between">
									<div className="text-xs text-main-black">
										<h4 className="font-light">Volume 24h</h4>
										<p>{formatCurrency(data.volume24h)}</p>
									</div>
									<div className="text-xs text-main-black">
										<h4 className="font-light">Fees 24h</h4>
										<p>{formatCurrency(data.fees24h)}</p>
									</div>
									<div className="text-xs text-main-black">
										<h4 className="font-light">TVL</h4>
										<p>{formatCurrency(data.tvl)}</p>
									</div>
								</section>
								<section className="bg-box-3 w-full p-1.5 rounded-[4px] flex items-center justify-center">
									<div className="text-xs text-center text-main-black">
										<h4 className="font-light">Total APR24h</h4>
										<p>{data.apr24h}</p>
									</div>
								</section>
								<section className="flex w-full space-x-2.5 mt-1.5 justify-between">
									<Link
										href={`/swap?from=${data.mintA.address}&to=${data.mintB.address}`}
										className={cn(
											buttonVariants({ variant: 'outline', size: 'lg' }),
											'h-8 w-full rounded-[26px] py-1.5 text-xs font-medium border-main-green text-main-green hover:bg-main-green hover:text-white transition-colors'
										)}
									>
										Swap
									</Link>
									<Link
										href={`/liquidity-pools/deposit/${data.address}`}
										className={cn(
											buttonVariants({ variant: 'default', size: 'lg' }),
											'h-8 w-full rounded-[26px] py-1.5 text-xs font-medium bg-main-green hover:bg-hover-green text-white'
										)}
									>
										Deposit
									</Link>
								</section>
							</div>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<p className="text-sm text-main-black">Data Not Found</p>
							</div>
						)}
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
