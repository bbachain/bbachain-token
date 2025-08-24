/* eslint-disable @next/next/no-img-element */
'use client'

import { Loader2 } from 'lucide-react'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { AiOutlineQuestionCircle } from 'react-icons/ai'
import { IoSearchOutline } from 'react-icons/io5'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ExtendedMintInfo } from '@/staticData/tokens'

import { useGetAvailableTokens } from '../services'
import { TTokenProps } from '../types'

interface TokenListDialogProps {
	type: 'from' | 'to'
	isOpen: boolean
	setIsOpen: Dispatch<SetStateAction<boolean>>
	selectedFrom: TTokenProps
	selectedTo: TTokenProps
	setSelectedFrom: (token: TTokenProps) => void
	setSelectedTo: (token: TTokenProps) => void
}

const SelectTokenTips = {
	titleTip:
		'Find a token by searching for its name, symbol, or address. Results are filtered from our available token list.',
	notVerifiedTip: 'This token is not verified. Use caution',
	noPoolTip: 'No liquidity pool available for this token pair'
} as const

export default function TokenListDialog({
	type,
	isOpen,
	setIsOpen,
	selectedFrom,
	selectedTo,
	setSelectedFrom,
	setSelectedTo
}: TokenListDialogProps) {
	const [search, setSearch] = useState<string>('')
	const [debouncedSearch, setDebouncedSearch] = useState<string>('')

	// Debounce search to avoid excessive API calls
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search)
		}, 300)

		return () => clearTimeout(timer)
	}, [search])

	// Use the enhanced API hook with search
	const {
		data: tokensResponse,
		isLoading,
		error
	} = useGetAvailableTokens(debouncedSearch.trim() || undefined)

	const tokens: ExtendedMintInfo[] = tokensResponse ?? []
	const selectedToken = () => {
		switch (type) {
			case 'from':
				return selectedFrom
			case 'to':
				return selectedTo
		}
	}

	const onSelectToken = (token: TTokenProps) => {
		// Prevent selecting the same token for both from and to
		if (type === 'from' && selectedTo && token.address === selectedTo.address) {
			return
		}
		if (type === 'to' && selectedFrom && token.address === selectedFrom.address) {
			return
		}

		switch (type) {
			case 'from':
				return setSelectedFrom(token)
			case 'to':
				return setSelectedTo(token)
		}
	}

	// Filter out already selected token from the opposite side
	const filteredTokens = tokens.filter((token: ExtendedMintInfo) => {
		if (token.isNative) return false

		if (type === 'from' && selectedTo) {
			return token.address !== selectedTo.address
		}
		if (type === 'to' && selectedFrom) {
			return token.address !== selectedFrom.address
		}
		return true
	})

	const handleClearSearch = () => {
		setSearch('')
		setDebouncedSearch('')
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="md:max-w-[436px] max-w-[300px] rounded-[12px] shadow-[0_6px_14.1px_6px_rgba(0,0,0,0.25)]">
				<DialogHeader className="flex flex-row items-center space-x-0.5 w-full">
					<DialogTitle className="font-normal text-lg text-main-black">
						Select {type === 'from' ? 'Base' : 'Quote'} Token
					</DialogTitle>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="ghost" size="icon" className="w-4 h-4 !mt-0">
								<AiOutlineQuestionCircle />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p className="w-[240px]">{SelectTokenTips.titleTip}</p>
						</TooltipContent>
					</Tooltip>
				</DialogHeader>
				<div className="flex flex-col space-y-6">
					<section className="relative">
						<IoSearchOutline className="absolute left-3 top-1/2 text-sm -translate-y-1/2 text-gray-500" />
						<Input
							placeholder="Search by name, symbol, or address..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="!text-xs w-full rounded-[10px] pl-9 pr-8 h-9 border-[1.4px] border-[#989898] dark:border-[#C6C6C6]"
						/>
						{search && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleClearSearch}
								className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
							>
								×
							</Button>
						)}
					</section>

					{/* Token List */}
					<section className="flex flex-col h-full max-h-60 overflow-y-auto pt-4 space-y-2 border-t-2 border-light-grey">
						{isLoading && (
							<div className="flex flex-col items-center justify-center h-24 w-full space-y-2">
								<Loader2 className="animate-spin h-6 w-6 text-main-green" />
								<p className="text-sm text-gray-500">Loading tokens...</p>
							</div>
						)}

						{error && (
							<div className="flex flex-col items-center justify-center h-24 w-full space-y-2">
								<p className="text-sm text-red-500">Failed to load tokens</p>
								<p className="text-xs text-gray-500">Please try again</p>
							</div>
						)}

						{!isLoading && !error && filteredTokens.length === 0 && (
							<div className="flex flex-col items-center justify-center h-24 w-full space-y-2">
								<p className="text-sm text-gray-500">No tokens found</p>
								{search && (
									<p className="text-xs text-gray-400">Try searching for a different term</p>
								)}
							</div>
						)}

						{!isLoading && !error && filteredTokens.length > 0 && (
							<div className="space-y-1">
								{filteredTokens.map((token: TTokenProps) => {
									const isSelected = selectedToken()?.address === token.address
									const isDisabled =
										(type === 'from' && selectedTo?.address === token.address) ||
										(type === 'to' && selectedFrom?.address === token.address)

									return (
										<DialogClose key={token.address} asChild>
											<Button
												variant="ghost"
												type="button"
												onClick={() => onSelectToken(token)}
												disabled={isDisabled}
												className={cn(
													'w-full flex hover:bg-box !py-2.5 h-auto px-[7px] justify-between items-center rounded-lg transition-all',
													isSelected && 'bg-main-green/10 border border-main-green/20',
													isDisabled && 'opacity-50 cursor-not-allowed'
												)}
											>
												<div className="flex space-x-3 items-center">
													{/* Token Icon */}
													<div className="relative">
														<img
															src={token.logoURI || '/icon-placeholder.svg'}
															alt={`${token.symbol} icon`}
															width={32}
															height={32}
															className="rounded-full"
															onError={(e) => {
																const target = e.target as HTMLImageElement
																target.src = '/icon-placeholder.svg'
															}}
														/>
														{token.tags?.includes('verified') && (
															<div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
														)}
													</div>

													{/* Token Info */}
													<div className="flex flex-col space-y-0.5 items-start">
														<div className="flex items-center space-x-2">
															<h5 className="text-sm font-medium text-start text-main-black">
																{token.symbol}
															</h5>
															{token.tags?.includes('stablecoin') && (
																<span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
																	Stable
																</span>
															)}
															{token.tags?.includes('native') && (
																<span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
																	Native
																</span>
															)}
														</div>
														<p className="text-[10px] text-start text-light-grey max-w-[200px] truncate">
															{token.name}
														</p>
													</div>
												</div>

												{/* Selection Indicator */}
												{isSelected && <div className="w-2 h-2 bg-main-green rounded-full" />}
											</Button>
										</DialogClose>
									)
								})}
							</div>
						)}
					</section>

					{/* Footer Info */}
					<div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
						<p>
							{filteredTokens.length} token{filteredTokens.length !== 1 ? 's' : ''} available
						</p>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
