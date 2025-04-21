'use client'

import { useGetTokenMetadataQueries } from '@/components/account/account-data-access'
import { TokenListColumns } from '@/components/tokens/columns'
import { DataTable as TokenListTable } from '@/components/tokens/data-table'
import { Loader2 } from 'lucide-react'
import { useWallet } from '@bbachain/wallet-adapter-react'
import { useMemo } from 'react'
import { PublicKey } from '@bbachain/web3.js'
import { NoAdressAlert } from '@/components/common/alert'

function TokenComponent({ address }: { address: PublicKey }) {
	const tokenMetadataQueries = useGetTokenMetadataQueries({ address })

	if (tokenMetadataQueries.isPending) {
		return (
			<div className="h-full w-full  mt-60 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Please wait...</p>
			</div>
		)
	}

	return (
		<div className="xl:px-48 md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col lg:space-y-14 md:space-y-9 space-y-3">
			<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">My Tokens</h1>
			<TokenListTable columns={TokenListColumns} data={tokenMetadataQueries.data} />
		</div>
	)
}

export default function Tokens() {
	const { publicKey } = useWallet()

	const address = useMemo(() => {
		if (!publicKey) return
		return publicKey
	}, [publicKey])

	if (!address) {
		return (
			<div className="xl:px-48 md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col lg:space-y-14 md:space-y-9 space-y-3">
				<NoAdressAlert />
			</div>
		)
	}

	return <TokenComponent address={address} />
}
