'use client'

import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { NoBalanceAlert } from '@/components/layout/Alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PoolListColumns } from '@/features/liquidityPool/components/Columns'
import CreatePoolForm from '@/features/liquidityPool/components/CreatePoolForm'
import { DataTable as PoolListTable } from '@/features/liquidityPool/components/DataTable'
import StatisticCard from '@/features/liquidityPool/components/StatisticCard'
import { useGetPools } from '@/features/liquidityPool/services'
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
	const router = useRouter()
	const getPoolsQuery = useGetPools()
	const getBalanceQuery = useGetBalance()
	const { openErrorDialog } = useErrorDialog()
	const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false)

	const isNoBalance = getBalanceQuery.isError || !getBalanceQuery.data || getBalanceQuery.data === 0
	const allPoolsData = getPoolsQuery.data ? formatOnchainPoolsForUI(getPoolsQuery.data.data) : []

	const statisticData = [
		{
			title: 'Total Pool',
			content: allPoolsData.length.toLocaleString()
		},
		{
			title: 'Total TVL',
			content: '$' + allPoolsData.reduce((sum, pool) => sum + pool.liquidity, 0).toLocaleString()
		},
		{
			title: 'AVG. APR',
			content: `${allPoolsData.length > 0 ? (allPoolsData.reduce((sum, pool) => sum + pool.apr24h, 0) / allPoolsData.length).toFixed(2) : '0.00'}%`
		}
	]

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
		<div className="xl:px-48 md:px-16 px-[15px] flex flex-col lg:space-y-14 md:space-y-9 space-y-6">
			{/* Header Section */}
			<div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
				<div className="text-center md:text-left">
					<h1 className="md:text-[45px] leading-tight text-3xl font-bold text-main-black">Liquidity Pools</h1>
					<p className="text-lg text-dark-grey font-normal">Discover and manage liquidity pools on BBAChain</p>
				</div>

				{/* Create Pool Button */}
				<Dialog open={isCreatePoolOpen} onOpenChange={setIsCreatePoolOpen}>
					<DialogTrigger asChild>
						<Button
							className="bg-main-green hover:bg-hover-green text-white rounded-full px-6 py-3 flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-200 md:text-base text-sm"
							size="lg"
						>
							<Plus className="w-5 h-5" />
							<span>Create Pool</span>
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="text-xl font-bold text-main-black">Create New Liquidity Pool</DialogTitle>
						</DialogHeader>
						<CreatePoolForm />
					</DialogContent>
				</Dialog>
			</div>

			{/* Balance Alert */}
			{isNoBalance && <NoBalanceAlert />}

			{/* Pools Section */}
			<div className="flex flex-col space-y-14">
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{statisticData.map((stats) => (
						<StatisticCard key={stats.title} isLoading={getPoolsQuery.isLoading} {...stats} />
					))}
				</div>

				{/* Pools Table */}
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
			</div>
		</div>
	)
}
