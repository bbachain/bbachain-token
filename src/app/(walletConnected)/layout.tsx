'use client'

import { useWallet } from '@bbachain/wallet-adapter-react'
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

import { NoAdressAlert } from '@/components/layout/Alert'

export default function WalletConnectedLayout({ children }: { children: React.ReactNode }) {
	const { publicKey: address } = useWallet()
	const [mounted, setMounted] = useState<boolean>(false)
	useEffect(() => setMounted(true), [])

	if (!mounted) {
		return (
			<div className="h-full w-full mt-60 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Please wait...</p>
			</div>
		)
	}

	if (!address)
		return (
			<div className="md:mt-40 mt-20 md:mb-20 mb-5 px-5">
				<NoAdressAlert />
			</div>
		)

	return <div className="md:mt-40 mt-20 md:mb-20 mb-5">{children}</div>
}
