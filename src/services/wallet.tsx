'use client'

import { getAssociatedTokenAddress, NATIVE_MINT } from '@bbachain/spl-token'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { BBA_DALTON_UNIT, PublicKey } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import SERVICES_KEY from '@/constants/service'
import { TSuccessMessage } from '@/types'
import { TRequestAirdropPayload } from '@/types/wallet'

export function useGetBBABalance() {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()

	return useQuery<number>({
		queryKey: [SERVICES_KEY.WALLET.GET_BBA_BALANCE, ownerAddress?.toBase58()],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')
			const balance = await connection.getBalance(ownerAddress)
			return balance
		},
		enabled: !!ownerAddress
	})
}

export function useGetWBBABalance() {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<number>({
		queryKey: [SERVICES_KEY.WALLET.GET_WBBA_BALANCE, ownerAddress?.toBase58()],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			try {
				const mint = new PublicKey(NATIVE_MINT.toBase58())
				const ata = await getAssociatedTokenAddress(mint, ownerAddress)
				const balanceAmount = await connection.getTokenAccountBalance(ata)
				const balance = Number(balanceAmount.value.amount)
				return balance
			} catch (e) {
				console.error('WBBA balance fetch error:', e)
				return 0
			}
		}
	})
}

export function useGetTokenBalanceByMint({ mintAddress }: { mintAddress: string }) {}

export function useRequestAirdrop() {
	const { publicKey: address } = useWallet()
	const { connection } = useConnection()
	const client = useQueryClient()

	return useMutation<TSuccessMessage, Error, TRequestAirdropPayload>({
		mutationKey: [SERVICES_KEY.WALLET.REQUEST_AIRDROP, address?.toBase58()],
		mutationFn: async (payload) => {
			try {
				if (!address) throw new Error('No wallet connected')

				const amount = payload.amount ?? 1

				const [latestBlockhash, signature] = await Promise.all([
					connection.getLatestBlockhash(),
					connection.requestAirdrop(address, amount * BBA_DALTON_UNIT)
				])

				await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

				return { message: `Successfully sent ${amount} BBA to your wallet` }
			} catch (error) {
				console.error('Airdrop request failed:', error)
				throw error instanceof Error ? error : new Error(String(error))
			}
		},
		onSuccess: () => {
			client.invalidateQueries({
				queryKey: [SERVICES_KEY.WALLET.GET_BBA_BALANCE, address?.toBase58()]
			})
		}
	})
}
