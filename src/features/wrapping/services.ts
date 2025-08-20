import {
	createAssociatedTokenAccountInstruction,
	createCloseAccountInstruction,
	createSyncNativeInstruction,
	getAssociatedTokenAddress,
	NATIVE_MINT
} from '@bbachain/spl-token'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@bbachain/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import SERVICES_KEY from '@/constants/service'
import { bbaTodaltons } from '@/lib/bbaWrapping'

import { TGetUserBalanceData } from '../swap/types'

import { TWrapPayload, TWrapResponse } from './types'

export function useGetWBBABalance() {
	const { publicKey: ownerAddress } = useWallet()
	const { connection } = useConnection()
	return useQuery<TGetUserBalanceData>({
		queryKey: [SERVICES_KEY.WRAPPING.GET_WBBA_BALANCE, ownerAddress?.toBase58()],
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
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const { connection } = useConnection()
	const queryClient = useQueryClient()
	return useMutation<TWrapResponse, Error, TWrapPayload>({
		mutationKey: [SERVICES_KEY.WRAPPING.WRAP_BBA],
		mutationFn: async (payload) => {
			if (!ownerAddress) throw new Error('No wallet connected')

			try {
				const wrapTxInstructions: TransactionInstruction[] = []
				const bbaAmountDaltons = bbaTodaltons(payload.amount)
				const wbbaAccount = await getAssociatedTokenAddress(NATIVE_MINT, ownerAddress)
				const wbbaAccountInfo = await connection.getAccountInfo(wbbaAccount)

				if (!wbbaAccountInfo) {
					console.log('📝 Creating WBBA account and funding with BBA...')
					const createWBBAIx = createAssociatedTokenAccountInstruction(
						ownerAddress,
						wbbaAccount,
						ownerAddress,
						NATIVE_MINT
					)
					wrapTxInstructions.push(createWBBAIx)
				}

				const transferBBAIx = SystemProgram.transfer({
					fromPubkey: ownerAddress,
					toPubkey: wbbaAccount,
					daltons: bbaAmountDaltons
				})
				const syncBBAIx = createSyncNativeInstruction(wbbaAccount)
				wrapTxInstructions.push(transferBBAIx, syncBBAIx)

				const tx = new Transaction().add(...wrapTxInstructions)
				const signature = await sendTransaction(tx, connection)

				return {
					message: `Successfully wrapped ${payload.amount} BBA to ${payload.amount} WBBA`,
					signature
				}
			} catch (err: any) {
				console.error('❌ Wrap BBA failed:', err)
				throw new Error(err.message || 'Failed to wrap BBA')
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [SERVICES_KEY.WALLET.GET_BALANCE, ownerAddress?.toBase58()]
			})
			queryClient.invalidateQueries({
				queryKey: [SERVICES_KEY.WRAPPING.GET_WBBA_BALANCE, ownerAddress?.toBase58()]
			})
		}
	})
}

export function useUnwrapBBA() {
	const { publicKey: ownerAddress, sendTransaction } = useWallet()
	const { connection } = useConnection()

	return useMutation<TWrapResponse, Error, TWrapPayload>({
		mutationKey: [SERVICES_KEY.WRAPPING.UNWRAP_WBBA],
		mutationFn: async (payload) => {
			if (!ownerAddress) throw new Error('No wallet connected')

			try {
				const unwrapTxInstructions: TransactionInstruction[] = []

				// get WBBA ATA
				const wbbaAccount = await getAssociatedTokenAddress(NATIVE_MINT, ownerAddress)
				const balanceAmount = await connection.getTokenAccountBalance(wbbaAccount)

				const isUnwrapAll = payload.amount === Number(balanceAmount.value.amount)

				if (isUnwrapAll) {
					// 🔹 CASE 1: Unwrap all (close ATA)
					console.log('🔓 Closing WBBA account (unwrap all)...')
					const closeIx = createCloseAccountInstruction(wbbaAccount, ownerAddress, ownerAddress)
					unwrapTxInstructions.push(closeIx)
				} else {
					// 🔹 CASE 2: Unwrap partial
					const unwrapWBBADaltons = bbaTodaltons(payload.amount)

					console.log(`🔓 Unwrapping partial ${payload.amount} BBA...`)

					// transfer lamports from WBBA ATA back to wallet
					const transferIx = SystemProgram.transfer({
						fromPubkey: wbbaAccount,
						toPubkey: ownerAddress,
						daltons: unwrapWBBADaltons
					})

					// sync ATA balance
					const syncIx = createSyncNativeInstruction(wbbaAccount)

					unwrapTxInstructions.push(transferIx, syncIx)
				}

				const tx = new Transaction().add(...unwrapTxInstructions)

				const signature = await sendTransaction(tx, connection)

				return {
					message: `Successfully unwrapped ${payload.amount} WBBA to ${payload.amount} BBA`,
					signature
				}
			} catch (err: any) {
				console.error('❌ Unwrap BBA failed:', err)
				throw new Error(err.message || 'Failed to unwrap BBA')
			}
		}
	})
}
