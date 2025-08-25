import Image from 'next/image'
import { Dispatch, SetStateAction } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/isMobile'
import { cn } from '@/lib/utils'

interface WrapInputItemProps {
	isBase?: boolean
	disable?: boolean
	type: 'BBA' | 'WBBA'
	balance: number
	amount: string
	setAmount: Dispatch<SetStateAction<string>>
}

export default function WrapInputItem({
	isBase = false,
	disable,
	type,
	balance,
	amount,
	setAmount
}: WrapInputItemProps) {
	const isWBBA = type === 'WBBA'
	const isMobile = useIsMobile()
	const isBalanceNotEnough = isBase && Number(amount) > balance
	const isAmountPositive = Number(amount) >= 0
	const isInValid = isBalanceNotEnough || !isAmountPositive

	const onMaxClick = () =>
		setAmount(
			balance.toLocaleString(undefined, {
				minimumFractionDigits: 0,
				maximumFractionDigits: 6
			})
		)

	return (
		<div className="w-full rounded-[10px] md:px-4 px-3 py-6 bg-box-3 flex justify-between items-end">
			<section className="flex flex-col w-full space-y-2">
				<h4 className="md:text-base text-sm text-main-black">{isBase ? 'From' : 'To'}</h4>
				<section className="relative w-full">
					<section className="relative">
						<Input
							className={cn(
								'md:!text-xl !text-base  w-full h-full remove-arrow-input p-0 text-main-black bg-transparent border-none outline-none focus-visible:outline-none focus-visible:ring-0',
								isInValid && '!text-error',
								isBase && 'max-w-[87px]'
							)}
							placeholder="0.00"
							min={0}
							disabled={disable}
							type="number"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
						{isBase && (
							<Button
								variant="ghost"
								type="button"
								size="sm"
								className="px-1 absolute left-20 -top-1 text-dark-grey text-xs font-normal"
								disabled={isBalanceNotEnough}
								onClick={
									isBalanceNotEnough
										? () => {
												console.log('invalid')
											}
										: onMaxClick
								}
							>
								Max
							</Button>
						)}
					</section>
					{isBalanceNotEnough && (
						<p className="text-error  absolute left-0 top-7 text-[10px]">Balance is not enough</p>
					)}
					{!isAmountPositive && (
						<p className="text-error absolute left-0 top-7 text-[10px]">
							Amount can not be negative
						</p>
					)}
				</section>
			</section>
			<section className=" flex items-center md:space-x-2.5 space-x-1 bg-box-2 rounded-[8px] 2xl:w-1/5 md:w-2/4 w-1/3 md:px-2.5 md:py-2 px-1 py-1">
				<Image
					src={isWBBA ? '/WBBA_logo_wrapping.svg' : '/BBA_logo_wrapping.svg'}
					width={isMobile ? 16 : 21}
					height={isMobile ? 16 : 21}
					alt={isWBBA ? 'WBBA icon' : 'BBA icon'}
				/>
				<h5 className="lg:text-base md:text-sm text-xs text-main-black">{type}</h5>
			</section>
		</div>
	)
}
