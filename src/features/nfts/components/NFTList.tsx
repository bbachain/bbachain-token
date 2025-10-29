import {
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	ColumnFiltersState,
	SortingState,
	useReactTable,
	ColumnDef
} from '@tanstack/react-table'
import { useState } from 'react'
import { IoSearchOutline } from 'react-icons/io5'

import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard, type NftCardProps } from '@/features/nfts/components/NFTCard'

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	isLoading?: boolean
}

export default function NFTList<TData, TValue>({
	columns,
	data,
	isLoading
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		state: {
			sorting,
			columnFilters
		},
		initialState: {
			pagination: {
				pageSize: 20
			}
		}
	})

	const handleSortChange = (value: string) => {
		setSorting([
			{
				id: 'date',
				desc: value === 'newest'
			}
		])
	}

	return (
		<>
			<div className="flex justify-end space-x-2.5">
				<Select onValueChange={handleSortChange} defaultValue={'newest'}>
					<SelectTrigger
						disabled={isLoading}
						className="md:w-[250px] rounded-[8px] text-light-grey w-full md:h-12 h-9 border-strokes"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="newest">Sort by Newest</SelectItem>
							<SelectItem value="oldest">Sort by Oldest</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
				<section className="relative w-full md:w-auto">
					<IoSearchOutline className="absolute left-3 top-1/2 text-xl -translate-y-1/2 text-gray-500" />
					<Input
						placeholder="Search"
						disabled={isLoading}
						value={(table.getColumn('name')?.getFilterValue() ?? '') as string}
						onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
						className="md:w-[380px] w-full rounded-[8px] pl-9 md:h-12 h-9 border-[1.4px] border-strokes"
					/>
				</section>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 xl:gap-10 md:gap-6 gap-3 ">
				{isLoading &&
					Array.from({ length: 5 }).map((_, index) => (
						<Skeleton
							key={index}
							className="sm:h-[282px] sm:w-[220px] w-[130px] h-[146px] rounded-[10px] shadow-lg"
						/>
					))}
				{table.getRowModel().rows?.length > 0 &&
					table.getRowModel().rows.map((row) => {
						const original = row.original as NftCardProps
						return <NftCard key={original.address} {...original} />
					})}
			</div>
			{!isLoading && table.getRowModel().rows?.length === 0 && (
				<p className="text-lg text-center">No Result</p>
			)}
		</>
	)
}
