'use client'

import { useWallet } from '@bbachain/wallet-adapter-react'
import { ColumnDef } from '@tanstack/react-table'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

import WalletNotConnectedCard from '@/components/common/WalletNotConnectedCard'
import { type NftCardProps } from '@/features/nfts/components/NFTCard'
import NFTList from '@/features/nfts/components/NFTList'
import { useGetNFTs } from '@/features/nfts/services'
import { type TGetNFTDataResponse } from '@/features/nfts/types'

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

function mapToNFTPropsList(tokens: TGetNFTDataResponse[]): NftCardProps[] {
	return tokens.map((token) => {
		const fallback = `${token.mintAddress.slice(0, 6)}...`

		return {
			address: token.mintAddress,
			name: token.metadata.name ?? fallback,
			image: token.metadata?.metadataOffChain.data.image ?? '/icon-placeholder.svg',
			collection: token.metadata.collectionProperties?.name ?? '-',
			date: token.createdAt
		}
	})
}

export default function NFTs() {
	const getNFTQuery = useGetNFTs()
	const nftMetadata = getNFTQuery.data ? mapToNFTPropsList(getNFTQuery.data.data) : []

	const { publicKey: ownerAddress } = useWallet()
	const isWalletConnected = Boolean(ownerAddress)

	useEffect(() => {
		if (getNFTQuery.isError && getNFTQuery.error) toast.error(getNFTQuery.error.message)
	}, [getNFTQuery.error, getNFTQuery.isError])

	return (
		<div className="xl:px-[90px] md:px-16 px-6 flex flex-col lg:space-y-14 md:space-y-9 space-y-3">
			<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">
				My NFTs
			</h1>
			{isWalletConnected && (
				<NFTList data={nftMetadata} columns={columns} isLoading={getNFTQuery.isPending} />
			)}
			{!isWalletConnected && <WalletNotConnectedCard />}
		</div>
	)
}
