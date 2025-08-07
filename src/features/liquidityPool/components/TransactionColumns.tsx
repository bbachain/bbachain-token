'use client'
import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getExplorerAddress, shortenAddress } from '@/lib/utils'

import { MintInfo } from '../types'

type TypeValue = 'BUY' | 'SELL' | 'REMOVE' | 'ADD' | 'UNKNOWN'

type TypeDisplayProps = {
	baseTokenSymbol: string
	typeValue: TypeValue
}

type SelectTypePopoverProps = {
	value: TypeValue[] | undefined
	onChange: (value: TypeValue[] | undefined) => void
}

export interface TransactionListProps {
	baseAmountInUSD: number
	quoteAmountInUSD: number
	wallet: string
	time: string
	type: TypeValue
	baseAmount: number
	quoteAmount: number
	baseToken: MintInfo
	quoteToken: MintInfo
}

const typeOptions: TypeValue[] = ['BUY', 'SELL', 'ADD', 'REMOVE', 'UNKNOWN']

function TypeDisplay({ baseTokenSymbol, typeValue }: TypeDisplayProps) {
	const typeConfig: Record<TypeValue, { text: (token: string) => string; className: string }> = {
		BUY: {
			text: (token) => `Buy ${token}`,
			className: 'text-main-green'
		},
		SELL: {
			text: (token) => `Sell ${token}`,
			className: 'text-error'
		},
		ADD: {
			text: () => 'Add',
			className: 'text-main-green'
		},
		REMOVE: {
			text: () => 'Remove',
			className: 'text-error'
		},
		UNKNOWN: {
			text: () => 'Unknown',
			className: 'text-main-black'
		}
	}
	const config = typeConfig[typeValue] ?? typeConfig.UNKNOWN
	return <p className={config.className}>{config.text(baseTokenSymbol)}</p>
}

function SelectTypePopover({ value = [], onChange }: SelectTypePopoverProps) {
	const isSelected = (type: TypeValue) => value.includes(type)

	const toggleType = (type: TypeValue) => {
		const newValues = isSelected(type) ? value.filter((t) => t !== type) : [...value, type]
		onChange(newValues.length > 0 ? newValues : undefined)
	}

	const clearAll = () => onChange(undefined)

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" className="text-sm font-semibold">
					Type
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-48 p-2 space-y-2">
				<div className="flex items-center justify-between px-1">
					<p className="text-sm font-medium text-muted-foreground">Filter Types</p>
					{value?.length > 0 && (
						<Button variant="ghost" size="sm" className="text-xs text-red-500 p-0 h-auto" onClick={clearAll}>
							Clear
						</Button>
					)}
				</div>
				<div className="space-y-1">
					{typeOptions.map((type) => (
						<div key={type} className="flex items-center space-x-2">
							<Checkbox id={type} checked={isSelected(type)} onCheckedChange={() => toggleType(type)} />
							<label
								htmlFor={type}
								className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{type}
							</label>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}

export const getTransactionListColumns = (
	baseTokenSymbol: string,
	quoteTokenSymbol: string
): ColumnDef<TransactionListProps>[] => [
	{
		accessorKey: 'time',
		header: () => <h3 className="pl-4">Time</h3>
	},
	{
		accessorKey: 'type',
		header: ({ column }) => (
			<SelectTypePopover
				value={column.getFilterValue() as TypeValue[]}
				onChange={(val) => column.setFilterValue(val)}
			/>
		),
		cell: ({ row }) => <TypeDisplay baseTokenSymbol={row.original.baseToken.name} typeValue={row.getValue('type')} />,
		filterFn: (row, columnId, filterValue: TypeValue[]) => {
			if (!filterValue?.length) return true
			return filterValue.includes(row.getValue(columnId))
		},
		enableColumnFilter: true
	},
	{
		accessorKey: 'baseAmount',
		header: baseTokenSymbol,
		cell: ({ row }) => <p>${row.original.baseAmount.toLocaleString()}</p>
	},
	{
		accessorKey: 'quoteAmount',
		header: quoteTokenSymbol,
		cell: ({ row }) => <p>${row.original.quoteAmount.toLocaleString()}</p>
	},
	{
		accessorKey: 'baseAmountInUSD',
		header: `${baseTokenSymbol} in USD`,
		cell: ({ row }) => <p>${row.original.baseAmountInUSD.toLocaleString()}</p>
	},
	{
		accessorKey: 'quoteAmountInUSD',
		header: `${quoteTokenSymbol} in USD`,
		cell: ({ row }) => <p>${row.original.quoteAmountInUSD.toLocaleString()}</p>
	},
	{
		accessorKey: 'wallet',
		header: () => <h3 className="pr-6 text-right">Wallet</h3>,
		cell: ({ row }) => (
			<Link href={getExplorerAddress(row.original.wallet)} className="hover:text-main-green">
				{shortenAddress(row.original.wallet)}
			</Link>
		)
	}
]
