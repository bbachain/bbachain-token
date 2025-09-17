import { useWallet } from '@bbachain/wallet-adapter-react'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { CiWallet } from 'react-icons/ci'

import { copyToClipboard } from '@/components/common/CopyButton'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsMobile } from '@/hooks/isMobile'
import { getBBAFromDaltons } from '@/lib/token'
import { useGetBBABalance } from '@/services/wallet'
import { useWalletListDialog } from '@/stores/walletDialog'

function BalanceValue() {
	const getBalanceQuery = useGetBBABalance()
	const balance = getBalanceQuery.data ? getBBAFromDaltons(getBalanceQuery.data).toFixed(4) : '...'
	return (
		<div className="bg-light-green px-[5px] rounded-[6px]">
			<h4 className="text-[#333333] text-sm">{balance} BBA</h4>
		</div>
	)
}

export default function CustomWalletButton() {
	const { publicKey, wallet, connected, disconnect } = useWallet()
	const { openWalletList } = useWalletListDialog()
	const isMobile = useIsMobile()
	const [isCopied, setIsCopied] = useState<boolean>(false)

	const selectedWalletAddress = publicKey?.toBase58()
	const selectedWalletIcon = wallet?.adapter?.icon
	const selectedWalletName = wallet?.adapter?.name

	const handleCopyClick = async (value: string) => {
		await copyToClipboard(value)
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

	if (connected && selectedWalletAddress) {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						className="flex bg-box w-full md:px-2.5 px-1 hover:bg-box-2 space-x-2 rounded-[10px] items-center"
					>
						<BalanceValue />
						{selectedWalletIcon && !isMobile && (
							<Image
								src={selectedWalletIcon}
								width={18}
								height={18}
								alt={`${selectedWalletName} logo`}
							/>
						)}
						<h4 className="text-main-black text-sm">{`${selectedWalletAddress.slice(0, 6)}...`}</h4>
					</Button>
				</PopoverTrigger>

				<PopoverContent className="w-48 flex flex-col gap-1 p-2">
					<Button
						variant="ghost"
						className="justify-start text-sm"
						onClick={() => handleCopyClick(selectedWalletAddress)}
					>
						{isCopied ? 'Copied' : 'Copy Address'}
					</Button>
					<Button variant="ghost" className="justify-start text-sm" onClick={openWalletList}>
						Change Wallet
					</Button>
					<Button variant="ghost" className="justify-start text-sm" onClick={disconnect}>
						Disconnect
					</Button>
				</PopoverContent>
			</Popover>
		)
	}
	return (
		<Button
			type="button"
			onClick={openWalletList}
			className="bg-main-green hover:bg-hover-green  w-[124px] text-main-white  px-2.5 py-2 rounded-[10px] text-sm font-normal"
		>
			<CiWallet width={18} height={18} />
			Connect
		</Button>
	)
}
