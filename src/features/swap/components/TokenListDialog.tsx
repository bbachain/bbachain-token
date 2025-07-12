'use client'

import { Loader2 } from 'lucide-react'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { AiOutlineQuestionCircle } from 'react-icons/ai'
import { IoSearchOutline } from 'react-icons/io5'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { TTokenProps } from '../types'

interface TokenListDialogProps {
	data: TTokenProps[]
	isDataLoading: boolean
	type: 'from' | 'to'
	isOpen: boolean
	setIsOpen: Dispatch<SetStateAction<boolean>>
	selectedFrom: TTokenProps
	selectedTo: TTokenProps
	setSelectedFrom: (token: TTokenProps) => void
	setSelectedTo: (token: TTokenProps) => void
}

const SelectTokenTips = {
	titleTip: 'Find a token by searching for its name or symbol or by pasting its address below.',
	notVerifiedTip: 'This token is not verified. Use caution'
} as const

export default function TokenListDialog({
	data,
	isDataLoading,
	type,
	isOpen,
	setIsOpen,
	selectedFrom,
	selectedTo,
	setSelectedFrom,
	setSelectedTo
}: TokenListDialogProps) {
	const [search, setSearch] = useState<string>('')
	const [filteredData, setFilteredData] = useState<TTokenProps[]>(data)

	const selectedToken = () => {
		switch (type) {
			case 'from':
				return selectedFrom
			case 'to':
				return selectedTo
		}
	}

	const onSelectToken = (token: TTokenProps) => {
		switch (type) {
			case 'from':
				return setSelectedFrom(token)
			case 'to':
				return setSelectedTo(token)
		}
	}

	useEffect(() => {
		const query = search.toLowerCase()

		const filtered = data.filter(
			(token) =>
				token.name?.toLowerCase()?.includes(query) ||
				token.symbol?.toLowerCase()?.includes(query) ||
				token.address?.toLowerCase()?.includes(query)
		)

		setFilteredData(filtered)
	}, [search, data])

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="md:max-w-[436px] max-w-[300px] rounded-[12px] shadow-[0_6px_14.1px_6px_rgba(0,0,0,0.25)]">
				<DialogHeader className="flex flex-row items-center space-x-0.5 w-full">
					<DialogTitle className="font-normal text-lg text-main-black">Select Token</DialogTitle>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="ghost" size="icon" className="w-4 h-4 !mt-0">
								<AiOutlineQuestionCircle />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p className="w-[198px]">{SelectTokenTips.titleTip}</p>
						</TooltipContent>
					</Tooltip>
				</DialogHeader>
				<div className="flex flex-col space-y-6">
					<section className="relative">
						<IoSearchOutline className="absolute left-3 top-1/2 text-sm -translate-y-1/2 text-gray-500" />
						<Input
							placeholder="Search token name or paste address"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="!text-xs w-full rounded-[10px] pl-9 h-9 border-[1.4px] border-[#989898] dark:border-[#C6C6C6]"
						/>
					</section>
					<section className="flex flex-col h-full max-h-60 overflow-y-scroll pt-4 space-y-5 border-t-2 border-light-grey">
						{isDataLoading && (
							<div className="flex justify-center items-center h-full w-full">
								<Loader2 className="animate-spin" />
							</div>
						)}
						{!isDataLoading && filteredData.length === 0 && <p className="text-center text-sm">No data found</p>}
						{filteredData.length > 0 &&
							filteredData.map((token) => (
								<DialogClose key={token.address} asChild>
									<Button
										variant="ghost"
										type="button"
										onClick={() => onSelectToken(token)}
										className={cn(
											'w-full flex hover:bg-box !py-2.5 h-11 px-[7px] justify-between',
											selectedToken() === token && 'bg-box'
										)}
									>
										<div className="flex space-x-2 items-center">
											{/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
											<img src={token.logoURI || '/icon-placeholder.svg'} width={24} height={24} />
											<section className="flex flex-col space-y-1">
												<h5 className="text-sm text-start text-main-black">{token.symbol}</h5>
												<p className="text-[10px] text-start text-light-grey">{token.name}</p>
											</section>
										</div>
									</Button>
								</DialogClose>
							))}
					</section>
				</div>
			</DialogContent>
		</Dialog>
	)
}
