'use client'

import { useGetNFTDataQueries } from '@/components/account/account-data-access'
import { NftCardProps } from '@/components/nft/nft-card'
import { GetNFTResponse } from '@/lib/types'
import { PublicKey } from '@bbachain/web3.js'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { useWallet } from '@bbachain/wallet-adapter-react'
import { NoAdressAlert } from '@/components/common/alert'

import NFTList from '@/components/nft/nft-list'

const columns: ColumnDef<NftCardProps>[] = [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: (info) => info.getValue(),
		filterFn: 'includesString'
	},
	{
		accessorKey: 'date',
		header: 'Date',
		cell: (info) => info.getValue()
	}
]

function mapToNFTPropsList(tokens: GetNFTResponse[]): NftCardProps[] {
	return tokens.map((token) => {
		const fallback = `${token.mintAddress.slice(0, 6)}...`

		return {
			address: token.mintAddress,
			name: token.name ?? fallback,
			image: token.metadataURI?.image ?? '/icon-placeholder.svg',
			collection: token.collection?.key.toBase58() ?? '-',
			date: token.date
		}
	})
}

function GetNFTsComponent({ address }: { address: PublicKey }) {
	const nftMetadataQueries = useGetNFTDataQueries({ address })
	const nftMetadata = mapToNFTPropsList(nftMetadataQueries.data)

	if (nftMetadataQueries.isPending) {
		return (
			<div className="h-full w-full mt-60 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Please wait...</p>
			</div>
		)
	}

	return (
		<div className="xl:px-[90px] md:px-16 px-6 md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col lg:space-y-14 md:space-y-9 space-y-3">
			<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">My NFTs</h1>
			<NFTList data={nftMetadata} columns={columns} />
		</div>
	)
}

export default function NFTs() {
	const { publicKey } = useWallet()

	const address = useMemo(() => {
		if (!publicKey) return
		return publicKey
	}, [publicKey])

	const [mounted, setMounted] = useState<boolean>(false)
	useEffect(() => setMounted(true), [])

	if (!mounted) {
		return (
			<div className="h-full w-full md:mt-60 mt-20 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Please wait...</p>
			</div>
		)
	}

	if (!address) {
		return (
			<div className="xl:px-48 md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col lg:space-y-14 md:space-y-9 space-y-3">
				<NoAdressAlert />
			</div>
		)
	}

	return <GetNFTsComponent address={address} />
}
