import { Skeleton } from '@/components/ui/skeleton'

export function PoolDetailTransactionSkeleton() {
	return (
		<div className="overflow-x-auto border rounded-lg">
			{/* Table header */}
			<div className="grid grid-cols-5 border-b bg-muted px-4 py-2">
				{['Time', 'Type', 'USD', 'USDC', 'Wallet'].map((col) => (
					<Skeleton key={col} className="h-4 w-16" />
				))}
			</div>
			{/* Table rows */}
			{[...Array(8)].map((_, row) => (
				<div key={row} className="grid grid-cols-5 px-4 py-3 border-b last:border-0">
					{[...Array(5)].map((_, col) => (
						<Skeleton key={col} className="h-4 w-16" />
					))}
				</div>
			))}
		</div>
	)
}

export function InitialPoolDetailSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<Skeleton className="h-7 w-7 rounded-full" />
					<Skeleton className="h-7 w-7 rounded-full -ml-4" />
					<Skeleton className="h-7 w-32" />
					<Skeleton className="h-7 w-12 rounded-md" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-10 w-28 rounded-full" />
					<Skeleton className="h-10 w-44 rounded-full" />
				</div>
			</div>
			{/* Pool stats card */}
			<div className="p-6 border rounded-lg ">
				<div className="space-y-3">
					<Skeleton className="h-5 w-28" />
					<div className="flex justify-between">
						<Skeleton className="h-5 w-16 rounded-sm" />
						<Skeleton className="h-5 w-16 rounded-sm" />
					</div>
					<Skeleton className="h-4 w-full rounded" />
				</div>
				<div className="mt-6 grid grid-cols-2 md:flex items-center justify-between gap-6">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="flex flex-col items-center md:items-start gap-1">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-6 w-28" />
						</div>
					))}
				</div>
				{/* Links */}
				<div className="mt-9 flex flex-wrap justify-between">
					{[...Array(2)].map((_, i) => (
						<div key={i} className="flex items-center gap-2">
							<Skeleton className="h-7 w-7 rounded-full" />
							<Skeleton className="h-6 w-14" />
							<Skeleton className="h-6 w-32" />
						</div>
					))}
				</div>
			</div>

			{/* Transactions table */}
			<div className="flex flex-col space-y-6">
				<Skeleton className="h-6 w-32" />
				<PoolDetailTransactionSkeleton />
			</div>
		</div>
	)
}
