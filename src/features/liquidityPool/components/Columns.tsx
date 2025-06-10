'use client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'

export interface PoolListProps {
	id: string
	name: string
	percentage: string // Still unsure what kind of data is this, will be updated once Chathura reply
	fromIcon: string
	toIcon: string
	liquidity: string
	volume: string
	fees: string
	apr: string
}

export const PoolListColumns: ColumnDef<PoolListProps>[] = [
	{
		accessorKey: 'name',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 ml-5 font-semibold text-sm text-main-black"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Pool
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="flex items-center md:w-full w-[200px] space-x-3">
				<section className="flex space-x-0 relative items-center">
					<Image src={row.original.fromIcon} width={38} height={38} alt={`${row.original.name} - from icon`} />
					<Image
						className="-translate-x-2"
						src={row.original.toIcon}
						width={38}
						height={38}
						alt={`${row.original.name} - to icon`}
					/>
				</section>
				<section className="flex space-x-1 flex-col">
					<h4 className="text-sm text-main-black">{row.original.name}</h4>
					<p className="text-sm ml-0 text-light-grey">{row.original.percentage}</p>
				</section>
			</div>
		)
	},
	{
		accessorKey: 'liquidity',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Liquidity
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		)
	},
	{
		accessorKey: 'volume',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Volume 24H
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		)
	},
	{
		accessorKey: 'fees',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Fees 24H
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		)
	},
	{
		accessorKey: 'apr',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				APR 24H
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		)
	}
]
