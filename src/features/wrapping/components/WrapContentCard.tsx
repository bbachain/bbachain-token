import { Dispatch, SetStateAction } from 'react'
import toast from 'react-hot-toast'
import { FaArrowDownLong, FaArrowRightLong } from 'react-icons/fa6'

import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/isMobile'

import WrapInputItem from './WrapInputItem'

interface WrapContentProps {
	base: 'BBA' | 'WBBA'
	target: 'BBA' | 'WBBA'
	baseBalance: number
	targetBalance: number
	inputAmount: string
	setInputAmount: Dispatch<SetStateAction<string>>
	isInvalid: boolean
	onAction: () => void
}

export default function WrapContent({
	base,
	target,
	baseBalance,
	targetBalance,
	inputAmount,
	setInputAmount,
	isInvalid,
	onAction
}: WrapContentProps) {
	const isMobile = useIsMobile()
	return (
		<div className="flex flex-col md:space-y-[18px] space-y-3">
			{/* Input Section */}
			<section className="w-full flex items-center md:flex-row md:space-x-6 flex-col md:space-y-0 space-y-1.5 justify-between">
				<WrapInputItem
					isBase
					type={base}
					balance={baseBalance}
					amount={inputAmount}
					setAmount={setInputAmount}
				/>
				<div className="rounded-full bg-box-3 border-2 border-main-green">
					<section className="inline-flex items-center justify-center md:w-12 w-8 md:h-12 h-8">
						{isMobile ? (
							<FaArrowDownLong className="text-dark-grey text-lg" />
						) : (
							<FaArrowRightLong className="text-dark-grey text-lg" />
						)}
					</section>
				</div>
				<WrapInputItem
					type={target}
					balance={targetBalance}
					amount={inputAmount}
					setAmount={setInputAmount}
				/>
			</section>

			{/* Rate Section */}
			<section className="flex justify-between items-center p-2.5 rounded-[10px] border border-strokes">
				<h4 className="text-dark-grey text-sm">Rate</h4>
				<section className="flex items-center space-x-1.5 text-main-black text-sm">
					<p>1 {base}</p>
					<span>=</span>
					<p>1 {target}</p>
				</section>
			</section>

			{/* Action Button */}
			<Button
				size="lg"
				className="rounded-[26px] bg-main-green hover:bg-hover-green h-12 w-full font-medium text-lg text-main-white"
				disabled={isInvalid}
				type="button"
				onClick={isInvalid ? () => toast.error('Invalid input') : onAction}
			>
				{base === 'BBA' ? 'Wrap' : 'Unwrap'} {base}{' '}
				<span>
					<FaArrowRightLong />
				</span>{' '}
				{target}
			</Button>
		</div>
	)
}
