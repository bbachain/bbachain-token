'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenListColumns, TokenListProps } from '@/features/tokens/components/Columns'
import { DataTable as TokenListTable } from '@/features/tokens/components/DataTable'
import { useGetTokens, useGetLPTokens } from '@/features/tokens/services'
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
	const [activeTab, setActiveTab] = useState('tokens')

	const getTokenDataQuery = useGetTokens()
	const getLPTokenDataQuery = useGetLPTokens()

	const tokenData = getTokenDataQuery.data ? mapToTokenListPropsList(getTokenDataQuery.data.data) : []
	const lpTokenData = getLPTokenDataQuery.data ? mapToTokenListPropsList(getLPTokenDataQuery.data.data) : []

	const isLoading = getTokenDataQuery.isPending || (activeTab === 'lp-tokens' && getLPTokenDataQuery.isPending)

	if (isLoading) {
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

			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="tokens">Regular Tokens</TabsTrigger>
					<TabsTrigger value="lp-tokens">LP Tokens ({lpTokenData.length})</TabsTrigger>
				</TabsList>

				<TabsContent value="tokens" className="space-y-4">
					<div className="text-sm text-gray-600">
						Your regular fungible tokens (excluding LP tokens from liquidity pools)
					</div>
					<TokenListTable columns={TokenListColumns} data={tokenData} />
				</TabsContent>

				<TabsContent value="lp-tokens" className="space-y-4">
					<div className="text-sm text-gray-600">Your Liquidity Pool (LP) tokens from providing liquidity to pools</div>
					{lpTokenData.length > 0 ? (
						<TokenListTable columns={TokenListColumns} data={lpTokenData} />
					) : (
						<div className="text-center py-8">
							<p className="text-gray-500">No LP tokens found</p>
							<p className="text-sm text-gray-400 mt-2">LP tokens are earned when you provide liquidity to pools</p>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}
