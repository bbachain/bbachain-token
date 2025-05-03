'use client'

import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogClose
} from '@/components/ui/dialog'
import { useErrorDialog } from '@/lib/hooks'
import Image from 'next/image'
import { Button } from '../ui/button'

export default function ErrorDialog() {
	const { isErrorOpen, errorContent, closeErrorDialog } = useErrorDialog()

	return (
		<Dialog open={isErrorOpen} onOpenChange={closeErrorDialog}>
			<DialogContent className="md:w-[600px] w-[290px] md:max-h-[350px] rounded-[15px] max-h-[500px] h-full md:py-[35px] md:px-[42.5px] p-6 bg-main-white dark:bg-[#333333] flex flex-col space-y-2 items-center justify-center">
				<DialogHeader className="m-0 w-full items-center justify-center p-0">
					<Image src="/error_icon.svg" width={64} height={64} alt="Error icon" />
					<DialogTitle className="font-bold pt-4 text-center text-main-black text-xl">{errorContent.title}</DialogTitle>
					<DialogDescription className="text-[#949495] text-center font-light text-base">
						{errorContent.description}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button
							className="bg-main-green w-[230px] hover:bg-hover-green rounded-[30px] h-[54px] text-2xl text-main-white"
							size="lg"
							type="button"
						>
							Ok{' '}
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
