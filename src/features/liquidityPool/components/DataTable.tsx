'use client'

import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import { IoSearchOutline } from 'react-icons/io5'
import { TbRefresh } from 'react-icons/tb'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { PoolListProps } from './Columns'

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	isLoading?: boolean
	onRefresh?: () => void
}

function customGlobalFilterFn<T extends PoolListProps>(row: any, columnId: string, filterValue: string) {
	const { mintA, mintB } = row.original as PoolListProps
	const search = filterValue.toLowerCase()

	return (
		mintA.name.toLowerCase().includes(search) ||
		mintB.name.toLowerCase().includes(search) ||
		mintA.symbol.toLowerCase().includes(search) ||
		mintB.symbol.toLowerCase().includes(search) ||
		mintA.address.includes(search) ||
		mintB.address.includes(search)
	)
}

function TableSkeleton() {
	return (
		<div className="rounded-[10px] w-full border-[1.4px] border-[#989898] dark:border-[#C6C6C6] h-full min-h-[300px]">
			<Table className="w-full">
				<TableHeader className="h-[58px]">
					<TableRow>
						{Array.from({ length: 6 }).map((_, i) => (
							<TableHead key={i}>
								<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 4 }).map((_, i) => (
						<TableRow key={i} className="h-[58px]">
							{Array.from({ length: 6 }).map((_, j) => (
								<TableCell key={j}>
									<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}

export function DataTable<TData, TValue>({
	columns,
	data,
	isLoading = false,
	onRefresh
}: DataTableProps<TData, TValue>) {
	const [globalFilter, setGlobalFilter] = useState<string>('')
	const [sorting, setSorting] = useState<SortingState>([])

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: customGlobalFilterFn,
		state: {
			sorting,
			globalFilter
		},
		initialState: {
			pagination: {
				pageSize: 4
			}
		}
	})

	const totalPools = data.length
	const filteredPools = table.getFilteredRowModel().rows.length
	const showingFrom = table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
	const showingTo = Math.min(
		(table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
		filteredPools
	)

	const paginationInfo = useMemo(() => {
		if (filteredPools === 0) return 'No pools found'
		if (filteredPools === totalPools) {
			return `Showing ${showingFrom}-${showingTo} of ${totalPools} pools`
		}
		return `Showing ${showingFrom}-${showingTo} of ${filteredPools} filtered pools (${totalPools} total)`
	}, [filteredPools, totalPools, showingFrom, showingTo])

	if (isLoading) {
		return (
			<div className="w-full flex flex-col md:space-y-6 space-y-3">
				<section className="relative">
					<IoSearchOutline className="absolute left-3 top-1/2 text-xl -translate-y-1/2 text-gray-500" />
					<Input
						placeholder="Search pools..."
						disabled
						className="max-w-sm rounded-[10px] pl-9 md:h-12 h-9 border-[1.4px] border-[#989898] dark:border-[#C6C6C6] opacity-50"
					/>
				</section>
				<TableSkeleton />
			</div>
		)
	}

	return (
		<div className="w-full flex flex-col md:space-y-6 space-y-3">
			<section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className="relative flex-1 max-w-sm">
					<IoSearchOutline className="absolute left-3 top-1/2 text-xl -translate-y-1/2 text-gray-500" />
					<Input
						placeholder="Search by token name, symbol, or address..."
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="rounded-[10px] pl-9 md:h-12 h-9 border-[1.4px] border-[#989898] dark:border-[#C6C6C6] pr-4"
					/>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">{paginationInfo}</span>
					{onRefresh && (
						<Button
							variant="outline"
							size="sm"
							onClick={onRefresh}
							className="border-[#989898] dark:border-[#C6C6C6] h-9"
						>
							<TbRefresh className="h-4 w-4" />
							<span className="hidden sm:inline ml-1">Refresh</span>
						</Button>
					)}
				</div>
			</section>

			<div className="rounded-[10px] w-full border-[1.4px] border-[#989898] dark:border-[#C6C6C6] h-full min-h-[300px] overflow-hidden">
				<div className="overflow-x-auto">
					<Table className="w-full min-w-[800px]">
						<TableHeader className="h-[58px] bg-gray-50 dark:bg-gray-800/50">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id} className="border-b-[1.4px] border-[#989898] dark:border-[#C6C6C6]">
									{headerGroup.headers.map((header) => {
										return (
											<TableHead key={header.id} className="font-semibold">
												{flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										)
									})}
									<TableHead className="w-32">Actions</TableHead>
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
												'h-[58px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-700',
												index === table.getRowModel().rows.length - 1 && 'border-b-0'
											)}
										>
											{row.getVisibleCells().map((cell, cellIndex, arr) => (
												<TableCell className={cn(cellIndex === 0 && 'pl-5', 'py-3')} key={cell.id}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
											<TableCell className="pr-5 py-3">
												<div className="flex justify-end space-x-2">
													<Link
														href={`/swap?from=${(row.original as PoolListProps).mintA.address}&to=${(row.original as PoolListProps).mintB.address}`}
														className={cn(
															buttonVariants({ variant: 'outline', size: 'sm' }),
															'border-main-green text-main-green hover:bg-main-green hover:text-white transition-colors px-3 h-8 text-xs font-medium rounded-[8px]'
														)}
													>
														Swap
													</Link>
													<Link
														href={`/liquidity-pools/deposit/${id}`}
														className={cn(
															buttonVariants({ variant: 'default', size: 'sm' }),
															'bg-main-green hover:bg-hover-green text-white px-3 h-8 text-xs font-medium rounded-[8px]'
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
									<TableCell colSpan={columns.length + 1} className="text-center py-12">
										<div className="flex flex-col items-center gap-2">
											<div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
												<IoSearchOutline className="w-6 h-6 text-gray-400" />
											</div>
											<p className="text-gray-500 dark:text-gray-400 font-medium">No pools found</p>
											<p className="text-sm text-gray-400 dark:text-gray-500">
												{globalFilter ? 'Try adjusting your search terms' : 'No pools available at the moment'}
											</p>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Mobile pagination info */}
			<div className="sm:hidden text-center">
				<span className="text-sm text-gray-600 dark:text-gray-400">{paginationInfo}</span>
			</div>

			{data.length > 0 && filteredPools > 0 && (
				<div className="flex items-center justify-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="[&_svg]:size-5 disabled:opacity-40"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<IoIosArrowBack />
					</Button>
					{Array.from({ length: table.getPageCount() }, (_, i) => i).map((pageIndex) => (
						<Button
							key={pageIndex}
							size="icon"
							className={cn(
								'rounded-full h-8 w-8 text-sm',
								pageIndex === table.getState().pagination.pageIndex
									? 'bg-main-green text-white hover:bg-hover-green'
									: 'bg-transparent text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
							)}
							variant={pageIndex === table.getState().pagination.pageIndex ? 'default' : 'outline'}
							onClick={() => table.setPageIndex(pageIndex)}
						>
							{pageIndex + 1}
						</Button>
					))}
					<Button
						variant="ghost"
						size="icon"
						className="[&_svg]:size-5 disabled:opacity-40"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<IoIosArrowForward />
					</Button>
				</div>
			)}
		</div>
	)
}
