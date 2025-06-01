import { ChevronDown, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type SelectedItem = {
	mintAddress: string
	name: string
}

// All the data types here are tentatives, and could be changed anytime depends on requirements and integrations
type SelectCollectionProps = {
	selected: SelectedItem | null
	setSelected: (item: SelectedItem) => void
	collectionList: SelectedItem[]
	isDataPending: boolean
	onCreateNew?: () => void
}

export default function SelectCollection({
	selected,
	setSelected,
	collectionList,
	isDataPending,
	onCreateNew
}: SelectCollectionProps) {
	const [open, setOpen] = useState(false)

	const handleSelect = (item: SelectedItem) => {
		setSelected(item)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className={cn(
						'w-full font-normal md:h-[55px] h-9 text-left items-center justify-between whitespace-nowrap rounded-md border border-strokes bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
						selected ? 'text-main-black' : 'text-light-grey'
					)}
				>
					{selected ? selected.name : 'Select a collection'}
					<ChevronDown className="h-4 w-4 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="bg-background shadow-md  mt-2 px-2 w-[--radix-popover-trigger-width]">
				{isDataPending ? (
					<div className="flex justify-center items-center">
						<Loader2 className="animate-spin" />
					</div>
				) : (
					<ul className="flex flex-col space-y-2 w-full items-center justify-center">
						<li className="w-full">
							<Button type="button" className="w-full justify-start" variant="ghost" onClick={onCreateNew}>
								Create New Collection
							</Button>
						</li>
						{collectionList.map((list) => (
							<li key={list.mintAddress} className="w-full">
								<Button
									type="button"
									variant="ghost"
									className={cn(
										'hover:bg-box text-main-black justify-start h-8 w-full',
										list.mintAddress === selected?.mintAddress ? 'bg-box' : 'bg-transparent'
									)}
									onClick={() => handleSelect(list)}
								>
									{list.name}
								</Button>
							</li>
						))}
					</ul>
				)}
			</PopoverContent>
		</Popover>
	)
}
