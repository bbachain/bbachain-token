'use client'

import { InfoIcon, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { CiWallet } from 'react-icons/ci'

import { useCluster } from '@/components/providers/ClusterProvider'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { useRequestAirdrop } from '@/services/wallet'
import { useWalletListDialog } from '@/stores/walletDialog'

import { Button } from '../ui/button'

export function NoBalanceAlert() {
	const { cluster } = useCluster()
	const requestAirdropMutation = useRequestAirdrop()
	const onSubmitAirdrop = () => requestAirdropMutation.mutate({ amount: 1 })

	useEffect(() => {
		if (requestAirdropMutation.isSuccess && requestAirdropMutation.data)
			toast.success(requestAirdropMutation.data.message)
	}, [requestAirdropMutation.data, requestAirdropMutation.isSuccess])

	return (
		<Alert className="flex md:flex-row flex-col items-center justify-between dark:border-yellow-300 border-yellow-400">
			<InfoIcon />
			<AlertTitle className="ml-3 text-md">
				{' '}
				You are connected to <strong>{cluster.name}</strong> but your account is not found on this cluster.
			</AlertTitle>
			<Button
				className="bg-main-green hover:bg-hover-green"
				type="button"
				disabled={requestAirdropMutation.isPending}
				onClick={onSubmitAirdrop}
			>
				{requestAirdropMutation.isPending && <Loader2 className="animate-spin" />}
				Request Airdrop
			</Button>
		</Alert>
	)
}

export function NoAdressAlert() {
	const { openWalletList } = useWalletListDialog()
	return (
		<Alert className="flex md:flex-row flex-col items-center justify-between dark:border-yellow-300 border-yellow-400">
			<InfoIcon />
			<AlertTitle className="ml-3 text-md">You need to connect to your wallet first before continue</AlertTitle>
			<Button
				type="button"
				onClick={openWalletList}
				className="bg-main-green hover:bg-hover-green  w-[124px] text-main-white  px-2.5 py-2 rounded-[10px] text-sm font-normal"
			>
				<CiWallet width={18} height={18} />
				Connect
			</Button>
		</Alert>
	)
}
