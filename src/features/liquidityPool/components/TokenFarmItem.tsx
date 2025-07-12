'use client'

import Image from 'next/image'
import { Dispatch, SetStateAction, useEffect } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { TTokenFarmProps } from '../types'

interface TokenFarmItemProps {
	selectedTokenFarm: TTokenFarmProps | undefined
	inputAmount: string
	setInputAmount: Dispatch<SetStateAction<string>>
}

export default function TokenFarmItem({ selectedTokenFarm, inputAmount, setInputAmount }: TokenFarmItemProps) {
	useEffect(() => {
		if (selectedTokenFarm) {
			setInputAmount('')
		}
	}, [selectedTokenFarm, setInputAmount])

	return (
		<div className="p-2.5 rounded-[10px] bg-box flex flex-col space-y-3.5">
			<div className="flex pl-2.5 justify-between">
				{selectedTokenFarm && (
					<section className="flex w-full space-x-2.5 items-center">
						<section className="flex space-x-0 relative items-center">
							<Image
								src={selectedTokenFarm.fromToken.logoURI || '/icon-placeholder.svg'}
								width={21}
								height={21}
								alt={`${selectedTokenFarm.fromToken.name} - from icon`}
							/>
							<Image
								src={selectedTokenFarm.toToken.logoURI || '/icon-placeholder.svg'}
								width={21}
								height={21}
								alt={`${selectedTokenFarm.toToken.name} - to icon`}
							/>
						</section>
						<h4 className="text-lg text-main-black">{`${selectedTokenFarm.fromToken.symbol}/${selectedTokenFarm.toToken.symbol}`}</h4>
					</section>
				)}
				<Input
					className={cn(
						'!text-xl remove-arrow-input p-0 text-main-black bg-transparent border-none text-right outline-none focus-visible:outline-none focus-visible:ring-0'
					)}
					placeholder="0.00"
					min={0}
					type="number"
					value={inputAmount}
					onChange={(e) => setInputAmount(e.target.value)}
				/>
			</div>
			<p className="text-dark-grey text-right text-xs">≈$ 0.00</p>
		</div>
	)
}
