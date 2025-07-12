'use client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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

// Helper function to format currency
const formatCurrency = (value: number): string => {
	if (value >= 1_000_000_000) {
		return `$${(value / 1_000_000_000).toFixed(2)}B`
	}
	if (value >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(2)}M`
	}
	if (value >= 1_000) {
		return `$${(value / 1_000).toFixed(2)}K`
	}
	return `$${value.toFixed(2)}`
}

// Helper function to format percentage with trend
const formatPercentage = (value: number): { formatted: string; trend: 'up' | 'down' | 'neutral'; color: string } => {
	const formatted = `${value.toFixed(2)}%`
	let trend: 'up' | 'down' | 'neutral' = 'neutral'
	let color = 'text-gray-600 dark:text-gray-400'

	if (value > 0) {
		trend = 'up'
		color = 'text-green-600 dark:text-green-400'
	} else if (value < 0) {
		trend = 'down'
		color = 'text-red-600 dark:text-red-400'
	}

	return { formatted, trend, color }
}

function TokenPairDisplay({ mintA, mintB, swapFee }: { mintA: MintInfo; mintB: MintInfo; swapFee: number }) {
	return (
		<div className="flex items-center md:w-full w-[200px] space-x-3">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<section className="flex space-x-0 relative items-center">
							<div className="relative">
								<Image
									src={mintA.logoURI && mintA.logoURI !== '' ? mintA.logoURI : '/icon-placeholder.svg'}
									width={38}
									height={38}
									className="rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
									alt={`${mintA.name} icon`}
									onError={(e) => {
										e.currentTarget.src = '/icon-placeholder.svg'
									}}
								/>
							</div>
							<div className="relative -translate-x-2">
								<Image
									src={mintB.logoURI && mintB.logoURI !== '' ? mintB.logoURI : '/icon-placeholder.svg'}
									width={38}
									height={38}
									className="rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
									alt={`${mintB.name} icon`}
									onError={(e) => {
										e.currentTarget.src = '/icon-placeholder.svg'
									}}
								/>
							</div>
						</section>
					</TooltipTrigger>
					<TooltipContent>
						<div className="space-y-1">
							<p>
								<strong>{mintA.name}</strong> ({mintA.symbol})
							</p>
							<p>
								<strong>{mintB.name}</strong> ({mintB.symbol})
							</p>
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<section className="flex space-y-1 flex-col">
				<h4 className="text-sm font-medium text-main-black">
					{mintA.symbol}-{mintB.symbol}
				</h4>
				<div className="flex items-center space-x-1">
					<span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
						{(swapFee * 100).toFixed(2)}%
					</span>
				</div>
			</section>
		</div>
	)
}

function LiquidityDisplay({ value }: { value: number }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="text-sm text-main-black font-medium">{formatCurrency(value)}</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>Total Value Locked: ${value.toLocaleString()}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

function VolumeDisplay({ value }: { value: number }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="text-sm text-main-black font-medium">{formatCurrency(value)}</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>24h Trading Volume: ${value.toLocaleString()}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

function FeesDisplay({ value }: { value: number }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="text-sm text-main-black font-medium">{formatCurrency(value)}</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>24h Fees Generated: ${value.toLocaleString()}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

function APRDisplay({ value }: { value: number }) {
	const { formatted, trend, color } = formatPercentage(value)

	const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className={cn('text-sm font-medium flex items-center space-x-1', color)}>
						<TrendIcon className="h-3 w-3" />
						<span>{formatted}</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>24h Annual Percentage Rate from fees</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

export const PoolListColumns: ColumnDef<PoolListProps>[] = [
	{
		accessorKey: 'name',
		header: () => <h4 className="font-semibold ml-5 text-sm text-main-black">Pool</h4>,
		cell: ({ row }) => (
			<TokenPairDisplay mintA={row.original.mintA} mintB={row.original.mintB} swapFee={row.original.swapFee} />
		)
	},
	{
		accessorKey: 'liquidity',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black hover:text-main-green"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Liquidity
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => <LiquidityDisplay value={row.original.liquidity} />,
		sortingFn: (rowA, rowB) => rowA.original.liquidity - rowB.original.liquidity
	},
	{
		accessorKey: 'volume24h',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black hover:text-main-green"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Volume 24H
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => <VolumeDisplay value={row.original.volume24h} />,
		sortingFn: (rowA, rowB) => rowA.original.volume24h - rowB.original.volume24h
	},
	{
		accessorKey: 'fees24h',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black hover:text-main-green"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Fees 24H
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => <FeesDisplay value={row.original.fees24h} />,
		sortingFn: (rowA, rowB) => rowA.original.fees24h - rowB.original.fees24h
	},
	{
		accessorKey: 'apr24h',
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="p-0 font-semibold text-sm text-main-black hover:text-main-green"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				APR 24H
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => <APRDisplay value={row.original.apr24h} />,
		sortingFn: (rowA, rowB) => rowA.original.apr24h - rowB.original.apr24h
	}
]
