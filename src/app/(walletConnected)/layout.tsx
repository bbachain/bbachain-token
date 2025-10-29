'use client'

import { useWallet } from '@bbachain/wallet-adapter-react'
import { CiWallet } from 'react-icons/ci'

import ThemeImage from '@/components/common/ThemeImage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useWalletListDialog } from '@/stores/walletDialog'

export default function WalletConnectedLayout({ children }: { children: React.ReactNode }) {
	const { publicKey: address } = useWallet()
	const { openWalletList } = useWalletListDialog()

	if (!address)
		return (
			<div className="h-min-screen px-4 h-full w-full flex justify-center">
				<Card className="md:w-[564px] w-full h-full border-hover-green border-[1px] rounded-[16px] md:p-6 p-3 drop-shadow-lg">
					<CardHeader className="p-0">
						<CardTitle className="md:text-4xl text-xl text-center">Wallet Not Connected</CardTitle>
					</CardHeader>
					<CardContent className="px-0 py-8 flex flex-col space-y-2.5 justify-center items-center">
						<ThemeImage
							lightSrc={'/wallet-not-connected-light.svg'}
							darkSrc={'/wallet-not-connected-dark.svg'}
							quality={45}
							priority
							width={218}
							height={218}
							alt="wallet not connected logo"
						/>
						<p className="text-center text-sm text-main-black">
							Please connect your wallet to use the Quick Token <br /> Generator and access
							features.
						</p>
					</CardContent>
					<CardFooter className="p-0">
						<Button
							type="button"
							onClick={openWalletList}
							className="bg-main-green hover:bg-hover-green w-full h-12 text-main-white py-3 rounded-[45px] text-lg font-normal"
						>
							<CiWallet width={18} height={18} />
							Connect Wallet
						</Button>
					</CardFooter>
				</Card>
			</div>
		)

	return <div className="h-min-screen h-full w-full">{children}</div>
}
