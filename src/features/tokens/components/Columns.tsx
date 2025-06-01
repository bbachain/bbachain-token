'use client'
import { ColumnDef } from '@tanstack/react-table'
import Image from 'next/image'
import Moment from 'react-moment'

export type TokenListProps = {
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
		header: 'Token',
		cell: ({ row }) => (
			<div className="flex items-center md:w-full w-[184px] space-x-3">
				<Image src={row.original.icon} width={38} height={38} alt={`${row.original.name} - icon`} />
				<h4 className="text-sm">{row.getValue('name')}</h4>
			</div>
		)
	},
	{
		accessorKey: 'symbol',
		header: 'Symbol'
	},
	{
		accessorKey: 'supply',
		header: 'Token Supply'
	},
	{
		accessorKey: 'date',
		header: 'Created Date',
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
