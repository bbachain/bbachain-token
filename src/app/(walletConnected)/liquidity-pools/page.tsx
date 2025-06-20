'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PoolListColumns, type PoolListProps } from '@/features/liquidityPool/components/Columns'
import CreatePoolForm from '@/features/liquidityPool/components/CreatePoolForm'
import { DataTable as PoolListTable } from '@/features/liquidityPool/components/DataTable'
import { PoolStaticData } from '@/staticData/poolList'

export default function LiquidityPools() {
	return (
		<div className="xl:px-48 md:px-16 px-[15px] flex flex-col lg:space-y-14 md:space-y-9 space-y-3">
			<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">Liquidity Pools</h1>
			<Tabs defaultValue="all-pools">
				<TabsList className="bg-transparent mb-6 flex justify-center md:space-x-[18px] space-x-0">
					<TabsTrigger
						className="md:text-lg !bg-transparent text-base text-main-black font-medium pt-0 pb-2.5 px-2.5 hover:text-main-green  hover:border-main-green hover:border-b-2 focus-visible:border-b-2 focus-visibleborder-main-green data-[state=active]:text-main-green data-[state=active]:border-b-2  data-[state=active]:border-main-green data-[state=active]:shadow-none rounded-none"
						value="all-pools"
					>
						All Pools
					</TabsTrigger>
					<TabsTrigger
						className="md:text-lg !bg-transparent text-base text-main-black font-medium pt-0 pb-2.5 px-2.5 hover:text-main-green  hover:border-main-green hover:border-b-2 focus-visible:border-b-2 focus-visibleborder-main-green data-[state=active]:text-main-green data-[state=active]:border-b-2  data-[state=active]:border-main-green data-[state=active]:shadow-none rounded-none"
						value="my-pools"
					>
						My Pools
					</TabsTrigger>
					<TabsTrigger
						className="md:text-lg !bg-transparent text-base text-main-black font-medium pt-0 pb-2.5 px-2.5 hover:text-main-green  hover:border-main-green hover:border-b-2 focus-visible:border-b-2 focus-visibleborder-main-green data-[state=active]:text-main-green data-[state=active]:border-b-2  data-[state=active]:border-main-green data-[state=active]:shadow-none rounded-none"
						value="create-pool"
					>
						Create Pool
					</TabsTrigger>
				</TabsList>
				<TabsContent value="all-pools">
					<PoolListTable columns={PoolListColumns} data={PoolStaticData} />
				</TabsContent>
				<TabsContent value="my-pools">
					<PoolListTable columns={PoolListColumns} data={PoolStaticData} />
				</TabsContent>
				<TabsContent value="create-pool">
					<CreatePoolForm />
				</TabsContent>
			</Tabs>
		</div>
	)
}
