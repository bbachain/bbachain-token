import { getAccount, getAssociatedTokenAddress } from '@bbachain/spl-token'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { PublicKey } from '@bbachain/web3.js'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'

import {
	TGetSwappableTokensResponse,
	TGetTokenPriceData,
	TGetUserBalanceData,
	TGetSwapTransactionPayload,
	TTokenProps,
	TGetSwapTransactionData
} from './types'

export const useGetSwappableTokens = () =>
	useQuery<TGetSwappableTokensResponse>({
		queryKey: [SERVICES_KEY.SWAP.GET_SWAPPABLE_TOKEN],
		queryFn: async () => {
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_MINT_LIST)
			const swappableTokensData = res.data.data.mintList as TTokenProps[]
			return { message: 'Successfully get swappable tokens data', data: swappableTokensData }
		}
	})

export const useGetUserBalanceByMint = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetUserBalanceData>({
		queryKey: [SERVICES_KEY.SWAP.GET_USER_BALANCE_BY_MINT, mintAddress],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')
			try {
				const mint = new PublicKey(mintAddress)
				console.log('mint ', mint)
				const ata = await getAssociatedTokenAddress(mint, ownerAddress)
				console.log('ata ', ata)
				const account = await getAccount(connection, ata)
				const balance = Number(account.amount)
				return { balance }
			} catch (err) {
				// Possibly means user has 0 balance / account doesn't exist
				return { balance: 0 }
			}
		},
		enabled: !!mintAddress && !!ownerAddress
	})
}

export const useGetTokenPrice = ({ mintAddress }: { mintAddress: string }) =>
	useQuery<TGetTokenPriceData>({
		queryKey: [SERVICES_KEY.SWAP.GET_TOKEN_PRICE, mintAddress],
		queryFn: async () => {
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_TOKEN_PRICE_BY_MINT, {
				params: {
					mints: mintAddress
				}
			})
			const usdRate = res.data.data[mintAddress] ?? 0
			return { usdRate }
		},
		enabled: !!mintAddress,
		refetchInterval: 60000
	})

export const useGetSwapTransactionByMint = ({
	swapType,
	inputMint,
	outputMint,
	amount,
	decimals,
	slippage
}: TGetSwapTransactionPayload) => {
	const amountPayload = Number(amount) * 10 ** decimals
	const slippageBps = slippage * 100
	return useQuery<TGetSwapTransactionData>({
		queryKey: [SERVICES_KEY.SWAP.GET_SWAP_TRANSACTION, swapType, inputMint, outputMint, amount, decimals, slippage],
		queryFn: async () => {
			const baseType = swapType === 'BaseIn' ? 'in' : 'out'
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_SWAP_TRANSACTION_BY_MINT + `/swap-base-${baseType}`, {
				params: {
					inputMint,
					outputMint,
					amount: amountPayload,
					slippageBps,
					txVersion: 'V0'
				}
			})
			return res.data
		},
		enabled: !!amount || amount === '0',
		refetchInterval: 60000
	})
}
