'use client'

import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
	VisibilityState,
	ColumnFiltersState
} from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { BiSort } from 'react-icons/bi'
import { BsDownload } from 'react-icons/bs'
import { HiOutlineAdjustmentsHorizontal } from 'react-icons/hi2'
import { IoIosArrowBack, IoIosArrowForward, IoIosArrowDown } from 'react-icons/io'
import { IoSearchOutline, IoFilterOutline, IoDownloadOutline, IoEyeOutline } from 'react-icons/io5'
import { TbAdjustmentsHorizontal } from 'react-icons/tb'
import { TbRefresh, TbColumns } from 'react-icons/tb'
import { TfiReload } from 'react-icons/tfi'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuCheckboxItem,
	DropdownMenuSeparator,
	DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/isMobile'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

import { PoolListProps } from './Columns'
import DetailPoolDialog from './DetailPoolDialog'

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	isLoading?: boolean
	onRefresh?: () => void
	isRefreshing?: boolean
	enableColumnFilters?: boolean
	enableGlobalFilter?: boolean
	enablePagination?: boolean
	enableSorting?: boolean
	enableExport?: boolean
	enableColumnVisibility?: boolean
	pageSize?: number
	pageSizeOptions?: number[]
}

// Advanced filter types
type FilterType = 'all' | 'high-liquidity' | 'low-fee' | 'high-apr' | 'popular'

interface AdvancedFilters {
	type: FilterType
	minLiquidity: number
	maxLiquidity: number
	minAPR: number
	maxAPR: number
	maxFee: number
	tokens: string[]
}

// Enhanced global filter function
function enhancedGlobalFilterFn<T extends PoolListProps>(row: any, columnId: string, filterValue: string) {
	const { mintA, mintB, id } = row.original as PoolListProps
	const search = filterValue.toLowerCase()

	return (
		mintA.name.toLowerCase().includes(search) ||
		mintB.name.toLowerCase().includes(search) ||
		mintA.symbol.toLowerCase().includes(search) ||
		mintB.symbol.toLowerCase().includes(search) ||
		mintA.address.toLowerCase().includes(search) ||
		mintB.address.toLowerCase().includes(search) ||
		id.toLowerCase().includes(search) ||
		`${mintA.symbol}-${mintB.symbol}`.toLowerCase().includes(search)
	)
}

// Advanced filter function
function advancedFilterFn<T extends PoolListProps>(row: any, filters: AdvancedFilters) {
	const pool = row.original as PoolListProps

	// Apply liquidity filters
	if (filters.minLiquidity > 0 && pool.liquidity < filters.minLiquidity) return false
	if (filters.maxLiquidity > 0 && pool.liquidity > filters.maxLiquidity) return false

	// Apply APR filters
	if (filters.minAPR > 0 && pool.apr24h < filters.minAPR) return false
	if (filters.maxAPR > 0 && pool.apr24h > filters.maxAPR) return false

	// Apply fee filters
	if (filters.maxFee > 0 && pool.swapFee > filters.maxFee / 100) return false

	// Apply token filters
	if (filters.tokens.length > 0) {
		const hasToken = filters.tokens.some(
			(token) =>
				pool.mintA.symbol.toLowerCase().includes(token.toLowerCase()) ||
				pool.mintB.symbol.toLowerCase().includes(token.toLowerCase())
		)
		if (!hasToken) return false
	}

	// Apply preset filters
	switch (filters.type) {
		case 'high-liquidity':
			return pool.liquidity >= 100000 // $100K+
		case 'low-fee':
			return pool.swapFee <= 0.003 // 0.3% or less
		case 'high-apr':
			return pool.apr24h >= 10 // 10%+ APR
		case 'popular':
			return pool.volume24h >= 50000 // $50K+ volume
		default:
			return true
	}
}

