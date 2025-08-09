import { Skeleton } from '@/components/ui/skeleton'

export default function PoolDetailSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<Skeleton className="h-10 w-10 rounded-full" />
					<Skeleton className="h-10 w-10 rounded-full -ml-4" />
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-5 w-12 rounded-md" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-9 w-20 rounded-full" />
					<Skeleton className="h-9 w-28 rounded-full" />
				</div>
			</div>

			{/* Pool stats card */}
			<div className="p-4 border rounded-lg space-y-4">
				<div className="flex justify-between">
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-5 w-24" />
				</div>
				<Skeleton className="h-2 w-full rounded" />
				<div className="mt-6 grid grid-cols-2 md:flex items-center justify-between gap-6">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="flex flex-col items-center md:items-start gap-1">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-6 w-24" />
						</div>
					))}
				</div>
				{/* Links */}
				<div className="flex flex-wrap gap-4">
					{[...Array(2)].map((_, i) => (
						<div key={i} className="flex items-center gap-2">
							<Skeleton className="h-6 w-6 rounded-full" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-4 rounded" />
						</div>
					))}
				</div>
			</div>

			{/* Transactions table */}
			<div>
				<Skeleton className="h-6 w-32 mb-4" />
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
			</div>
		</div>
	)
}
