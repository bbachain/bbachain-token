import { AiOutlineInfoCircle } from 'react-icons/ai'
import { CopyTooltip } from '../common/copy'
import { Tooltip, TooltipContent, TooltipArrow, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import React, { useState } from 'react'
import { PiPencilSimpleLineLight } from 'react-icons/pi'
import { cn } from '@/lib/utils'

export function TooltipComponent({ content }: { content: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="ghost" size="icon">
						<AiOutlineInfoCircle className="text-[#989898]" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="w-full max-w-56 bg-white dark:bg-[#333333]">
					<p className="text-xs text-[#424242] dark:text-[#A7A7A7]">{content}</p>
					<TooltipArrow className="fill-white dark:fill-[#333333]" />
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

export function TokenDetailCard({
	title,
	className,
	children
}: {
	title: string
	className?: string
	children: React.ReactNode
}) {
	return (
		<div
			className={cn(
				'flex w-full rounded-[16px] border border-[#69E651] p-6 flex-col md:space-y-9 space-y-3',
				className
			)}
		>
			<h2 className="text-main-black lg:text-2xl md:text-xl text-base font-medium">{title}</h2>
			{children}
		</div>
	)
}

export function EditableMetadataInput({
	value,
	onChange
}: {
	value: string
	onChange: React.ChangeEventHandler<HTMLInputElement>
}) {
	const [mode, setMode] = useState<'view' | 'edit'>('view')
	const [tempValue, setTempValue] = useState(value)

	const handleBlur = () => {
		if (tempValue.trim() === '') {
			setTempValue(value) // Revert if empty
		} else {
			// Create a synthetic event to pass to onChange
			const syntheticEvent = {
				target: { value: tempValue }
			} as React.ChangeEvent<HTMLInputElement>
			onChange(syntheticEvent)
		}
		setMode('view')
	}

	const handleEditClick = () => {
		setTempValue(value) // Reset input value from prop on each edit
		setMode('edit')
	}

	if (mode === 'edit') {
		return (
			<Input
				className="w-60"
				autoFocus
				value={tempValue}
				onChange={(e) => setTempValue(e.target.value)}
				onBlur={handleBlur}
			/>
		)
	}

	return (
		<section className="flex space-x-1 items-center">
			<p className="md:text-base text-sm text-main-black">{value}</p>
			<Button type="button" onClick={handleEditClick} size="icon" variant="ghost">
				<PiPencilSimpleLineLight />
			</Button>
		</section>
	)
}

// This component was built to differ various value type like link, text, and editable
export function TokenValue({
	value,
	type,
	onChange
}: {
	value: string
	type: 'view text' | 'editable text' | 'link'
	onChange: React.ChangeEventHandler<HTMLInputElement>
}) {
	switch (type) {
		case 'link':
			return (
				<div className="flex items-center">
					<a
						className="text-main-green w-full md:max-w-[101px] max-w-[90px] !truncate hover:text-hover-green"
						href={value}
						target="_blank"
						rel="noopener noreferrer"
					>
						{value}
					</a>
					<CopyTooltip secretValue={value} />
				</div>
			)
		case 'editable text':
			return <EditableMetadataInput value={value} onChange={onChange} />
		default:
			return <p className="md:text-base text-sm text-main-black">{value}</p>
	}
}
