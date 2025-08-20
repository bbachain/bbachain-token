import { getAssociatedTokenAddress, NATIVE_MINT } from '@bbachain/spl-token'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { PublicKey } from '@bbachain/web3.js'
import { useQuery } from '@tanstack/react-query'

import SERVICES_KEY from '@/constants/service'

import { TGetUserBalanceData } from '../swap/types'

export function useGetWBBABalance() {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetUserBalanceData>({
		queryKey: [SERVICES_KEY.WRAPPING.GET_WBBA_BALANCE],
		queryFn: async () => {
			if (!ownerAddress) throw new Error('No wallet connected')

			try {
				const mint = new PublicKey(NATIVE_MINT.toBase58())
				const ata = await getAssociatedTokenAddress(mint, ownerAddress)
				const balanceAmount = await connection.getTokenAccountBalance(ata)
				return { balance: Number(balanceAmount.value.amount) }
			} catch (e) {
				console.error('Balance fetch error:', e)
				return { balance: 0 }
			}
		}
	})
}

export function useWrapBBA() {
	
}


