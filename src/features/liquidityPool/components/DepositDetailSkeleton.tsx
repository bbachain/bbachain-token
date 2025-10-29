'use client'

import { useRouter } from 'next/navigation'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function DepositDetailSkeleton() {
	const router = useRouter()

	return (
		<div className="w-full px-[15px]">
			{/* Back Button */}
			<Button
				variant="ghost"
				onClick={() => router.back()}
				className="md:flex hidden w-32 mb-14 xl:ml-36 lg:ml-10 text-main-black items-center space-x-2.5 text-xl"
			>
				<HiOutlineArrowNarrowLeft />
				<h4>Back</h4>
			</Button>

			<div className="flex justify-center md:flex-row md:space-x-[30px] md:space-y-0 flex-col space-y-6 items-center">
				{/* Left Card */}
				<Card className="md:w-[500px] h-full w-full border-hover-green border rounded-[12px] drop-shadow-lg">
					<CardHeader className="pb-4">
						<CardTitle className="text-xl font-semibold text-main-black flex items-center gap-3">
							<div className="flex items-center -space-x-2">
								<Skeleton className="h-6 w-6 rounded-full" />
								<Skeleton className="h-6 w-6 rounded-full" />
							</div>
							<Skeleton className="h-5 w-40" />
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col space-y-4">
							<Skeleton className="h-16 w-full rounded-lg" />
							<Skeleton className="h-16 w-full rounded-lg" />
						</div>

						{/* Pool Ratio Info */}
						<div className="mt-4 p-3 bg-box-3 rounded-lg">
							<Skeleton className="h-4 w-24 mb-2" />
							<div className="flex justify-between">
								<Skeleton className="h-3 w-28" />
								<Skeleton className="h-3 w-28" />
							</div>
						</div>

						{/* Total Deposit */}
						<div className="p-2.5 my-4 flex justify-between items-center w-full rounded-[10px] bg-light-blue">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-4 w-12" />
						</div>

						{/* Slippage Settings */}
						<div className="flex mb-4 w-full items-center justify-between">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-20" />
						</div>

						{/* Deposit Button */}
						<Button
							type="button"
							size="lg"
							className={cn(
								'rounded-[26px] h-12 text-lg font-medium text-main-white py-3 w-full transition-all'
							)}
							disabled
						>
							<Skeleton className="h-6 w-40 mx-auto rounded" />
						</Button>
					</CardContent>
				</Card>

				{/* Right Cards */}
				<div className="flex md:w-auto w-full flex-col md:space-y-[30px] space-y-3">
					{/* APR Card */}
					<Card className="md:w-80 w-full border-hover-green border rounded-[12px] p-6 drop-shadow-lg">
						<CardContent className="p-0 flex flex-col space-y-[18px]">
							<div className="flex justify-between items-center">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-10" />
							</div>
							<div className="flex flex-col space-y-3">
								<div className="flex justify-between items-center">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-4 w-8" />
								</div>
							</div>
							<div className="flex flex-col space-y-3">
								<div className="flex justify-between items-center">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-12" />
								</div>
								<div className="flex justify-between items-center">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-12" />
								</div>
								<div className="flex justify-between items-center">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-12" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* My Position Card */}
					<Card className="md:w-80 w-full border-hover-green border rounded-[12px] p-6 drop-shadow-lg">
						<CardContent className="p-0 flex flex-col space-y-[18px]">
							<div className="flex justify-between items-center">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-16" />
							</div>
							<div className="flex flex-col space-y-3">
								<Skeleton className="h-4 w-28" />
								<div className="flex justify-between">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-12" />
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
