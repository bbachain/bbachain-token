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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import { IoSearchOutline } from 'react-icons/io5'
import { cn } from '@/lib/utils'

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
											<Button
												variant="ghost"
												className={cn(
													'p-0 font-semibold text-sm text-main-black',
													header.column.columnDef.header === 'Token' && 'ml-[62px]'
												)}
												onClick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc')}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												<ArrowUpDown className="ml-2 h-4 w-4" />
											</Button>
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow className="h-[58px]" key={row.id} data-state={row.getIsSelected() && 'selected'}>
									{row.getVisibleCells().map((cell, index, arr) => (
										<TableCell className={cn(index === 0 && 'pl-5', index === arr.length - 1 && 'pr-5')} key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
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
