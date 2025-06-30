'use client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'

import { MintInfo } from '../types'

export interface PoolListProps {
	id: string
	programId: string
	swapFee: number
	mintA: MintInfo
	mintB: MintInfo
	liquidity: number
	volume24h: number
	fees24h: number
	apr24h: number
}

export const PoolListColumns: ColumnDef<PoolListProps>[] = [
	{
		accessorKey: 'name',
		header: () => <h4 className="font-semibold ml-5 text-sm text-main-black">Pool</h4>,
		cell: ({ row }) => (
			<div className="flex items-center md:w-full w-[200px] space-x-3">
				<section className="flex space-x-0 relative items-center">
					<Image
						src={row.original.mintA.logoURI !== '' ? row.original.mintA.logoURI : '/icon-placeholder.svg'}
						width={38}
						height={38}
						className="rounded-full"
						alt={`${row.original.mintA.name} - from icon`}
					/>
					<Image
						className="-translate-x-2 rounded-full"
						src={row.original.mintB.logoURI !== '' ? row.original.mintB.logoURI : '/icon-placeholder.svg'}
						width={38}
						height={38}
						alt={`${row.original.mintB.name} - to icon`}
					/>
				</section>
				<section className="flex space-y-1 flex-col">
					<h4 className="text-sm text-main-black">
						{row.original.mintA.symbol}-{row.original.mintB.symbol}
					</h4>
					<p className="text-sm text-light-grey">{`${(row.original.swapFee * 100).toFixed(2)}%`}</p>
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
		),
		cell: ({ row }) => <p className="text-sm text-main-black">${row.original.liquidity.toLocaleString()}</p>
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
		),
		cell: ({ row }) => <p className="text-sm text-main-black">${row.original.volume24h.toLocaleString()}</p>
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
		),
		cell: ({ row }) => <p className="text-sm text-main-black">${row.original.fees24h.toFixed(2)}</p>
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
		),
		cell: ({ row }) => <p className="text-sm text-main-black">{row.original.apr24h.toFixed(2)}%</p>
	}
]
