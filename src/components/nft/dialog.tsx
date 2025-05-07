import { Dispatch } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '../ui/dialog'
import Image from 'next/image'
import { SetStateAction } from 'jotai'

type BasicDialog = {
	isOpen: boolean
	title: string
	description: string
}

export function LoadingDialog({ isOpen, title, description }: BasicDialog) {
	return (
		<Dialog open={isOpen}>
			<DialogContent className="flex flex-col items-center text-center px-11 py-9">
				<Image src="/parsing-loader.svg" width={64} height={64} alt="loader parser" className="animate-spin" />
				<h4 className="mt-8 text-center font-semibold text-lg mb-6">{title}</h4>
				<p className="text-lg text-[#989898]">
					{description}
				</p>
			</DialogContent>
		</Dialog>
	)
}

export function SuccessDialog({
	isOpen,
	title,
	description,
	onOpenChange
}: BasicDialog & {
	onOpenChange: Dispatch<SetStateAction<boolean>>
}) {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex flex-col items-center text-center px-11 py-9">
				<Image src="/success-parsed.svg" width={64} height={64} alt="success parsed" />
				<h4 className="mt-8 text-center font-semibold text-lg mb-6">{title}</h4>
				<p className="text-lg mb-12 text-[#989898]">{description}</p>
				<DialogFooter>
					<DialogClose asChild>
						<Button
							className="bg-main-green w-[230px] hover:bg-hover-green rounded-[30px] h-[48px] text-lg text-main-white"
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
