'use client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import Image from 'next/image'
import Moment from 'react-moment'

import { Button } from '@/components/ui/button'

export interface TokenListProps {
	id: string
	name: string
	icon: string
	symbol: string
	supply: string
	date: number
}

export const TokenListColumns: ColumnDef<TokenListProps>[] = [
	{
		accessorKey: 'name',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black ml-[62px]"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Token
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="flex items-center md:w-full w-[184px] space-x-3">
				<Image src={row.original.icon} width={38} height={38} alt={`${row.original.name} - icon`} />
				<h4 className="text-sm">{row.getValue('name')}</h4>
			</div>
		)
	},
	{
		accessorKey: 'symbol',
		header: () => <h4 className="font-semibold text-sm text-main-black">Symbol</h4>
	},
	{
		accessorKey: 'supply',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Token Supply
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		)
	},
	{
		accessorKey: 'date',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Created Date
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => {
			const timestamp = row.getValue<number>('date')
			return (
				<Moment unix format="D MMM, YYYY">
					{timestamp}
				</Moment>
			)
		}
	}
]
