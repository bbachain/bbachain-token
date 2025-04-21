'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useEffect } from 'react'
import { BiCopy } from 'react-icons/bi'
import { IoCheckmark } from 'react-icons/io5'
import { useState } from 'react'

export const copyToClipboard = async (text: string): Promise<void> => {
	try {
		await navigator.clipboard.writeText(text)
	} catch (error) {
		console.error('Failed to copy text: ', error)
	}
}

export function CopyTooltip({
	secretValue,
	iconSize = 'lg',
	className
}: {
	secretValue: string
	iconSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
	className?: string
}) {
	const [isCopied, setIsCopied] = useState<boolean>(false)

	const handleCopyClick = async () => {
		await copyToClipboard(secretValue)
		setIsCopied(true)
	}

	useEffect(() => {
		if (isCopied) {
			const timer = setTimeout(() => {
				setIsCopied(false)
			}, 2000)
			return () => clearTimeout(timer)
		}
	}, [isCopied])

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button type="button" onClick={handleCopyClick} className={className} size="icon" variant="ghost">
						{isCopied ? (
							<IoCheckmark className={`text-${iconSize} text-main-green`} />
						) : (
							<BiCopy className={`text-${iconSize}`} />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent key={isCopied ? 'copied' : 'not-copied'}>
					<p>{isCopied ? 'Copied!' : 'Copy to clipboard'}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
