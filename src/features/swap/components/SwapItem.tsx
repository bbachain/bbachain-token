/* eslint-disable @next/next/no-img-element */
'use client'

import { IoIosArrowDown } from 'react-icons/io'
import { capitalCase } from 'text-case'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TTradeableTokenProps } from '@/features/tokens/types'
import { cn } from '@/lib/utils'

interface SwapItemProps {
	type: 'from' | 'to'
	tokenProps: TTradeableTokenProps
	inputAmount: string
	balance: number
	price: number
	setInputAmount: (inputAmount: string) => void
	setTokenProps?: () => void
	noTitle?: boolean
	noCheckBalance?: boolean
	disable?: boolean
}

export default function SwapItem({
	type,
	noTitle = false,
	noCheckBalance = false,
	disable = false,
	tokenProps,
	inputAmount,
	balance,
	price,
	setTokenProps,
	setInputAmount
}: SwapItemProps) {
	const isBalanceNotEnough = !noCheckBalance && Number(inputAmount) > balance
	const isAmountPositive = Number(inputAmount) >= 0
	const isInValid = isBalanceNotEnough || !isAmountPositive

	const onMaxClick = () => setInputAmount(balance.toString())

	return (
		<div className="bg-box rounded-[10px] p-2.5 flex flex-col space-y-1.5">
			{!noTitle && <h5 className="text-xs text-main-black">{capitalCase(type)}</h5>}
			<section className="flex justify-between items-center">
				{setTokenProps ? (
					<Button
						type="button"
						onClick={setTokenProps}
						className="flex bg-box-2 px-1.5 py-2.5 rounded-[8px] w-auto max-w-36 hover:bg-accent justify-between items-center"
					>
						<img
							className="rounded-full"
							src={tokenProps.logoURI || '/icon-placeholder.svg'}
							width={21}
							height={21}
							alt={tokenProps.name + ' icon'}
						/>
						<h4 className="text-main-black !text-xs">{tokenProps.symbol}</h4>
						<IoIosArrowDown className="text-light-grey" />
					</Button>
				) : (
					<div className="flex space-x-2.5 items-center">
						{/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
						<img
							className="rounded-full"
							src={tokenProps.logoURI || '/icon-placeholder.svg'}
							width={21}
							height={21}
							alt={tokenProps.name + ' icon'}
						/>
						<h4 className="text-main-black !text-xs">{tokenProps.symbol}</h4>
					</div>
				)}
				<div className="flex relative justify-end space-x-0.5">
					<Input
						className={cn(
							'!text-xl remove-arrow-input p-0 text-main-black bg-transparent border-none text-right outline-none focus-visible:outline-none focus-visible:ring-0',
							isInValid && '!text-error'
						)}
						placeholder="0.00"
						min={0}
						disabled={disable}
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
					{isBalanceNotEnough && (
						<p className="text-error absolute right-0 top-7 text-[10px]">Balance is not enough</p>
					)}
					{!isAmountPositive && (
						<p className="text-error absolute right-0 top-7 text-[10px]">
							Amount can not be negative
						</p>
					)}
				</div>
			</section>
			<section className="w-full flex justify-between">
				<p className="text-xs text-main-black">
					Balance:{' '}
					{balance.toLocaleString(undefined, {
						minimumFractionDigits: 0,
						maximumFractionDigits: 6
					})}{' '}
					{tokenProps.symbol}
				</p>
				<p className="text-dark-grey text-xs">
					≈${' '}
					{price.toLocaleString(undefined, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 12
					})}
				</p>
			</section>
		</div>
	)
}
