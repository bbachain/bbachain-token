'use client'
import { ColumnDef } from '@tanstack/react-table'
import { sentenceCase } from 'text-case'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TFormattedTransactionData } from '@/features/liquidityPool/types'
import { getExplorerAddress, shortenAddress } from '@/lib/utils'

type TypeValue = 'BUY' | 'SELL' | 'REMOVE' | 'ADD' | 'UNKNOWN'

type TypeDisplayProps = {
	baseTokenSymbol: string
	typeValue: TypeValue
}

type SelectTypePopoverProps = {
	value: TypeValue[] | undefined
	onChange: (value: TypeValue[] | undefined) => void
}

export type TransactionListProps = TFormattedTransactionData

const typeOptions: TypeValue[] = ['BUY', 'SELL', 'ADD', 'REMOVE', 'UNKNOWN']

function hasAccessorKey<T>(col: ColumnDef<T>): col is ColumnDef<T> & { accessorKey: string } {
	return 'accessorKey' in col
}

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
			<PopoverContent className="w-40 rounded-[4px] bg-white dark:bg-[#171717] p-2 space-y-2">
				<div className="flex justify-end px-1">
					{value?.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="text-xs text-red-500 p-0 h-auto"
							onClick={clearAll}
						>
							Clear
						</Button>
					)}
				</div>
				<div className="space-y-1">
					{typeOptions.map((type) => (
						<div key={type} className="flex items-center space-x-2">
							<Checkbox
								id={type}
								checked={isSelected(type)}
								onCheckedChange={() => toggleType(type)}
							/>
							<label htmlFor={type} className="text-sm font-normal text-main-black">
								{sentenceCase(type)}
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
): ColumnDef<TransactionListProps>[] => {
	const columns: ColumnDef<TransactionListProps>[] = [
		{
			accessorKey: 'time',
			header: () => <h3 className="pl-4">Time</h3>
		},
		{
			accessorKey: 'transactionType',
			header: ({ column }) => (
				<SelectTypePopover
					value={column.getFilterValue() as TypeValue[]}
					onChange={(val) => column.setFilterValue(val)}
				/>
			),
			cell: ({ row }) => (
				<TypeDisplay
					baseTokenSymbol={row.original.mintA.name}
					typeValue={row.getValue('transactionType')}
				/>
			),
			filterFn: (row, columnId, filterValue: TypeValue[]) => {
				if (!filterValue?.length) return true
				return filterValue.includes(row.getValue(columnId))
			},
			enableColumnFilter: true
		},
		{
			accessorKey: 'mintAAmount',
			header: baseTokenSymbol,
			cell: ({ row }) => <p>{row.original.mintAAmount.toLocaleString()}</p>
		},
		{
			accessorKey: 'mintBAmount',
			header: quoteTokenSymbol,
			cell: ({ row }) => <p>{row.original.mintBAmount.toLocaleString()}</p>
		}
	]

	if (baseTokenSymbol !== 'USDT') {
		const index = columns.findIndex((c) => hasAccessorKey(c) && c.accessorKey === 'mintBAmount')
		columns.splice(index + 1, 0, {
			accessorKey: 'mintAAmountPrice',
			header: `${baseTokenSymbol} in USDT`,
			cell: ({ row }) => <p>${row.original.mintAAmountPrice.toLocaleString()}</p>
		})
	}

	if (quoteTokenSymbol !== 'USDT') {
		const index = columns.findIndex(
			(c) => hasAccessorKey(c) && c.accessorKey === 'mintAAmountPrice'
		)
		const insertIndex = index >= 0 ? index + 1 : columns.length
		columns.splice(insertIndex, 0, {
			accessorKey: 'mintBAmountPrice',
			header: `${quoteTokenSymbol} in USDT`,
			cell: ({ row }) => <p>${row.original.mintBAmountPrice.toLocaleString()}</p>
		})
	}

	columns.push({
		accessorKey: 'ownerAddress',
		header: () => <h3 className="pr-6 text-right">Wallet</h3>,
		cell: ({ row }) => (
			<a
				className="hover:text-main-green"
				href={getExplorerAddress(row.original.ownerAddress)}
				target="_blank"
				rel="noopener noreferrer"
			>
				{shortenAddress(row.original.ownerAddress)}
			</a>
		)
	})

	return columns
}
