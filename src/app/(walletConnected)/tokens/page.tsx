'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenListColumns, TokenListProps } from '@/features/tokens/components/Columns'
import { DataTable as TokenListTable } from '@/features/tokens/components/DataTable'
import { useGetTokens, useGetLPTokens } from '@/features/tokens/services'
import { TGetTokenDataResponse } from '@/features/tokens/types'
import { cn } from '@/lib/utils'

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

	const tokenData = getTokenDataQuery.data
		? mapToTokenListPropsList(getTokenDataQuery.data.data)
		: []
	const lpTokenData = getLPTokenDataQuery.data
		? mapToTokenListPropsList(getLPTokenDataQuery.data.data)
		: []

	const isLoading =
		getTokenDataQuery.isPending || (activeTab === 'lp-tokens' && getLPTokenDataQuery.isPending)

	return (
		<div className="xl:px-48 md:px-16 px-4 flex flex-col w-full h-full items-center lg:space-y-14 md:space-y-9 space-y-3">
			<div className="flex w-full md:flex-row flex-col md:items-center justify-between gap-2.5">
				<div className="text-left w-full">
					<h1 className="md:text-5xl leading-tight text-xl font-bold text-main-black">My Tokens</h1>
					<p className="md:text-lg text-sm text-dark-grey font-normal">
						View and manage all tokens you&apos;ve created using Quick Token Generator.
					</p>
				</div>
				<Link
					href="/tokens/create"
					className={cn(
						buttonVariants({ size: 'lg' }),
						'bg-main-green md:w-44 w-32 hover:bg-hover-green text-white rounded-full md:px-6 md:py-3 px-3 py-1.5 flex items-center md:space-x-2 shadow-lg hover:shadow-xl transition-all duration-200 md:text-base text-sm'
					)}
				>
					<Plus className="size-5" />
					<span>Create Token</span>
				</Link>
			</div>
			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="flex w-full justify-center space-x-6 md:mb-10 mb-5 p-0 bg-transparent">
					<TabsTrigger
						value="tokens"
						className="relative p-2.5 md:max-w-36 bg-transparent border-none shadow-none font-medium text-xl text-main-black hover:text-main-green hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:h-[2px] hover:after:w-full hover:after:bg-main-green  data-[state=active]:shadow-none data-[state=active]:text-main-green data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-[2px] data-[state=active]:after:w-full data-[state=active]:after:bg-main-green"
					>
						Regular Tokens
					</TabsTrigger>
					<TabsTrigger
						value="lp-tokens"
						className="relative p-2.5 md:max-w-36 bg-transparent border-none shadow-none font-medium text-xl text-main-black hover:text-main-green hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:h-[2px] hover:after:w-full hover:after:bg-main-green  data-[state=active]:shadow-none data-[state=active]:text-main-green data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-[2px] data-[state=active]:after:w-full data-[state=active]:after:bg-main-green"
					>
						LP Tokens
					</TabsTrigger>
				</TabsList>

				<TabsContent value="tokens">
					<TokenListTable
						onRefresh={() => getTokenDataQuery.refetch()}
						isRefreshing={getTokenDataQuery.isRefetching}
						isLoading={isLoading}
						columns={TokenListColumns}
						data={tokenData}
					/>
				</TabsContent>
				<TabsContent value="lp-tokens">
					{lpTokenData.length > 0 ? (
						<TokenListTable
							withoutAction
							onRefresh={() => getLPTokenDataQuery.refetch()}
							isRefreshing={getLPTokenDataQuery.isRefetching}
							isLoading={isLoading}
							columns={TokenListColumns}
							data={lpTokenData}
						/>
					) : (
						<div className="text-center py-8">
							<p className="text-gray-500">No LP tokens found</p>
							<p className="text-sm text-gray-400 mt-2">
								LP tokens are earned when you provide liquidity to pools
							</p>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}
