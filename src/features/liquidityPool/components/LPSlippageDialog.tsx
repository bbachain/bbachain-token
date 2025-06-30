'use client'

import { Dispatch, SetStateAction, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const slippageOptions = [1, 2.5, 3.5]

interface LPSlippageDialog {
	isOpen: boolean
	setIsOpen: Dispatch<SetStateAction<boolean>>
	maxSlippage: number
	setMaxSlippage: Dispatch<SetStateAction<number>>
}

export default function LPSlippageDialog({ isOpen, setIsOpen, maxSlippage, setMaxSlippage }: LPSlippageDialog) {
	const [slippageValue, setSlippageValue] = useState<number>(maxSlippage)
	const [customValue, setCustomValue] = useState<string>('')

	useEffect(() => {
		if (!slippageOptions.includes(maxSlippage)) {
			setCustomValue(maxSlippage.toString())
		}
		setSlippageValue(maxSlippage)
	}, [maxSlippage])

	const onSave = () => {
		setMaxSlippage(slippageValue)
		setIsOpen(false)
	}

	const isCustom = !slippageOptions.includes(slippageValue)

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="md:max-w-[531px] rounded-[12px] shadow-[0_6px_14.1px_6px_rgba(0,0,0,0.25)] p-6 max-w-[310px]">
				<DialogHeader className="p-0">
					<DialogTitle className="font-normal text-lg text-main-black">Liquidity slippage tolerance</DialogTitle>
				</DialogHeader>
				<section className="flex justify-between gap-2">
					{slippageOptions.map((value, index) => (
						<Button
							key={index}
							onClick={() => {
								setSlippageValue(value)
								setCustomValue('')
							}}
							className={cn(
								'w-[60px] h-[34px] hover:bg-accent text-main-black text-xs md:w-24 rounded-[10px] bg-box',
								value === slippageValue && 'border-2 border-main-green'
							)}
						>
							{value}
						</Button>
					))}
					<div
						className={cn(
							'w-[60px] h-[34px] flex justify-center items-center space-x-0 text-center !text-xs md:w-24 rounded-[10px] bg-box',
							isCustom && 'border-2 border-main-green'
						)}
					>
						<Input
							className="w-full max-w-[45px] text-main-black text-center !p-0 h-full remove-arrow-input !text-xs border-0 outline-none focus-visible:ring-0"
							type="number"
							placeholder="Custom"
							value={customValue}
							onChange={(e) => {
								const raw = e.target.value
								setCustomValue(raw)
								setSlippageValue(Number(raw))
							}}
							onBlur={() => {
								if (customValue.trim() === '') {
									// fallback to default slippage
									setSlippageValue(slippageOptions[0])
									setCustomValue('')
								}
							}}
						/>
						<p className="text-main-black text-xs">%</p>
					</div>
				</section>
				<DialogFooter>
					<Button
						type="button"
						onClick={onSave}
						className="rounded-[48px] h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green"
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
