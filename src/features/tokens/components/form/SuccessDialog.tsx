'use client'

import Image from 'next/image'

import { useCluster } from '@/components/providers/ClusterProvider'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader
} from '@/components/ui/dialog'
import { type TCreateTokenDataResponse } from '@/features/tokens/types'

type BasicDialogProps = {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

type SuccessDialogProps = BasicDialogProps & {
	data: TCreateTokenDataResponse
}

export default function SuccessDialog(props: SuccessDialogProps) {
	const { isOpen, onOpenChange, data } = props
	const { getExplorerUrl } = useCluster()

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="md:w-[506px] w-[320px] md:max-h-[490px] max-h-[500px] h-full md:py-[77px] md:px-[35px] p-6 bg-main-white flex flex-col space-y-2 items-center justify-center">
				<DialogHeader className="m-0 w-full items-center justify-center p-0">
					<Image src={data.metadata.image} width={134} height={156} alt={data.metadata.name + ' - image'} />
					<DialogTitle className="font-bold text-main-green text-center text-[32px]">CONGRATULATIONS!</DialogTitle>
					<DialogDescription className="text-main-black text-center font-light text-base">
						Your token creation is complete. You can now explore and manage your newly generated token with ease.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<a href={getExplorerUrl(`tx/${data.mintAddress}`)} target="_blank" rel="noopener noreferrer">
						<Button
							className="bg-main-green w-[230px] hover:bg-hover-green rounded-[30px] h-[54px] text-2xl text-main-white"
							size="lg"
							type="button"
						>
							Show Token
						</Button>
					</a>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
