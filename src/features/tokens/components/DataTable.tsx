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
	VisibilityState
} from '@tanstack/react-table'
import Link from 'next/link'
import { useState } from 'react'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import { IoSearchOutline } from 'react-icons/io5'
import { TbColumns } from 'react-icons/tb'
import { TfiReload } from 'react-icons/tfi'

import { Button, buttonVariants } from '@/components/ui/button'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { type TokenListProps } from '@/features/tokens/components/Columns'
import { cn } from '@/lib/utils'

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	onRefresh?: () => void
	isRefreshing?: boolean
	withoutAction?: boolean
}

export function DataTable<TData, TValue>({
	columns,
	data,
	onRefresh,
	isRefreshing,
	withoutAction
}: DataTableProps<TData, TValue>) {
	const [globalFilter, setGlobalFilter] = useState<string>('')
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		state: {
			sorting,
			globalFilter,
			columnVisibility
		},
		initialState: {
			pagination: {
				pageSize: 5
			}
		}
	})

	const pageSizeOptions = [5, 10, 20, 50, 100]
	const totalPools = data?.length || 0
	const filteredPools = table.getFilteredRowModel().rows.length
	const currentPage = table.getState().pagination.pageIndex + 1
	const totalPages = table.getPageCount()
	const startIndex = table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
	const endIndex = Math.min(startIndex + table.getState().pagination.pageSize - 1, filteredPools)

	return (
		<div className="w-full flex flex-col  md:space-y-6 space-y-3">
			<div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
				<section className="relative lg:max-w-[400px] w-full">
					<IoSearchOutline className="absolute left-3 top-1/2 text-xl -translate-y-1/2 text-gray-500" />
					<Input
						placeholder="Search"
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="max-w-sm rounded-[10px] pl-9 md:h-12 h-9 border-[1.4px] border-[#989898] dark:border-[#C6C6C6]"
					/>
				</section>
				<section className="flex items-center space-x-3">
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
				</section>
			</div>
			<div className="flex items-center justify-between">
				<div className="flex text-main-black text-lg items-center gap-6">
					<p className="md:block hidden">
						{filteredPools === totalPools ? `${totalPools} total pools` : `${filteredPools} of ${totalPools} pools`}
					</p>
					{filteredPools > 0 && (
						<p className="md:block hidden">
							Showing{' '}
							<span className="font-medium">
								{startIndex}-{endIndex}
							</span>{' '}
							of <span className="font-medium">{filteredPools}</span>
						</p>
					)}
				</div>

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
			</div>
			<div className="rounded-[12px] border border-light-grey overflow-hidden">
				<div className="overflow-x-auto">
					<Table className="w-full">
						<TableHeader className="h-[58px]">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead key={header.id}>
												{flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										)
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => {
									const mintAddress = (row.original as TokenListProps).id

									return (
										<TableRow
											key={row.id}
											data-state={row.getIsSelected() && 'selected'}
											className="h-[58px] cursor-pointer hover:bg-muted/50 transition"
										>
											{row.getVisibleCells().map((cell, index, arr) => (
												<TableCell
													className={cn(index === 0 && 'pl-5', index === arr.length - 1 && 'pr-5')}
													key={cell.id}
												>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
											{!withoutAction && (
												<TableCell className="pr-5">
													<Link
														href={`/tokens/${mintAddress}`}
														className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), '[&_svg]:size-5')}
													>
														<IoIosArrowForward />
													</Link>
												</TableCell>
											)}
										</TableRow>
									)
								})
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="text-center pt-4">
										No results.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
			{filteredPools > 0 && (
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
		</div>
	)
}
