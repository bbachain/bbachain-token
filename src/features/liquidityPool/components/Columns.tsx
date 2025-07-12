'use client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, Eye, Star } from 'lucide-react'
import Image from 'next/image'

import { Badge } from '@/components/ui/badge'
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

// Helper function to format currency with better precision
const formatCurrency = (value: number): string => {
	if (value === 0) return '$0.00'
	if (value >= 1_000_000_000) {
		return `$${(value / 1_000_000_000).toFixed(2)}B`
	}
	if (value >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(2)}M`
	}
	if (value >= 1_000) {
		return `$${(value / 1_000).toFixed(2)}K`
	}
	if (value >= 1) {
		return `$${value.toFixed(2)}`
	}
	return `$${value.toFixed(4)}`
}

// Helper function to format large numbers
const formatNumber = (value: number): string => {
	if (value === 0) return '0'
	if (value >= 1_000_000_000) {
		return `${(value / 1_000_000_000).toFixed(2)}B`
	}
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(2)}M`
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(2)}K`
	}
	return value.toFixed(2)
}

// Helper function to format percentage with trend and enhanced styling
const formatPercentage = (
	value: number
): { formatted: string; trend: 'up' | 'down' | 'neutral'; color: string; bgColor: string } => {
	const formatted = `${value.toFixed(2)}%`
	let trend: 'up' | 'down' | 'neutral' = 'neutral'
	let color = 'text-gray-600 dark:text-gray-400'
	let bgColor = 'bg-gray-50 dark:bg-gray-800'

	if (value > 0) {
		trend = 'up'
		color = 'text-green-700 dark:text-green-400'
		bgColor = 'bg-green-50 dark:bg-green-900/20'
	} else if (value < 0) {
		trend = 'down'
		color = 'text-red-700 dark:text-red-400'
		bgColor = 'bg-red-50 dark:bg-red-900/20'
	}

	return { formatted, trend, color, bgColor }
}

// Helper function to get fee tier badge color
const getFeeTierColor = (fee: number): string => {
	if (fee <= 0.001) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
	if (fee <= 0.003) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
	if (fee <= 0.01) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
	return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}

// Helper function to get liquidity health indicator
const getLiquidityHealthColor = (liquidity: number): string => {
	if (liquidity >= 1_000_000) return 'text-green-600 dark:text-green-400'
	if (liquidity >= 100_000) return 'text-yellow-600 dark:text-yellow-400'
	if (liquidity >= 10_000) return 'text-orange-600 dark:text-orange-400'
	return 'text-red-600 dark:text-red-400'
}

function TokenPairDisplay({ mintA, mintB, swapFee }: { mintA: MintInfo; mintB: MintInfo; swapFee: number }) {
	// Debug logging to see what data we're receiving
	console.log('🔍 TokenPairDisplay received:', {
		mintA: { symbol: mintA.symbol, name: mintA.name, address: mintA.address },
		mintB: { symbol: mintB.symbol, name: mintB.name, address: mintB.address },
		swapFee
	})

	return (
		<div className="flex items-center w-full min-w-0">
			{/* Star icon for favorites (like Raydium) */}
			<div className="flex-shrink-0 mr-3">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
								<Star className="h-4 w-4 text-gray-400 hover:text-yellow-500 transition-colors" />
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Add to favorites</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			{/* Token pair icons */}
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex items-center flex-shrink-0 mr-3 relative">
							<div className="relative">
								<Image
									src={mintA.logoURI && mintA.logoURI !== '' ? mintA.logoURI : '/icon-placeholder.svg'}
									width={28}
									height={28}
									className="rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
									alt={`${mintA.name} icon`}
									onError={(e) => {
										e.currentTarget.src = '/icon-placeholder.svg'
									}}
								/>
							</div>
							<div className="relative -ml-2">
								<Image
									src={mintB.logoURI && mintB.logoURI !== '' ? mintB.logoURI : '/icon-placeholder.svg'}
									width={28}
									height={28}
									className="rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
									alt={`${mintB.name} icon`}
									onError={(e) => {
										e.currentTarget.src = '/icon-placeholder.svg'
									}}
								/>
							</div>
						</div>
					</TooltipTrigger>
					<TooltipContent side="right">
						<div className="space-y-1">
							<p className="font-semibold">
								{mintA.name} ({mintA.symbol})
							</p>
							<p className="font-semibold">
								{mintB.name} ({mintB.symbol})
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{mintA.address.slice(0, 6)}...{mintA.address.slice(-4)}
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{mintB.address.slice(0, 6)}...{mintB.address.slice(-4)}
							</p>
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			{/* Token pair name and fee - Raydium style */}
			<div className="flex flex-col min-w-0 flex-1">
				<div className="flex items-center gap-2 mb-1">
					<h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
						{mintA.symbol}-{mintB.symbol}
					</h4>
				</div>
				<div className="flex items-center gap-1">
					<span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', getFeeTierColor(swapFee))}>
						{(swapFee * 100).toFixed(2)}%
					</span>
				</div>
			</div>
		</div>
	)
}

function LiquidityDisplay({ value }: { value: number }) {
	const healthColor = getLiquidityHealthColor(value)

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex flex-col items-start">
						<div className={cn('text-sm font-semibold', healthColor)}>{formatCurrency(value)}</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">{formatNumber(value)} TVL</div>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<div className="space-y-1">
						<p className="font-semibold">Total Value Locked</p>
						<p className="text-sm">${value.toLocaleString()}</p>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							{value >= 1_000_000
								? 'High Liquidity'
								: value >= 100_000
									? 'Medium Liquidity'
									: value >= 10_000
										? 'Low Liquidity'
										: 'Very Low Liquidity'}
						</p>
					</div>
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
					<div className="flex flex-col items-start">
						<div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(value)}</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">24h volume</div>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<div className="space-y-1">
						<p className="font-semibold">24h Trading Volume</p>
						<p className="text-sm">${value.toLocaleString()}</p>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							{value >= 1_000_000
								? 'High Volume'
								: value >= 100_000
									? 'Medium Volume'
									: value >= 10_000
										? 'Low Volume'
										: 'Very Low Volume'}
						</p>
					</div>
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
					<div className="flex flex-col items-start">
						<div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(value)}</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">24h fees</div>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<div className="space-y-1">
						<p className="font-semibold">24h Fees Generated</p>
						<p className="text-sm">${value.toLocaleString()}</p>
						<p className="text-xs text-gray-500 dark:text-gray-400">Revenue generated from trading fees</p>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

function APRDisplay({ value }: { value: number }) {
	const { formatted, trend, color, bgColor } = formatPercentage(value)
	const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex flex-col items-start">
						<div className={cn('text-sm font-semibold flex items-center gap-1 px-2 py-1 rounded-md', color, bgColor)}>
							<TrendIcon className="h-3 w-3" />
							<span>{formatted}</span>
						</div>
						<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							{trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
						</div>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<div className="space-y-1">
						<p className="font-semibold">24h Annual Percentage Rate</p>
						<p className="text-sm">Based on current fees and liquidity</p>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							{value >= 20 ? 'High APR' : value >= 10 ? 'Medium APR' : value >= 5 ? 'Low APR' : 'Very Low APR'}
						</p>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

// Enhanced sortable header component
function SortableHeader({
	column,
	children,
	className = ''
}: {
	column: any
	children: React.ReactNode
	className?: string
}) {
	return (
		<Button
			variant="ghost"
			className={cn(
				'p-0 font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-main-green transition-colors',
				'justify-start h-auto',
				className
			)}
			onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
		>
			{children}
			<ArrowUpDown className="ml-2 h-4 w-4" />
		</Button>
	)
}

export const PoolListColumns: ColumnDef<PoolListProps>[] = [
	{
		id: 'pool',
		accessorKey: 'name',
		header: ({ column }) => (
			<div className="pl-6">
				<SortableHeader column={column}>Pool</SortableHeader>
			</div>
		),
		cell: ({ row }) => (
			<div className="pl-6">
				<TokenPairDisplay mintA={row.original.mintA} mintB={row.original.mintB} swapFee={row.original.swapFee} />
			</div>
		),
		enableSorting: true,
		sortingFn: (rowA, rowB) => {
			const a = `${rowA.original.mintA.symbol}-${rowA.original.mintB.symbol}`
			const b = `${rowB.original.mintA.symbol}-${rowB.original.mintB.symbol}`
			return a.localeCompare(b)
		},
		minSize: 200,
		size: 300
	},
	{
		id: 'liquidity',
		accessorKey: 'liquidity',
		header: ({ column }) => <SortableHeader column={column}>Liquidity</SortableHeader>,
		cell: ({ row }) => <LiquidityDisplay value={row.original.liquidity} />,
		sortingFn: (rowA, rowB) => rowA.original.liquidity - rowB.original.liquidity,
		enableSorting: true,
		minSize: 120,
		size: 150
	},
	{
		id: 'volume24h',
		accessorKey: 'volume24h',
		header: ({ column }) => <SortableHeader column={column}>Volume 24H</SortableHeader>,
		cell: ({ row }) => <VolumeDisplay value={row.original.volume24h} />,
		sortingFn: (rowA, rowB) => rowA.original.volume24h - rowB.original.volume24h,
		enableSorting: true,
		minSize: 120,
		size: 150
	},
	{
		id: 'fees24h',
		accessorKey: 'fees24h',
		header: ({ column }) => <SortableHeader column={column}>Fees 24H</SortableHeader>,
		cell: ({ row }) => <FeesDisplay value={row.original.fees24h} />,
		sortingFn: (rowA, rowB) => rowA.original.fees24h - rowB.original.fees24h,
		enableSorting: true,
		minSize: 120,
		size: 150
	},
	{
		id: 'apr24h',
		accessorKey: 'apr24h',
		header: ({ column }) => <SortableHeader column={column}>APR 24H</SortableHeader>,
		cell: ({ row }) => <APRDisplay value={row.original.apr24h} />,
		sortingFn: (rowA, rowB) => rowA.original.apr24h - rowB.original.apr24h,
		enableSorting: true,
		minSize: 120,
		size: 150
	}
]
