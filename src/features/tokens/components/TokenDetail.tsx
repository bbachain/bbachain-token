import Image from 'next/image'
import React, { useState } from 'react'
import { Toast } from 'react-hot-toast'
import { AiOutlineInfoCircle } from 'react-icons/ai'
import { IoMdClose } from 'react-icons/io'
import { PiPencilSimpleLineLight } from 'react-icons/pi'

import { CopyButton } from '@/components/layout/CopyButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipArrow, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

export function CustomToastOnBack({
	t,
	onSave,
	onClose
}: {
	t: Toast
	onSave: (t: Toast) => void
	onClose: (t: Toast) => void
}) {
	return (
		<div
			className={`${
				t.visible ? 'animate-enter' : 'animate-leave'
			} max-w-md w-full bg-white text-base shadow-lg rounded-lg pointer-events-auto flex items-center ring-1 ring-black ring-opacity-5`}
		>
			<div className="flex-1 w-0 p-4">
				<div className="flex space-x-2.5 items-center">
					<Image src="/warning-icon.svg" width={20} height={20} alt="Waring icon on leave" />
					<p className="text-[#333333]">You have unsaved changes</p>
				</div>
			</div>
			<div className="flex space-x-0 text-[#333333]">
				<Button onClick={() => onSave(t)} type="button" variant="ghost" className="underline">
					Save
				</Button>
				<Button type="button" variant="ghost" size="icon" onClick={() => onClose(t)}>
					<IoMdClose />
				</Button>
			</div>
		</div>
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
					<CopyButton secretValue={value} />
				</div>
			)
		case 'editable text':
			return <EditableMetadataInput value={value} onChange={onChange} />
		default:
			return <p className="md:text-base text-sm text-main-black">{value}</p>
	}
}
