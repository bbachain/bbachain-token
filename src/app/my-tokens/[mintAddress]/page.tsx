'use client'
import { useGetTokenDataDetail } from '@/components/account/account-data-access'
import {
	type TokenOverviewProps,
	type TokenOptionProps,
	type TokenMetadataProps,
	TokenOverview,
	TokenOptions,
	TokenMetadata
} from '@/components/tokens/token-detail'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PublicKey } from '@bbachain/web3.js'
import Link from 'next/link'
import { useMemo } from 'react'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'

export default function TokenDetail({ params }: { params: { mintAddress: string } }) {
	const mintKey = new PublicKey(params.mintAddress)
	const tokenMetadataDetail = useGetTokenDataDetail({ mintAddress: mintKey })

	const tokenOverviewData = useMemo(
		(): TokenOverviewProps => ({
			dataText: {
				token_name: tokenMetadataDetail.data?.name ?? '-',
				symbol: tokenMetadataDetail.data?.symbol ?? '-',
				total_supply: tokenMetadataDetail.data?.supply.toLocaleString() ?? '0',
				decimals: tokenMetadataDetail.data?.decimals ?? 0,
				network: 'BBA Network',
				mint_address: tokenMetadataDetail.data?.mintAddress ?? ''
			},
			dataImage: tokenMetadataDetail.data?.metadataURI?.image ?? '/icon-placeholder.svg'
		}),
		[
			tokenMetadataDetail.data?.decimals,
			tokenMetadataDetail.data?.metadataURI?.image,
			tokenMetadataDetail.data?.mintAddress,
			tokenMetadataDetail.data?.name,
			tokenMetadataDetail.data?.supply,
			tokenMetadataDetail.data?.symbol
		]
	)

	const tokenOptionsState = useMemo(
		(): TokenOptionProps => ({
			mint_authority: tokenMetadataDetail.data?.authoritiesState?.revoke_mint ?? false,
			freeze_authority: tokenMetadataDetail.data?.authoritiesState?.revoke_freeze ?? false,
			lock_metadata: tokenMetadataDetail.data?.authoritiesState?.immutable_metadata ?? false
		}),
		[
			tokenMetadataDetail.data?.authoritiesState?.immutable_metadata,
			tokenMetadataDetail.data?.authoritiesState?.revoke_freeze,
			tokenMetadataDetail.data?.authoritiesState?.revoke_mint
		]
	)

	const tokenMetaData = useMemo(
		(): TokenMetadataProps => ({
			description: tokenMetadataDetail.data?.metadataURI?.description ?? '-',
			ipfs_link: tokenMetadataDetail.data?.metadataLink ?? '-',
			metadata_status: tokenMetadataDetail.data?.authoritiesState.immutable_metadata ?? false
		}),
		[
			tokenMetadataDetail.data?.metadataLink,
			tokenMetadataDetail.data?.metadataURI?.description,
			tokenMetadataDetail.data?.authoritiesState.immutable_metadata
		]
	)

	if (tokenMetadataDetail.isLoading) {
		return (
			<div className="xl:px-[90px] md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col md:space-y-6 space-y-3">
				<section className="w-full flex justify-center">
					<Skeleton className="h-5 w-72 rounded-[16px]" />
				</section>
				<section className="flex xl:flex-row flex-col xl:space-x-6 md:space-y-6 space-y-3 xl:space-y-0 justify-between">
					<Skeleton className="w-full rounded-[16px] xl:h-72 h-48 " />
					<Skeleton className="w-full rounded-[16px] xl:h-72 h-48 " />
				</section>
				<Skeleton className="h-48 w-full rounded-[16px]" />
			</div>
		)
	}

	return (
		<div className="xl:px-[90px] md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col md:space-y-6 space-y-3">
			<section>
				<Link
					href="/my-tokens"
					className={cn(
						buttonVariants({ variant: 'ghost' }),
						'md:flex hidden w-32 mb-3 text-main-black items-center space-x-2.5 text-xl'
					)}
				>
					<HiOutlineArrowNarrowLeft />
					<h4>Tokens</h4>
				</Link>
				<h2 className="text-main-black text-center md:text-[32px] text-xl  font-medium">
					Manage Token -{' '}
					{tokenOverviewData.dataText.token_name !== '-'
						? tokenOverviewData.dataText.token_name
						: `${tokenOverviewData.dataText.mint_address.slice(0, 8)}...`}
				</h2>
			</section>
			<section className="flex xl:flex-row flex-col xl:space-x-6 md:space-y-6 space-y-3 xl:space-y-0 justify-between">
				<TokenOverview dataText={tokenOverviewData.dataText} dataImage={tokenOverviewData.dataImage} />
				<TokenOptions mintAddress={mintKey} state={tokenOptionsState} />
			</section>
			<TokenMetadata data={tokenMetaData} />
		</div>
	)
}
