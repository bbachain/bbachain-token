'use client'

import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface TransactionDataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
}

export function TransactionDataTable<TData, TValue>({ columns, data }: TransactionDataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	return (
		<div className="w-full flex flex-col  md:space-y-6 space-y-3">
			<div className="rounded-[10px] w-full border-[1.4px] border-[#989898] dark:border-[#C6C6C6] h-full  overflow-hidden">
				<div className="overflow-x-auto">
					<Table className="w-full">
						<TableHeader className="h-12 bg-box-3">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead key={header.id} className="text-sm font-semibold">
												{flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										)
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody className="h-full md:max-h-[410px] max-h-[246px] overflow-y-scroll">
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => {
									return (
										<TableRow
											key={row.id}
											data-state={row.getIsSelected() && 'selected'}
											className="h-[58px] cursor-pointer hover:bg-muted/50 transition"
										>
											{row.getVisibleCells().map((cell, index, arr) => (
												<TableCell
													className={cn(
														'text-sm font-normal',
														index === 0 && 'pl-6',
														index === arr.length - 1 && 'pr-6 text-right'
													)}
													key={cell.id}
												>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
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
		</div>
	)
}
