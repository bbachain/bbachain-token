'use client'

import { useWallet } from '@bbachain/wallet-adapter-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose
} from '@/components/ui/dialog'
import { useWalletListDialog } from '@/stores/walletDialog'

export default function WalletListDialog() {
	const { wallets, select } = useWallet()
	const { isDialogOpen, closeWalletList } = useWalletListDialog()

	return (
		<Dialog open={isDialogOpen} onOpenChange={closeWalletList}>
			<DialogContent className="md:max-w-[506px] max-w-[320px] rounded-[8px] md:p-9 p-3 md:max-h-[491px] max-h-[330px]">
				<DialogHeader>
					<DialogTitle className="text-xl text-center font-semibold text-main-black">Select your Wallet</DialogTitle>
					<DialogDescription className="text-xs text-center text-main-black md:mt-[22px]">
						Start by connecting with one of the wallets below. Be sure to store your private keys or seed phrase
						securely.
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-3 md:mt-[22px] pb-3.5 border-b-2 border-b-light-grey justify-items-center md:gap-[42px] gap-4">
					{wallets.map((wallet) => (
						<DialogClose key={wallet.adapter.name} asChild>
							<Button
								onClick={() => {
									select(wallet.adapter.name)
								}}
								variant="ghost"
								className="flex flex-col items-center justify-end md:w-[105px] w-[54px] md:min-h-[85px] min-h-[76px] space-y-2"
							>
								<Image src={wallet.adapter.icon} width={42} height={42} alt={`${wallet.adapter.name} icon`} />
								<h5 className="text-xs text-main-black text-center">{wallet.adapter.name}</h5>
							</Button>
						</DialogClose>
					))}
				</div>
			</DialogContent>
		</Dialog>
	)
}
