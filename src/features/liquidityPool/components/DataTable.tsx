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
import { useState } from 'react'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import { IoSearchOutline } from 'react-icons/io5'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { PoolListProps } from './Columns'

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
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

	return (
		<div className="w-full flex flex-col  md:space-y-6 space-y-3">
			<section className="relative">
				<IoSearchOutline className="absolute left-3 top-1/2 text-xl -translate-y-1/2 text-gray-500" />
				<Input
					placeholder="Search"
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className="max-w-sm rounded-[10px] pl-9 md:h-12 h-9 border-[1.4px] border-[#989898] dark:border-[#C6C6C6]"
				/>
			</section>
			<div className="rounded-[10px] w-full border-[1.4px] border-[#989898] dark:border-[#C6C6C6] h-full min-h-[116px] max-h-[310px]">
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
								const id = (row.original as PoolListProps).id
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
										<TableCell className="pr-5 w-full flex justify-end space-x-2.5">
											<Link
												href={``}
												className={cn(
													buttonVariants({ variant: 'outline' }),
													'border-main-green flex-auto px-3 w-[49.5px] font-medium rounded-[13px] text-xs text-main-green'
												)}
											>
												Swap
											</Link>
											<Link
												href={`/liquidity-pools/deposit/${id}`}
												className={cn(
													buttonVariants({ variant: 'default' }),
													'bg-main-green hover:bg-hover-green flex-auto px-3 w-[75px] font-medium rounded-[13px] text-xs text-main-white'
												)}
											>
												Deposit
											</Link>
										</TableCell>
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
			{data.length > 0 && (
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
					{Array.from({ length: table.getPageCount() }).map((_, i) => (
						<Button
							key={i}
							size="icon"
							className={cn(
								'rounded-full',
								i === table.getState().pagination.pageIndex
									? 'bg-main-green text-main-white'
									: 'bg-transparent text-[#989898] dark:text-[#C6C6C6]'
							)}
							variant={i === table.getState().pagination.pageIndex ? 'default' : 'outline'}
							onClick={() => table.setPageIndex(i)}
						>
							{i + 1}
						</Button>
					))}
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
