import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'

import { PoolData, TGetPoolDetailResponse, TGetPoolsResponse } from './types'

export const useGetPools = () =>
	useQuery<TGetPoolsResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_POOLS],
		queryFn: async () => {
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_POOLS_LIST, {
				params: {
					poolType: 'standard',
					poolSortField: 'default',
					sortType: 'desc',
					pageSize: 100,
					page: 1
				}
			})
			const poolsData = res.data.data.data as PoolData[]
			return { message: 'Successfully get pools data', data: poolsData }
		}
	})

export const useGetPoolById = ({ poolId }: { poolId: string }) =>
	useQuery<TGetPoolDetailResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_POOL_BY_ID, poolId],
		queryFn: async () => {
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_POOL_BY_ID, {
				params: {
					ids: poolId
				}
			})
			const poolData = res.data.data[0] as PoolData
			return { message: `Successfully get pool data with id ${poolId}`, data: poolData }
		}
	})
