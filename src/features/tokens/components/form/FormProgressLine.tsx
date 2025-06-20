'use client'

import { FaCheck } from 'react-icons/fa6'

import { cn } from '@/lib/utils'

export type CreateTokenStepProps = {
	id: number
	name: string
	fields?: string[]
}

type FormProgressLineProps = {
	steps: CreateTokenStepProps[]
	currentStep: number
}

export default function FormProgressLine({ steps, currentStep }: FormProgressLineProps) {
	return (
		<ol className="flex items-start justify-between w-full max-w-6xl mx-auto">
			{steps.map((step, index) => {
				const isCompleted = index < currentStep
				const isActive = index === currentStep
				const isLast = index === steps.length - 1

				return (
					<li key={index} className="relative flex flex-col space-y-1 w-full items-center">
						<div className="relative flex items-center justify-center w-full ">
							<span
								className={cn(
									'flex items-center z-10 justify-center w-5 h-5 bg-[#E0E0E7] lg:border-8 border-4 border-background rounded-full md:h-8 md:w-8 shrink-0',
									isCompleted && 'bg-main-green border-none',
									isActive && 'md:border-8 border-4 border-main-green bg-white'
								)}
							>
								{isCompleted && <FaCheck className="md:text-2xl text-sm" />}
							</span>
							<span
								className={cn(
									'absolute z-0 flex w-full left-1/2 h-1',
									isLast && 'hidden',
									isCompleted ? 'bg-main-green' : 'dark:bg-[#343434] bg-[#E9E9E9]'
								)}
							></span>
						</div>
						<h4
							className={cn(
								'md:text-lg text-[10px] whitespace-nowrap',
								isActive ? 'text-main-green' : 'text-[#989898]'
							)}
						>
							{step.name}
						</h4>
					</li>
				)
			})}
		</ol>
	)
}
