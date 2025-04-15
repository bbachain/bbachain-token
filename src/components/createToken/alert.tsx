'use client'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useRequestAirdrop } from '../account/account-data-access'
import { PublicKey } from '@bbachain/web3.js'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { InfoIcon, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import toast from 'react-hot-toast'
import { WalletButton } from '../contexts/bbachain-provider'

export function NoBalanceAlert({ address }: { address: PublicKey }) {
	const { cluster } = useCluster()
	const requestAirdropMutation = useRequestAirdrop({ address: address })
	return (
		<Alert className="flex items-center justify-between dark:border-yellow-300 border-yellow-400">
			<InfoIcon />
			<AlertTitle className="ml-3 text-md">
				{' '}
				You are connected to <strong>{cluster.name}</strong> but your account is not found on this cluster.
			</AlertTitle>
			<Button
				className="bg-main-green hover:bg-hover-green"
				type="button"
				disabled={requestAirdropMutation.isPending}
				onClick={() =>
					requestAirdropMutation
						.mutateAsync(1)
						.then((value) => toast.success('Successfully sent 1 BBA to your account'))
						.catch((err) => console.log(err))
				}
			>
				{requestAirdropMutation.isPending && <Loader2 className="animate-spin" />}
				Request Airdrop
			</Button>
		</Alert>
	)
}

export function NoAdressAlert() {
	return (
		<Alert className="flex items-center justify-between dark:border-yellow-300 border-yellow-400">
			<InfoIcon />
			<AlertTitle className="ml-3 text-md">You need to connect to your wallet first before continue</AlertTitle>
			<WalletButton />
		</Alert>
	)
}
