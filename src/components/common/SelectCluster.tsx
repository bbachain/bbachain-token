import { useState } from 'react'

import { useCluster } from '@/components/providers/ClusterProvider'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export default function SelectCluster({ className }: { className?: string }) {
	const { clusters, setCluster, cluster } = useCluster()

	const [open, setOpen] = useState(false)

	const handleSelect = (item: typeof cluster) => {
		setCluster(item)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					className={cn(
						'flex bg-main-green w-full md:px-2.5 px-1 hover:bg-hover-green space-x-2 rounded-[10px] items-center',
						className
					)}
				>
					{cluster.name}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="bg-box mt-2 px-2 w-[100px]">
				<ul className="flex flex-col space-y-2 w-full items-center justify-center">
					{clusters.map((item) => (
						<li key={item.name} className="w-full">
							<Button
								type="button"
								variant="ghost"
								className={cn('hover:bg-hover-green h-8 w-full p-0', item.active ? 'bg-hover-green' : 'bg-transparent')}
								onClick={() => handleSelect(item)}
							>
								{item.name}
							</Button>
						</li>
					))}
				</ul>
			</PopoverContent>
		</Popover>
	)
}
