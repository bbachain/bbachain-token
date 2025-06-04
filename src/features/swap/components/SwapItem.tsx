'use client'

import { IoIosArrowDown } from 'react-icons/io'
import { capitalCase } from 'text-case'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { TSwapItem } from '../types'

interface SwapItemProps extends TSwapItem {
	setInputAmount: (inputAmount: string) => void
	setTokenProps: () => void
}

export default function SwapItem({ type, tokenProps, setTokenProps, inputAmount, setInputAmount }: SwapItemProps) {
	const onMaxClick = () => setInputAmount(tokenProps.balance.toString())
	return (
		<div className="bg-box rounded-[10px] p-2.5 flex flex-col space-y-1.5">
			<h5 className="text-xs text-main-black">{capitalCase(type)}</h5>
			<section className="flex justify-between items-center">
				<Button
					type="button"
					onClick={setTokenProps}
					className="flex bg-box-2 px-1.5 py-2.5 rounded-[8px] w-full max-w-28 hover:bg-accent justify-between items-center"
				>
					{/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
					<img src={tokenProps.icon} width={21} height={21} alt={tokenProps.name + ' icon'} />
					<h4 className="text-main-black !text-xs">{tokenProps.symbol}</h4>
					<IoIosArrowDown className="text-light-grey" />
				</Button>
				<div className="flex justify-end space-x-0.5">
					<Input
						className="!text-xl remove-arrow-input p-0 text-main-black bg-transparent border-none text-right outline-none focus-visible:outline-none focus-visible:ring-0"
						placeholder="0.00"
						type="number"
						value={inputAmount}
						onChange={(e) => setInputAmount(e.target.value)}
					/>
					{type === 'from' && (
						<Button
							variant="ghost"
							type="button"
							className="px-1 text-dark-grey text-xs font-normal"
							onClick={onMaxClick}
						>
							Max
						</Button>
					)}
				</div>
			</section>
			<section className="w-full flex justify-between">
				<p className="text-xs text-main-black">
					Balance: {tokenProps.balance} {tokenProps.symbol}
				</p>
				<p className="text-dark-grey text-xs">≈$ 0.00</p>
			</section>
		</div>
	)
}
