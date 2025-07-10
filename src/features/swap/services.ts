import { Buffer } from 'buffer'

import * as BufferLayout from '@bbachain/buffer-layout'
import { Layout } from '@bbachain/buffer-layout'
import { getAccount, getAssociatedTokenAddress, MintLayout } from '@bbachain/spl-token'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { PublicKey } from '@bbachain/web3.js'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'
import { getTokenAccounts2 } from '@/lib/tokenAccount'

import { TGetTokenDataResponse, TGetTokenResponse } from '../tokens/types'
import { getTokenData } from '../tokens/utils'

import {
	TGetSwappableTokensResponse,
	TGetTokenPriceData,
	TGetUserBalanceData,
	TGetSwapTransactionPayload,
	TTokenProps,
	TGetSwapTransactionData
} from './types'

const SWAP_PROGRAM_ID = new PublicKey('SwapD4hpSrcB23e4RGdXPBdNzgXoFGaTEa1ZwoouotX')

interface RawTokenSwap {
	version: number
	isInitialized: boolean
	bumpSeed: number
	poolTokenProgramId: PublicKey
	tokenAccountA: PublicKey
	tokenAccountB: PublicKey
	tokenPool: PublicKey
	mintA: PublicKey
	mintB: PublicKey
	feeAccount: PublicKey
	tradeFeeNumerator: bigint
	tradeFeeDenominator: bigint
	ownerTradeFeeNumerator: bigint
	ownerTradeFeeDenominator: bigint
	ownerWithdrawFeeNumerator: bigint
	ownerWithdrawFeeDenominator: bigint
	hostFeeNumerator: bigint
	hostFeeDenominator: bigint
	curveType: number
	curveParameters: Uint8Array
}

export const publicKey = (property: string = 'publicKey') => {
	return BufferLayout.blob(32, property)
}

/**
 * Layout for a 64bit unsigned value
 */
export const uint64 = (property: string = 'uint64') => {
	return BufferLayout.blob(8, property)
}

export const TokenSwapLayout = BufferLayout.struct<RawTokenSwap>([
	BufferLayout.u8('version'),
	BufferLayout.u8('isInitialized'),
	BufferLayout.u8('bumpSeed'),
	publicKey('tokenProgramId'),
	publicKey('tokenAccountA'),
	publicKey('tokenAccountB'),
	publicKey('tokenPool'),
	publicKey('mintA'),
	publicKey('mintB'),
	publicKey('feeAccount'),
	uint64('tradeFeeNumerator'),
	uint64('tradeFeeDenominator'),
	uint64('ownerTradeFeeNumerator'),
	uint64('ownerTradeFeeDenominator'),
	uint64('ownerWithdrawFeeNumerator'),
	uint64('ownerWithdrawFeeDenominator'),
	uint64('hostFeeNumerator'),
	uint64('hostFeeDenominator'),
	BufferLayout.u8('curveType'),
	BufferLayout.blob(32, 'curveParameters')
])

export const useGetSwappableTokens = () =>
	useQuery<TGetSwappableTokensResponse>({
		queryKey: [SERVICES_KEY.SWAP.GET_SWAPPABLE_TOKEN],
		queryFn: async () => {
			const res = await axios.get(ENDPOINTS.RAYDIUM.GET_MINT_LIST)
			const swappableTokensData = res.data.data.mintList as TTokenProps[]
			return { message: 'Successfully get swappable tokens data', data: swappableTokensData }
		}
	})

export const useGetSwappableTokens2 = () => {
	const { connection } = useConnection()
	return useQuery<TGetTokenResponse>({
		queryKey: [SERVICES_KEY.TOKEN.GET_TOKEN],
		queryFn: async () => {
			const tokenAccounts = await getTokenAccounts2(connection)
			const tokenData = await Promise.all(
				tokenAccounts.map(async (account) => {
					const mintKey = new PublicKey(account.mintAddress)
					return await getTokenData(connection, mintKey)
				})
			)

			const filteredTokenData = tokenData.filter((token): token is TGetTokenDataResponse => token !== null)

			return {
				message: `Successfully get token`,
				data: filteredTokenData
			}
		}
	})
}

export const useGetSwappableTokens3 = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress } = useWallet()
	return useQuery({
		queryKey: ['get-swappable-token-3'],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')
			const accountInfo = await connection.getAccountInfo(ownerAddress)
			console.log('account info, ', accountInfo!.data)
			if (accountInfo === null) {
				throw new Error('Failed to find account')
			}

			if (!accountInfo.owner.equals(SWAP_PROGRAM_ID)) {
				throw new Error(`Invalid owner: ${JSON.stringify(accountInfo.owner)}`)
			}

			const data = new Uint8Array(accountInfo.data.buffer, accountInfo.data.byteOffset, accountInfo.data.byteLength)
			return { data: TokenSwapLayout.decode(data) }
		}
	})
}

export const useGetUserBalanceByMint = ({ mintAddress }: { mintAddress: string }) => {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetUserBalanceData>({
		queryKey: [SERVICES_KEY.SWAP.GET_USER_BALANCE_BY_MINT, mintAddress],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			try {
				const mint = new PublicKey(mintAddress)
				const ata = await getAssociatedTokenAddress(mint, ownerAddress)
				const balanceAmount = await connection.getTokenAccountBalance(ata)

				return { balance: Number(balanceAmount.value.amount) }
			} catch (e) {
				console.error('Balance fetch error:', e)
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
