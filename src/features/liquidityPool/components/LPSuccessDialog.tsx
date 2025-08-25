import Image from 'next/image'
import Link from 'next/link'
import { Dispatch, SetStateAction } from 'react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose
} from '@/components/ui/dialog'

interface LPSuccessDialogProps {
	isOpen: boolean
	isNewTab?: boolean
	onOpenChange: Dispatch<SetStateAction<boolean>>
	title: string
	contents: string[]
	linkText: string
	link: string
}

export default function LPSuccessDialog({
	isOpen,
	isNewTab,
	onOpenChange,
	title,
	contents,
	linkText,
	link
}: LPSuccessDialogProps) {
	const LinkWrapper = isNewTab ? 'a' : Link
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex md:w-[400px] rounded-[12px] w-[290px] flex-col items-center text-center p-5">
				<DialogHeader>
					<DialogTitle></DialogTitle>
				</DialogHeader>
				<Image
					src="/success-parsed.svg"
					width={42}
					height={42}
					alt="success parsed"
					className="mt-3"
				/>
				<h4 className="text-center m-0 text-base text-main-black">{title}</h4>
				<ul className="list-disc list-inside p-3 bg-light-blue rounded-[8px]">
					{contents.map((content, index) => (
						<li key={index} className="text-xs text-start text-main-black">
							{content}
						</li>
					))}
				</ul>
				<DialogFooter className="flex flex-row items-center justify-between w-full">
					<LinkWrapper
						{...(isNewTab
							? { href: link, target: '_blank', rel: 'noopener noreferrer' }
							: { href: link })}
						className="text-main-blue hover:text-main-green text-start w-full underline text-sm"
					>
						{linkText}
					</LinkWrapper>
					<DialogClose asChild>
						<Button
							className="bg-main-green w-[75px] h-7 hover:bg-hover-green rounded-[30px] text-sm text-main-white"
							size="lg"
							type="button"
						>
							Close{' '}
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
