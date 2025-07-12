'use client'

import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

import { NoBalanceAlert } from '@/components/layout/Alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PoolListColumns, type PoolListProps } from '@/features/liquidityPool/components/Columns'
import CreatePoolForm from '@/features/liquidityPool/components/CreatePoolForm'
import { DataTable as PoolListTable } from '@/features/liquidityPool/components/DataTable'
import { OnchainPoolData } from '@/features/liquidityPool/onchain'
import { useGetPools } from '@/features/liquidityPool/services'
import { PoolData } from '@/features/liquidityPool/types'
import { formatOnchainPoolsForUI } from '@/features/liquidityPool/utils'
import { useGetBalance } from '@/services/wallet'
import { useErrorDialog } from '@/stores/errorDialog'

function EmptyPoolsState() {
	return (
		<div className="w-full flex flex-col items-center justify-center py-16 space-y-4">
			<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
				<svg
					className="w-8 h-8 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</div>
			<div className="text-center">
				<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No liquidity pools found</h3>
				<p className="text-gray-500 dark:text-gray-400">
					There are currently no liquidity pools available or your search didn&apos;t match any pools.
				</p>
			</div>
		</div>
	)
}

export default function LiquidityPools() {
	const getPoolsQuery = useGetPools()
	const getBalanceQuery = useGetBalance()
	const { openErrorDialog } = useErrorDialog()

	const isNoBalance = getBalanceQuery.isError || !getBalanceQuery.data || getBalanceQuery.data === 0
	const allPoolsData = getPoolsQuery.data ? formatOnchainPoolsForUI(getPoolsQuery.data.data) : []

	// Handle errors
	useEffect(() => {
		if (getPoolsQuery.isError && getPoolsQuery.error) {
			openErrorDialog({
				title: 'Failed to load liquidity pools',
				description: getPoolsQuery.error.message || 'Unable to fetch pools data. Please try again later.'
			})
		}
	}, [getPoolsQuery.isError, getPoolsQuery.error, openErrorDialog])

	// Handle balance errors with toast
	useEffect(() => {
		if (getBalanceQuery.isError && getBalanceQuery.error) {
			toast.error('Failed to load wallet balance')
		}
	}, [getBalanceQuery.isError, getBalanceQuery.error])

	// Show loading state while balance is loading
	if (getBalanceQuery.isLoading) {
		return (
			<div className="h-full w-full md:mt-20 mt-40 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p className="text-gray-600 dark:text-gray-400">Loading wallet information...</p>
			</div>
		)
	}

	return (
		<div className="xl:px-48 md:px-16 px-[15px] flex flex-col lg:space-y-14 md:space-y-9 space-y-3">
			<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">Liquidity Pools</h1>

			{/* Show balance alert if needed */}
			{isNoBalance && <NoBalanceAlert />}

			<Tabs defaultValue="all-pools">
				<TabsList className="bg-transparent mb-6 flex justify-center md:space-x-[18px] space-x-0">
					<TabsTrigger
						className="md:text-lg !bg-transparent text-base text-main-black font-medium pt-0 pb-2.5 px-2.5 hover:text-main-green  hover:border-main-green hover:border-b-2 focus-visible:border-b-2 focus-visibleborder-main-green data-[state=active]:text-main-green data-[state=active]:border-b-2  data-[state=active]:border-main-green data-[state=active]:shadow-none rounded-none"
						value="all-pools"
					>
						All Pools
					</TabsTrigger>
					<TabsTrigger
						className="md:text-lg !bg-transparent text-base text-main-black font-medium pt-0 pb-2.5 px-2.5 hover:text-main-green  hover:border-main-green hover:border-b-2 focus-visible:border-b-2 focus-visibleborder-main-green data-[state=active]:text-main-green data-[state=active]:border-b-2  data-[state=active]:border-main-green data-[state=active]:shadow-none rounded-none"
						value="my-pools"
					>
						My Pools
					</TabsTrigger>
					<TabsTrigger
						className="md:text-lg !bg-transparent text-base text-main-black font-medium pt-0 pb-2.5 px-2.5 hover:text-main-green  hover:border-main-green hover:border-b-2 focus-visible:border-b-2 focus-visibleborder-main-green data-[state=active]:text-main-green data-[state=active]:border-b-2  data-[state=active]:border-main-green data-[state=active]:shadow-none rounded-none"
						value="create-pool"
					>
						Create Pool
					</TabsTrigger>
				</TabsList>
				<TabsContent value="all-pools">
					{getPoolsQuery.isError ? (
						<EmptyPoolsState />
					) : allPoolsData.length === 0 && !getPoolsQuery.isLoading ? (
						<EmptyPoolsState />
					) : (
						<PoolListTable
							columns={PoolListColumns}
							data={allPoolsData}
							isLoading={getPoolsQuery.isLoading}
							onRefresh={() => getPoolsQuery.refetch()}
							enableColumnFilters={true}
							enableGlobalFilter={true}
							enablePagination={true}
							enableSorting={true}
							enableExport={true}
							enableColumnVisibility={true}
							pageSize={10}
							pageSizeOptions={[5, 10, 20, 50, 100]}
						/>
					)}
				</TabsContent>
				<TabsContent value="my-pools">
					{/* For now, show empty state for My Pools - can be enhanced later */}
					<div className="w-full flex flex-col items-center justify-center py-16 space-y-4">
						<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
							<svg
								className="w-8 h-8 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.5"
								/>
							</svg>
						</div>
						<div className="text-center">
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No pools created yet</h3>
							<p className="text-gray-500 dark:text-gray-400">
								You haven&apos;t created any liquidity pools yet. Click the &quot;Create Pool&quot; tab to get started.
							</p>
						</div>
					</div>
				</TabsContent>
				<TabsContent value="create-pool">
					<CreatePoolForm />
				</TabsContent>
			</Tabs>
		</div>
	)
}
