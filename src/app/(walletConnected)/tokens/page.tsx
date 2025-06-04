'use client'

import { Loader2 } from 'lucide-react'

import { TokenListColumns, TokenListProps } from '@/features/tokens/components/Columns'
import { DataTable as TokenListTable } from '@/features/tokens/components/DataTable'
import { useGetTokens } from '@/features/tokens/services'
import { TGetTokenDataResponse } from '@/features/tokens/types'

function mapToTokenListPropsList(tokens: TGetTokenDataResponse[]): TokenListProps[] {
	return tokens.map((token) => {
		const fallback = `${token.mintAddress.slice(0, 6)}...`
		const { name, symbol, metadataOffChain } = token.metadata

		return {
			id: token.mintAddress,
			name: name ?? fallback,
			symbol: symbol ?? fallback,
			icon: metadataOffChain.data.image ? metadataOffChain.data.image : '/icon-placeholder.svg',
			supply: token.supply?.toLocaleString?.() ?? '0',
			date: token.createdAt
		}
	})
}

export default function Tokens() {
	const getTokenDataQuery = useGetTokens()
	const tokenData = getTokenDataQuery.data ? mapToTokenListPropsList(getTokenDataQuery.data.data) : []

	if (getTokenDataQuery.isPending) {
		return (
			<div className="h-full w-full md:mt-20 mt-40 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Please wait...</p>
			</div>
		)
	}

	return (
		<div className="xl:px-48 md:px-16 px-[15px] flex flex-col lg:space-y-14 md:space-y-9 space-y-3">
			<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">My Tokens</h1>
			<TokenListTable columns={TokenListColumns} data={tokenData} />
		</div>
	)
}
