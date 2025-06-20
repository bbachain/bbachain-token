'use client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'

import { TLPTokenProps } from '../types'

export interface PoolListProps {
	id: string
	name: string
	swapFee: string
	fromToken: TLPTokenProps
	toToken: TLPTokenProps
	liquidity: string
	volume24h: string
	fees24h: string
	apr24h: string
}

export const PoolListColumns: ColumnDef<PoolListProps>[] = [
	{
		accessorKey: 'name',
		header: () => <h4 className="font-semibold ml-5 text-sm text-main-black">Pool</h4>,
		cell: ({ row }) => (
			<div className="flex items-center md:w-full w-[200px] space-x-3">
				<section className="flex space-x-0 relative items-center">
					<Image
						src={row.original.fromToken.icon}
						width={38}
						height={38}
						alt={`${row.original.fromToken.name} - from icon`}
					/>
					<Image
						className="-translate-x-2"
						src={row.original.toToken.icon}
						width={38}
						height={38}
						alt={`${row.original.toToken.name} - to icon`}
					/>
				</section>
				<section className="flex space-y-1 flex-col">
					<h4 className="text-sm text-main-black">{row.original.name}</h4>
					<p className="text-sm text-light-grey">{row.original.swapFee}</p>
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
		accessorKey: 'volume24h',
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
		accessorKey: 'fees24h',
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
		accessorKey: 'apr24h',
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
