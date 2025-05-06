import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '../ui/button'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// All the data types here are tentatives, and could be changed anytime depends on requirements and integrations
type SelectCollectionProps = {
	selected: string | null
	setSelected: (item: string) => void
	collectionList: string[]
	onCreateNew?: () => void
}

export default function SelectCollection({
	selected,
	setSelected,
	collectionList,
	onCreateNew
}: SelectCollectionProps) {
	const [open, setOpen] = useState(false)

	const handleSelect = (item: string) => {
		setSelected(item)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className="w-full  md:h-[55px] h-9 text-left items-center justify-between whitespace-nowrap rounded-md border border-strokes bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
				>
					{selected ? selected : 'Select a collection'}
					<ChevronDown className="h-4 w-4 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="bg-background shadow-md  mt-2 px-2 w-[--radix-popover-trigger-width]">
				<ul className="flex flex-col space-y-2 w-full items-center justify-center">
					<li className="w-full">
						<Button type="button" className="w-full justify-start" variant="ghost" onClick={onCreateNew}>
							Create New Collection
						</Button>
					</li>
					{collectionList.map((list) => (
						<li key={list} className="w-full">
							<Button
								type="button"
								variant="ghost"
								className={cn(
									'hover:bg-hover-green justify-start h-8 w-full',
									list === selected ? 'bg-hover-green' : 'bg-transparent'
								)}
								onClick={() => handleSelect(list)}
							>
								{list}
							</Button>
						</li>
					))}
				</ul>
			</PopoverContent>
		</Popover>
	)
}
