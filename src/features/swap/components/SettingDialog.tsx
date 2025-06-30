'use client'

import { type Dispatch, type SetStateAction, useState, useEffect } from 'react'
import { AiOutlineQuestionCircle } from 'react-icons/ai'

import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import REGEX from '@/constants/regex'
import { cn } from '@/lib/utils'

interface SettingDialogProps {
	isOpen: boolean
	setIsOpen: Dispatch<SetStateAction<boolean>>
	maxSlippage: number
	setMaxSlippage: Dispatch<SetStateAction<number>>
	timeLimit: string
	setTimeLimit: Dispatch<SetStateAction<string>>
	isExpertMode: boolean
	setIsExpertMode: Dispatch<SetStateAction<boolean>>
	setIsExpertModeOpen: Dispatch<SetStateAction<boolean>>
}

const slippageOptions = [0.05, 0.1, 0.5]

const settingDialogTip = {
	maxSlippageTip: 'Find a token by searching for its name or symbol or by pasting its address below.',
	timeLimitTip: 'Transaction will revert if it is pending for longer than the indicated time.',
	expertModetip:
		'Turn this on to make trades with very high price impact or to set very high slippage tolerance. This can result in bad rates and loss of funds. Be cautious.'
} as const

export default function SettingDialog(props: SettingDialogProps) {
	const {
		isOpen,
		setIsOpen,
		maxSlippage,
		setMaxSlippage,
		timeLimit,
		setTimeLimit,
		isExpertMode,
		setIsExpertMode,
		setIsExpertModeOpen
	} = props

	const [customSlippageValue, setCustomSlippageValue] = useState<string>('')
	const isInvalidCustomSlippage =
		customSlippageValue !== '' && !REGEX.ZERO_POINT_ZERO_FIVE_TO_FIFTY_RANGE.test(customSlippageValue)

	useEffect(() => {
		if (!slippageOptions.includes(maxSlippage)) {
			setCustomSlippageValue(maxSlippage.toString())
		}
	}, [maxSlippage])

	useEffect(() => {
		if (!isOpen && isInvalidCustomSlippage) {
			setMaxSlippage(slippageOptions[0])
			setCustomSlippageValue('')
		}
	}, [isInvalidCustomSlippage, isOpen, setMaxSlippage])

	const onEnableExpertMode = () => {
		if (!isExpertMode) return setIsExpertModeOpen(true)
		setIsExpertMode(false)
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="md:max-w-[531px] rounded-[12px] shadow-[0_6px_14.1px_6px_rgba(0,0,0,0.25)] p-6 max-w-[310px]">
				<DialogHeader className="p-0">
					<DialogTitle className="font-normal text-lg text-main-black">Settings</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col md:space-y-8 space-y-3">
					<div className="flex flex-col space-y-3.5 py-2.5">
						<h4 className="text-sm">
							Max Slippage{' '}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" className="w-4 [&_svg]:size-3 h-4 !mt-1">
										<AiOutlineQuestionCircle />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="w-[198px]">{settingDialogTip.maxSlippageTip}</p>
								</TooltipContent>
							</Tooltip>
						</h4>
						<section className="relative flex justify-between">
							{slippageOptions.map((value, index) => (
								<Button
									key={index}
									onClick={() => {
										setMaxSlippage(value)
										setCustomSlippageValue('')
									}}
									className={cn(
										'w-[60px] h-[34px] hover:bg-accent text-main-black text-xs md:w-24 rounded-[10px] bg-box',
										value === maxSlippage && 'border-2 border-main-green'
									)}
								>
									{value}%
								</Button>
							))}
							<div
								className={cn(
									'w-[60px] h-[34px] flex justify-center items-center space-x-0 text-center !text-xs md:w-24 rounded-[10px] bg-box',
									!slippageOptions.includes(maxSlippage) && 'border-2 border-main-green'
								)}
							>
								<Input
									className="w-full text-center max-w-[45px] text-main-black !p-0 h-full remove-arrow-input !text-xs border-0 outline-none focus-visible:ring-0"
									type="number"
									placeholder="Custom"
									value={customSlippageValue}
									onChange={(e) => {
										const raw = e.target.value
										setCustomSlippageValue(raw)
										if (raw === '') {
											// fallback on empty input
											setMaxSlippage(slippageOptions[0])
										} else {
											setMaxSlippage(Number(raw))
										}
									}}
									onBlur={() => {
										if (customSlippageValue.trim() === '') {
											setMaxSlippage(slippageOptions[0])
										}
									}}
								/>
								<p className="text-main-black text-xs">%</p>
							</div>
							{isInvalidCustomSlippage && (
								<p className="text-xs text-error absolute top-10 left-0">Slippage must be between 0.05% and 50%</p>
							)}
						</section>
					</div>
					<div className="py-1 flex justify-between items-center">
						<h4 className="text-sm">
							Transaction time limit{' '}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" className="w-4 [&_svg]:size-3 h-4 !mt-1">
										<AiOutlineQuestionCircle />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="w-[198px]">{settingDialogTip.timeLimitTip}</p>
								</TooltipContent>
							</Tooltip>
						</h4>
						<section className="flex space-x-3 items-center">
							<Input
								className="w-[60px] h-[34px] flex justify-center items-center space-x-0 text-center rounded-[10px] bg-box !p-0 remove-arrow-input !text-xs border-0 outline-none focus-visible:ring-0"
								type="number"
								value={timeLimit}
								onChange={(e) => setTimeLimit(e.target.value)}
							/>
							<p className="text-main-black text-sm">Minutes</p>
						</section>
					</div>
					<div className="py-2 flex justify-between items-center">
						<h4 className="text-sm">
							Expert Mode{' '}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" className="w-4 [&_svg]:size-3 h-4 !mt-1">
										<AiOutlineQuestionCircle />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="w-[198px]">{settingDialogTip.timeLimitTip}</p>
								</TooltipContent>
							</Tooltip>
						</h4>
						<Switch
							classNames={{ root: 'h-7 w-14', thumb: 'h-6 w-8' }}
							checked={isExpertMode}
							onCheckedChange={onEnableExpertMode}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