function TableSkeleton() {
	return (
		<div className="rounded-[12px] w-full border border-gray-200 dark:border-gray-800 overflow-hidden">
			<div className="bg-gray-50 dark:bg-gray-900 p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<Skeleton className="h-10 w-72" />
						<Skeleton className="h-10 w-24" />
					</div>
					<div className="flex items-center space-x-2">
						<Skeleton className="h-8 w-20" />
						<Skeleton className="h-8 w-8" />
					</div>
				</div>
			</div>
			<Table className="w-full">
				<TableHeader>
					<TableRow>
						{Array.from({ length: 6 }).map((_, i) => (
							<TableHead key={i} className="p-4">
								<Skeleton className="h-4 w-full" />
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 8 }).map((_, i) => (
						<TableRow key={i} className="h-16">
							{Array.from({ length: 6 }).map((_, j) => (
								<TableCell key={j} className="p-4">
									<Skeleton className="h-4 w-full" />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4">
			<div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
				<IoSearchOutline className="w-10 h-10 text-gray-400" />
			</div>
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
				{hasFilters ? 'No matching pools' : 'No pools available'}
			</h3>
			<p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
				{hasFilters
					? 'Try adjusting your search criteria or filters to find pools that match your requirements.'
					: 'There are currently no liquidity pools available. Check back later or create a new pool.'}
			</p>
			{hasFilters && (
				<Button variant="outline" onClick={onClearFilters} className="mt-2">
					Clear all filters
				</Button>
			)}
		</div>
	)
}

export function DataTable<TData, TValue>({
	columns,
	data,
	isLoading = false,
	isRefreshing,
	onRefresh,
	enableColumnFilters = true,
	enableGlobalFilter = true,
	enablePagination = true,
	enableSorting = true,
	enableExport = false,
	enableColumnVisibility = true,
	pageSize = 10,
	pageSizeOptions = [5, 10, 20, 50, 100]
}: DataTableProps<TData, TValue>) {
	const [globalFilter, setGlobalFilter] = useState<string>('')
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize })
	const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
		type: 'all',
		minLiquidity: 0,
		maxLiquidity: 0,
		minAPR: 0,
		maxAPR: 0,
		maxFee: 0,
		tokens: []
	})
	const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false)
	const router = useRouter()
	const isMobile = useIsMobile()

	// Debounced search
	const debouncedGlobalFilter = useDebounce(globalFilter, 300)

	// Filter data based on advanced filters
	const filteredData = useMemo(() => {
		if (!data) return []

		return data.filter((item) => {
			// Apply advanced filters
			if (
				advancedFilters.type !== 'all' ||
				advancedFilters.minLiquidity > 0 ||
				advancedFilters.maxLiquidity > 0 ||
				advancedFilters.minAPR > 0 ||
				advancedFilters.maxAPR > 0 ||
				advancedFilters.maxFee > 0 ||
				advancedFilters.tokens.length > 0
			) {
				return advancedFilterFn({ original: item }, advancedFilters)
			}
			return true
		})
	}, [data, advancedFilters])

	const table = useReactTable({
		data: filteredData,
		columns,
		state: {
			sorting,
			globalFilter: debouncedGlobalFilter,
			columnFilters,
			columnVisibility,
			pagination
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: enhancedGlobalFilterFn,
		manualPagination: false,
		enableSorting,
		enableGlobalFilter,
		enableColumnFilters
	})

	const exportData = useCallback(() => {
		const visibleData = table.getFilteredRowModel().rows.map((row) => {
			const pool = row.original as PoolListProps
			return {
				Pool: `${pool.mintA.symbol}-${pool.mintB.symbol}`,
				Liquidity: pool.liquidity,
				'Volume 24h': pool.volume24h,
				'Fees 24h': pool.fees24h,
				'APR 24h': pool.apr24h,
				'Swap Fee': pool.swapFee,
				'Token A': pool.mintA.name,
				'Token B': pool.mintB.name,
				Address: pool.id
			}
		})

		const csv = [
			Object.keys(visibleData[0] || {}).join(','),
			...visibleData.map((row) => Object.values(row).join(','))
		].join('\n')

		const blob = new Blob([csv], { type: 'text/csv' })
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `liquidity-pools-${new Date().toISOString().split('T')[0]}.csv`
		a.click()
		window.URL.revokeObjectURL(url)
	}, [table])

	const clearAllFilters = useCallback(() => {
		setGlobalFilter('')
		setColumnFilters([])
		setAdvancedFilters({
			type: 'all',
			minLiquidity: 0,
			maxLiquidity: 0,
			minAPR: 0,
			maxAPR: 0,
			maxFee: 0,
			tokens: []
		})
	}, [])

	const hasActiveFilters = useMemo(() => {
		return (
			debouncedGlobalFilter !== '' ||
			columnFilters.length > 0 ||
			advancedFilters.type !== 'all' ||
			advancedFilters.minLiquidity > 0 ||
			advancedFilters.maxLiquidity > 0 ||
			advancedFilters.minAPR > 0 ||
			advancedFilters.maxAPR > 0 ||
			advancedFilters.maxFee > 0 ||
			advancedFilters.tokens.length > 0
		)
	}, [debouncedGlobalFilter, columnFilters, advancedFilters])

	useEffect(() => {
		setColumnVisibility((prev) => {
			if (isMobile) {
				return {
					...prev,
					liquidity: false,
					volume24h: false,
					fees24h: false
				}
			} else {
				// Restore them
				return {
					...prev,
					liquidity: true,
					volume24h: true,
					fees24h: true
				}
			}
		})
	}, [isMobile])

	const totalPools = data?.length || 0
	const filteredPools = table.getFilteredRowModel().rows.length
	const currentPage = table.getState().pagination.pageIndex + 1
	const totalPages = table.getPageCount()
	const startIndex = table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
	const endIndex = Math.min(startIndex + table.getState().pagination.pageSize - 1, filteredPools)

	if (isLoading) {
		return <TableSkeleton />
	}

	return (
		<div className="w-full md:space-y-6 space-y-4">
			{/* Enhanced Header Controls */}
			<div className="flex flex-col gap-4">
				{/* Search and Quick Filters */}
				<div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
					<div className="flex flex-col sm:flex-row gap-3 flex-1">
						{/* Search Input */}
						{enableGlobalFilter && (
							<section className="relative lg:max-w-[400px] w-full">
								<IoSearchOutline className="absolute left-3 top-1/2 text-xl -translate-y-1/2 text-gray-500" />
								<Input
									placeholder="Search"
									value={globalFilter}
									onChange={(e) => setGlobalFilter(e.target.value)}
									className="rounded-[10px] pl-9 md:h-12 h-9 border-[1.4px] border-[#989898] dark:border-[#C6C6C6]"
								/>
							</section>
						)}

						{/* Quick Filter Presets */}
						<div className="lg:flex hidden items-center gap-2">
							<Select
								value={advancedFilters.type}
								onValueChange={(value: FilterType) => setAdvancedFilters((prev) => ({ ...prev, type: value }))}
							>
								<SelectTrigger className="w-[150px] p-[18px] h-12 text-sm text-main-black rounded-[10px] bg-box border border-transparent outline-none !ring-0 focus:border-2 focus:border-main-black ">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Pools</SelectItem>
									<SelectItem value="high-liquidity">High Liquidity</SelectItem>
									<SelectItem value="low-fee">Low Fee</SelectItem>
									<SelectItem value="high-apr">High APR</SelectItem>
									<SelectItem value="popular">Popular</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex justify-between">
						<div className="flex lg:hidden items-center gap-2">
							<Select
								value={advancedFilters.type}
								onValueChange={(value: FilterType) => setAdvancedFilters((prev) => ({ ...prev, type: value }))}
							>
								<SelectTrigger className="w-[120px] px-3 py-2 h-9 text-sm text-main-black rounded-[10px] bg-box border border-transparent outline-none !ring-0 focus:border-2 focus:border-main-black ">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Pools</SelectItem>
									<SelectItem value="high-liquidity">High Liquidity</SelectItem>
									<SelectItem value="low-fee">Low Fee</SelectItem>
									<SelectItem value="high-apr">High APR</SelectItem>
									<SelectItem value="popular">Popular</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Action Buttons */}
						<div className="flex items-center gap-2">
							{/* Advanced Filters Toggle */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="[&_svg]:size-6"
											onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
										>
											<TbAdjustmentsHorizontal />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Advanced Filters</TooltipContent>
								</Tooltip>
							</TooltipProvider>

							{/* Column Visibility */}
							{!isMobile && enableColumnVisibility && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="[&_svg]:size-6">
											<TbColumns />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
										<DropdownMenuSeparator />
										{table
											.getAllColumns()
											.filter((column) => column.getCanHide())
											.map((column) => (
												<DropdownMenuCheckboxItem
													key={column.id}
													checked={column.getIsVisible()}
													onCheckedChange={(value) => column.toggleVisibility(!!value)}
												>
													{column.id}
												</DropdownMenuCheckboxItem>
											))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}

							{/* Export */}
							{enableExport && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="[&_svg]:size-5"
												onClick={exportData}
												disabled={filteredPools === 0}
											>
												<BsDownload />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Export to CSV</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}

							{/* Refresh */}
							{onRefresh && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant="ghost" size="icon" className="[&_svg]:size-5" onClick={onRefresh}>
												<TfiReload className={cn(isRefreshing && 'animate-spin')} />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Refresh data</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
					</div>
				</div>

				{/* Advanced Filters Panel */}
				{!isMobile && showAdvancedFilters && (
					<Card className="bg-box">
						<CardContent className="p-[18px]">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<div>
									<label className="text-lg font-normal mb-2 block">Min Liquidity ($)</label>
									<Input
										type="number"
										placeholder="0"
										value={advancedFilters.minLiquidity || ''}
										onChange={(e) =>
											setAdvancedFilters((prev) => ({
												...prev,
												minLiquidity: parseInt(e.target.value) || 0
											}))
										}
										className="h-10 bg-main-white border-strokes focus:border-main-white focus:ring-0 text-sm text-light-grey"
									/>
								</div>
								<div>
									<label className="text-lg font-normal mb-2 block">Max Liquidity ($)</label>
									<Input
										type="number"
										placeholder="No limit"
										value={advancedFilters.maxLiquidity || ''}
										onChange={(e) =>
											setAdvancedFilters((prev) => ({
												...prev,
												maxLiquidity: parseInt(e.target.value) || 0
											}))
										}
										className="h-10 bg-main-white border-strokes focus:border-main-white focus:ring-0 text-sm text-light-grey"
									/>
								</div>
								<div>
									<label className="text-lg font-normal mb-2 block">Min APR (%)</label>
									<Input
										type="number"
										placeholder="0"
										value={advancedFilters.minAPR || ''}
										onChange={(e) =>
											setAdvancedFilters((prev) => ({
												...prev,
												minAPR: parseInt(e.target.value) || 0
											}))
										}
										className="h-10 bg-main-white border-strokes focus:border-main-white focus:ring-0 text-sm text-light-grey"
									/>
								</div>
								<div>
									<label className="text-lg font-normal mb-2 block">Max Fee (%)</label>
									<Input
										type="number"
										step="0.01"
										placeholder="No limit"
										value={advancedFilters.maxFee || ''}
										onChange={(e) =>
											setAdvancedFilters((prev) => ({
												...prev,
												maxFee: parseFloat(e.target.value) || 0
											}))
										}
										className="h-10 bg-main-white border-strokes focus:border-main-white focus:ring-0 text-sm text-light-grey"
									/>
								</div>
							</div>
							<div className="flex justify-end mt-[18px]">
								<Button
									size="sm"
									className="bg-dark-grey rounded-[26px] text-xs text-main-white"
									onClick={() =>
										setAdvancedFilters({
											type: 'all',
											minLiquidity: 0,
											maxLiquidity: 0,
											minAPR: 0,
											maxAPR: 0,
											maxFee: 0,
											tokens: []
										})
									}
								>
									Clear Filters
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{isMobile && (
					<Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
						<DialogContent className="w-full max-w-[290px] p-[18px] rounded-[8px]">
							<DialogHeader>
								<DialogTitle className="text-left text-lg">Advanced Filters</DialogTitle>
							</DialogHeader>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<div>
									<label className="text-sm font-normal mb-2 block">Min Liquidity ($)</label>
									<Input
										type="number"
										placeholder="0"
										value={advancedFilters.minLiquidity || ''}
										onChange={(e) =>
											setAdvancedFilters((prev) => ({
												...prev,
												minLiquidity: parseInt(e.target.value) || 0
											}))
										}
										className="h-10 bg-main-white border-strokes focus:border-main-white focus:ring-0 text-sm text-light-grey"
									/>
								</div>
								<div>
									<label className="text-sm font-normal mb-2 block">Max Liquidity ($)</label>
									<Input
										type="number"
										placeholder="No limit"
										value={advancedFilters.maxLiquidity || ''}
										onChange={(e) =>
											setAdvancedFilters((prev) => ({
												...prev,
												maxLiquidity: parseInt(e.target.value) || 0
											}))
										}
										className="h-10 bg-main-white border-strokes focus:border-main-white focus:ring-0 text-sm text-light-grey"
									/>
								</div>
								<div>
									<label className="text-sm font-normal mb-2 block">Min APR (%)</label>
									<Input
										type="number"
										placeholder="0"
										value={advancedFilters.minAPR || ''}
										onChange={(e) =>
											setAdvancedFilters((prev) => ({
												...prev,
												minAPR: parseInt(e.target.value) || 0
											}))
										}
										className="h-10 bg-main-white border-strokes focus:border-main-white focus:ring-0 text-sm text-light-grey"
									/>
								</div>
								<div>
									<label className="text-sm font-normal mb-2 block">Max Fee (%)</label>
									<Input
										type="number"
										step="0.01"
										placeholder="No limit"
										value={advancedFilters.maxFee || ''}
										onChange={(e) =>
											setAdvancedFilters((prev) => ({
												...prev,
												maxFee: parseFloat(e.target.value) || 0
											}))
										}
										className="h-10 bg-main-white border-strokes focus:border-main-white focus:ring-0 text-sm text-light-grey"
									/>
								</div>
							</div>
							<div className="flex justify-end">
								<Button
									size="sm"
									className="bg-dark-grey rounded-[26px] text-xs text-main-white"
									onClick={() =>
										setAdvancedFilters({
											type: 'all',
											minLiquidity: 0,
											maxLiquidity: 0,
											minAPR: 0,
											maxAPR: 0,
											maxFee: 0,
											tokens: []
										})
									}
								>
									Clear Filters
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				)}

				{/* Active Filters Display */}
				{hasActiveFilters && (
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
						{debouncedGlobalFilter && (
							<Badge variant="secondary" className="gap-1">
								Search: {debouncedGlobalFilter}
								<button onClick={() => setGlobalFilter('')} className="ml-1 hover:text-destructive">
									×
								</button>
							</Badge>
						)}
						{advancedFilters.type !== 'all' && (
							<Badge variant="secondary" className="gap-1">
								Type: {advancedFilters.type}
								<button
									onClick={() => setAdvancedFilters((prev) => ({ ...prev, type: 'all' }))}
									className="ml-1 hover:text-destructive"
								>
									×
								</button>
							</Badge>
						)}
						{advancedFilters.minLiquidity > 0 && (
							<Badge variant="secondary" className="gap-1">
								Min Liquidity: ${advancedFilters.minLiquidity.toLocaleString()}
								<button
									onClick={() => setAdvancedFilters((prev) => ({ ...prev, minLiquidity: 0 }))}
									className="ml-1 hover:text-destructive"
								>
									×
								</button>
							</Badge>
						)}
						<Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
							Clear all
						</Button>
					</div>
				)}
			</div>

			{/* Stats Bar */}
			<div className="flex items-center justify-between">
				<div className="flex text-main-black text-lg items-center gap-6">
					<p className="md:block hidden">
						{filteredPools === totalPools ? `${totalPools} total pools` : `${filteredPools} of ${totalPools} pools`}
					</p>
					{enablePagination && filteredPools > 0 && (
						<p className="md:block hidden">
							Showing{' '}
							<span className="font-medium">
								{startIndex}-{endIndex}
							</span>{' '}
							of <span className="font-medium">{filteredPools}</span>
						</p>
					)}
				</div>
				{enablePagination && (
					<div className="flex text-sm md:w-auto w-full text-main-black items-center gap-2">
						<p>Rows per page:</p>
						<Select
							value={table.getState().pagination.pageSize.toString()}
							onValueChange={(value) => {
								table.setPageSize(Number(value))
							}}
						>
							<SelectTrigger className="h-8 w-16">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{pageSizeOptions.map((size) => (
									<SelectItem key={size} value={size.toString()}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</div>

			{/* Table */}
			<div className="rounded-[12px] border border-light-grey overflow-hidden">
				<div className="overflow-x-auto">
					<Table className="w-full">
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id} className="bg-box-3 h-[58px]">
									{headerGroup.headers.map((header) => (
										<TableHead key={header.id} className="font-semibold text-main-black">
											{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									))}
									<TableHead
										className={cn('w-32 text-right text-main-black md:pr-6 font-semibold', isMobile && 'hidden')}
									>
										Actions
									</TableHead>
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row, index) => {
									const id = (row.original as PoolListProps).id
									return (
										<TableRow
											key={row.id}
											data-state={row.getIsSelected() && 'selected'}
											className={cn(
												'border-b  border-light-grey transition-colors hover:bg-box-3 focus:bg-box-3',
												'h-16',
												index === table.getRowModel().rows.length - 1 && 'border-b-0'
											)}
											onClick={() => {
												if (isMobile) {
													router.push(`?poolId=${id}`)
												}
											}}
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id} className="py-3">
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
											<TableCell className={cn('py-3 text-right md:pr-6', isMobile && 'hidden')}>
												<div className="flex justify-end gap-2">
													<Link
														href={`/swap?from=${(row.original as PoolListProps).mintA.address}&to=${(row.original as PoolListProps).mintB.address}`}
														className={cn(
															buttonVariants({ variant: 'outline', size: 'lg' }),
															'h-7 w-[49.5px] rounded-[13px] py-1.5 text-xs font-medium border-main-green text-main-green hover:bg-main-green hover:text-white transition-colors'
														)}
													>
														Swap
													</Link>
													<Link
														href={`/liquidity-pools/deposit/${id}`}
														className={cn(
															buttonVariants({ variant: 'default', size: 'lg' }),
															'h-7 w-[75px] rounded-[13px] py-1.5 text-xs font-medium bg-main-green hover:bg-hover-green text-white'
														)}
													>
														Deposit
													</Link>
												</div>
											</TableCell>
										</TableRow>
									)
								})
							) : (
								<TableRow>
									<TableCell colSpan={columns.length + 1} className="h-32">
										<EmptyState hasFilters={hasActiveFilters} onClearFilters={clearAllFilters} />
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Enhanced Pagination */}
			{enablePagination && filteredPools > 0 && (
				<div className="flex items-center justify-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="[&_svg]:size-5"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<IoIosArrowBack />
					</Button>

					{/* Page Numbers */}
					<div className="flex items-center gap-1">
						{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
							let pageNum: number
							if (totalPages <= 7) {
								pageNum = i
							} else if (currentPage <= 4) {
								pageNum = i
							} else if (currentPage > totalPages - 4) {
								pageNum = totalPages - 7 + i
							} else {
								pageNum = currentPage - 4 + i
							}

							return (
								<Button
									key={pageNum}
									variant={currentPage === pageNum + 1 ? 'default' : 'outline'}
									size="sm"
									onClick={() => table.setPageIndex(pageNum)}
									className={cn(
										'h-9 w-9 p-0 rounded-full',
										currentPage === pageNum + 1 && 'bg-main-green hover:bg-hover-green'
									)}
								>
									{pageNum + 1}
								</Button>
							)
						})}
					</div>

					<Button
						variant="ghost"
						size="icon"
						className="[&_svg]:size-5"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<IoIosArrowForward />
					</Button>
				</div>
			)}
			<DetailPoolDialog />
		</div>
	)
}
