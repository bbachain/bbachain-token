import Image from 'next/image'
import Link from 'next/link'
import type { Dispatch, SetStateAction } from 'react'

import { useCluster } from '@/components/providers/ClusterProvider'
import { Button, buttonVariants } from '@/components/ui/button'
import {
	Dialog,
	DialogTitle,
	DialogDescription,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type BasicDialog = {
	isOpen: boolean
	title: string
	description: string
}

export function LoadingDialog({ isOpen, title, description }: BasicDialog) {
	return (
		<Dialog open={isOpen}>
			<DialogContent className="flex md:max-w-[600px] rounded-[15px] max-w-[286px] w-full flex-col space-y-0 items-center text-center px-11 py-9">
				<DialogHeader className="p-0">
					<DialogTitle></DialogTitle>
				</DialogHeader>
				<Image src="/parsing-loader.svg" width={64} height={64} alt="loader parser" className="animate-spin" />
				<h4 className="mt-8 text-center font-semibold text-lg mb-6">{title}</h4>
				<p className="text-lg text-[#989898]">{description}</p>
			</DialogContent>
		</Dialog>
	)
}

export function SuccessDialogNFT({
	isOpen,
	title,
	description,
	onOpenChange
}: BasicDialog & {
	onOpenChange: Dispatch<SetStateAction<boolean>>
}) {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex md:max-w-[600px] rounded-[15px] max-w-[286px] w-full flex-col space-y-0 items-center text-center px-11 py-9">
				<DialogHeader className="p-0">
					<DialogTitle></DialogTitle>
				</DialogHeader>
				<Image src="/success-parsed.svg" width={64} height={64} alt="success parsed" />
				<h4 className="mt-8 text-center font-semibold text-lg mb-6">{title}</h4>
				<p className="md:text-lg text-sm mb-12 text-light-grey">{description}</p>
				<DialogFooter className="p-0">
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

export function SuccessDialogCollection({
	isOpen,
	onOpenChange,
	message,
	data
}: {
	isOpen: boolean
	onOpenChange: Dispatch<SetStateAction<boolean>>
	message: string
	data: {
		image: string
		mintAddress: string
	}
}) {
	const { getExplorerUrl } = useCluster()

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex flex-col items-center text-center px-11 py-9">
				<DialogHeader>
					<DialogTitle></DialogTitle>
				</DialogHeader>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={data.image} width={64} height={64} className="rounded-[8px]" alt="collection detail image" />
				<h4 className="mt-8 text-center text-main-black font-semibold text-lg mb-6">{message}</h4>
				<a
					className="flex items-center text-main-green hover:text-hover-green "
					href={getExplorerUrl(`address/${data?.mintAddress}`)}
					target="_blank"
					rel="noopener noreferrer"
				>
					View on Explorer
				</a>
				<DialogFooter>
					<DialogClose asChild>
						<Link
							className={cn(
								buttonVariants({ size: 'lg' }),
								'bg-main-green md:w-[373px] w-full hover:bg-hover-green rounded-[30px] h-[48px] text-xl text-main-white'
							)}
							href={`/create-nft?collectionKey=${data.mintAddress}`}
						>
							Start Minting NFTs to this Collection{' '}
						</Link>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function ShowImageDialog({
	isOpen,
	title,
	description,
	image,
	onOpenChange
}: BasicDialog & { image: string; onOpenChange: Dispatch<SetStateAction<boolean>> }) {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex md:w-[662px]  w-[290px] p-0 md:h-[635px]  h-[460px] flex-col items-center text-center">
				<DialogHeader className="pt-4 px-6 w-full">
					<DialogTitle className="p-0 text-[22px] font-medium w-full text-start justify-start">{title}</DialogTitle>
					<DialogDescription className="p-0">{description}</DialogDescription>
				</DialogHeader>
				<div className="md:h-[500px] h-[300px] relative w-full">
					<Image src={image} fill style={{ objectFit: 'cover' }} alt="nft image" />
				</div>
				<DialogFooter className="flex !flex-row w-full px-4 justify-end">
					<DialogClose asChild>
						<Button
							className="bg-main-green w-[72px] hover:bg-hover-green rounded-[43px] h-[40px] text-sm text-main-white"
							size="sm"
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
