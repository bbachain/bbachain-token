import { struct, u8, blob, Layout } from '@bbachain/buffer-layout'
import {
	getOrCreateAssociatedTokenAccount,
	createMint,
	TOKEN_PROGRAM_ID,
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	createInitializeMintInstruction
} from '@bbachain/spl-token'
import { TokenSwap, CurveType, createInitializeInstruction } from '@bbachain/spl-token-swap'
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import BN from 'bn.js'

import ENDPOINTS from '@/constants/endpoint'
import SERVICES_KEY from '@/constants/service'

import { getAllPoolsFromOnchain, OnchainPoolData } from './onchain'
import { PoolData, TCreatePoolPayload, TCreatePoolResponse, TGetPoolDetailResponse, TGetPoolsResponse } from './types'

const TOKEN_SWAP_PROGRAM_ID = new PublicKey('SwapD4hpSrcB23e4RGdXPBdNzgXoFGaTEa1ZwoouotX')

// Legacy API-based pool fetching (deprecated)
export const useGetPoolsFromAPI = () =>
	useQuery<TGetPoolsResponse>({
		queryKey: [SERVICES_KEY.POOL.GET_POOLS + '_api'],
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
		},
		enabled: false // Disabled by default
	})

// New onchain-based pool fetching
export const useGetPools = () => {
	const { connection } = useConnection()

	return useQuery<{ message: string; data: OnchainPoolData[] }>({
		queryKey: [SERVICES_KEY.POOL.GET_POOLS, connection.rpcEndpoint],
		queryFn: async () => {
			const pools = await getAllPoolsFromOnchain(connection)
			return {
				message: `Successfully fetched ${pools.length} pools from onchain`,
				data: pools
			}
		},
		staleTime: 60000, // 1 minute
		refetchInterval: 300000, // Refetch every 5 minutes
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	})
}

// export const useGetPools2 = () => {
// 	const { connection } = useConnection()
// 	return useQuery({
// 		queryKey: ['get-pools-2'],
// 		queryFn: async () => {
// 			const poolAccounts = await connection.getProgramAccounts(
// 				new PublicKey('SwapD4hpSrcB23e4RGdXPBdNzgXoFGaTEa1ZwoouotX')
// 			)
// 			console.log('pool account ', poolAccounts)
// 			return poolAccounts.map(({ pubkey, account }) => {
// 				const data = new Uint8Array(account.data.buffer, account.data.byteOffset, account.data.byteLength)
// 				const info = SWAP_LAYOUT.decode(data)
// 				console.log('this is the info ', info)
// 				return {
// 					poolAddress: pubkey.toBase58(),
// 					tokenAccountA: new PublicKey(info.tokenAccountA).toBase58(),
// 					tokenAccountB: new PublicKey(info.tokenAccountB).toBase58(),
// 					mintA: new PublicKey(info.mintA).toBase58(),
// 					mintB: new PublicKey(info.mintB).toBase58(),
// 					poolMint: new PublicKey(info.poolMint).toBase58()
// 				}
// 			})
// 		}
// 	})
// }

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

export const useCreatePool = () => {
	const { connection } = useConnection()
	const { publicKey: ownerAddress, sendTransaction, signTransaction } = useWallet()

	return useMutation<TCreatePoolResponse, Error, TCreatePoolPayload>({
		mutationKey: [SERVICES_KEY.POOL.CREATE_POOL, ownerAddress?.toBase58()],
		mutationFn: async (payload) => {
			if (!ownerAddress) {
				throw new Error('Wallet not connected. Please connect your wallet to create a pool.')
			}

			if (!signTransaction) {
				throw new Error('Wallet does not support transaction signing.')
			}

			console.log('🚀 Starting pool creation process...')
			console.log('📊 Pool Configuration:', {
				baseToken: `${payload.baseToken.symbol} (${payload.baseToken.address})`,
				quoteToken: `${payload.quoteToken.symbol} (${payload.quoteToken.address})`,
				feeTier: payload.feeTier,
				initialPrice: payload.initialPrice,
				baseAmount: payload.baseTokenAmount,
				quoteAmount: payload.quoteTokenAmount
			})

			try {
				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const latestBlockhash = await connection.getLatestBlockhash('confirmed')
				const baseMint = new PublicKey(payload.baseToken.address)
				const quoteMint = new PublicKey(payload.quoteToken.address)

				console.log('🔑 Token mint addresses:', {
					baseMint: baseMint.toBase58(),
					quoteMint: quoteMint.toBase58()
				})

				const tokenSwap = Keypair.generate()
				const [authority] = PublicKey.findProgramAddressSync([tokenSwap.publicKey.toBuffer()], TOKEN_SWAP_PROGRAM_ID)

				console.log('authority ', authority.toBase58())

				const baseTokenAccount = await getAssociatedTokenAddress(baseMint, authority, true)
				console.log('base token account ', baseTokenAccount.toBase58())
				const baseTokenInfo = await connection.getAccountInfo(baseTokenAccount)

				if (!baseTokenInfo) {
					try {
						const ix = createAssociatedTokenAccountInstruction(ownerAddress, baseTokenAccount, authority, baseMint)
						const tx = new Transaction().add(ix)
						const sig = await sendTransaction(tx, connection)
						await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')

						console.log('Token account created with sig:', sig)
					} catch (err) {
						console.error('❌ Error creating associated token account:', err)
					}
				}

				const quoteTokenAccount = await getAssociatedTokenAddress(quoteMint, authority, true)
				console.log('quote token account ', baseTokenAccount.toBase58())
				const quoteTokenInfo = await connection.getAccountInfo(quoteTokenAccount)
				if (!quoteTokenInfo) {
					try {
						const ix = createAssociatedTokenAccountInstruction(ownerAddress, quoteTokenAccount, authority, quoteMint)
						const tx = new Transaction().add(ix)
						const sig = await sendTransaction(tx, connection)
						await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')
						console.log('Token account created with sig:', sig)
					} catch (err) {
						console.error('❌ Error creating associated token account:', err)
					}
				}

				// === Create LP token mint ===
				const poolKeypair = Keypair.generate()

				const createMintIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: poolKeypair.publicKey,
					space: MINT_SIZE,
					daltons,
					programId: TOKEN_PROGRAM_ID
				})

				const initMintIx = createInitializeMintInstruction(poolKeypair.publicKey, 2, authority, null)

				const poolTokenAccount = await getAssociatedTokenAddress(poolKeypair.publicKey, ownerAddress)
				const ataIx = createAssociatedTokenAccountInstruction(
					ownerAddress,
					poolTokenAccount,
					ownerAddress,
					poolKeypair.publicKey
				)

				const createPoolTx = new Transaction().add(createMintIx, initMintIx, ataIx)
				createPoolTx.recentBlockhash = latestBlockhash.blockhash
				createPoolTx.feePayer = ownerAddress
				createPoolTx.partialSign(poolKeypair)

				const signedTx = await signTransaction?.(createPoolTx)
				if (!signedTx) throw new Error('Transaction signing failed')
				const poolSig = await connection.sendRawTransaction(signedTx.serialize())
				await connection.confirmTransaction({ signature: poolSig, ...latestBlockhash }, 'confirmed')

				// === Enhanced Fee Configuration ===
				const feeTierMap: Record<string, { numerator: number; denominator: number }> = {
					'0.01': { numerator: 1, denominator: 10000 },    // 0.01%
					'0.05': { numerator: 5, denominator: 10000 },    // 0.05%
					'0.1': { numerator: 1, denominator: 1000 },      // 0.1%
					'0.25': { numerator: 25, denominator: 10000 },   // 0.25%
					'0.3': { numerator: 3, denominator: 1000 },      // 0.3%
					'1': { numerator: 1, denominator: 100 }          // 1%
				}
				const feeConfig = feeTierMap[payload.feeTier]
				if (!feeConfig) {
					throw new Error(`Invalid fee tier: ${payload.feeTier}%. Supported tiers: ${Object.keys(feeTierMap).join(', ')}%`)
				}
				
				console.log('💰 Pool fee configuration:', {
					tier: `${payload.feeTier}%`,
					numerator: feeConfig.numerator,
					denominator: feeConfig.denominator
				})

				console.log('token swap ', tokenSwap.publicKey.toBase58())
				console.log('authority ', authority.toBase58())
				console.log('token A ', baseTokenAccount.toBase58())
				console.log('token B ', quoteTokenAccount.toBase58())
				console.log('Pool mint ', poolKeypair.publicKey.toBase58())
				console.log('Token program id ', TOKEN_PROGRAM_ID.toBase58())

				const feeAccount = await getAssociatedTokenAddress(poolKeypair.publicKey, authority, true)
				const feeInfo = await connection.getAccountInfo(feeAccount)
				if (!feeInfo) {
					const feeIx = createAssociatedTokenAccountInstruction(
						ownerAddress,
						feeAccount,
						authority,
						poolKeypair.publicKey
					)
					const tx = new Transaction().add(feeIx)
					const sig = await sendTransaction(tx, connection)
					await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')
				}

				const destinationAccount = poolTokenAccount // Typically user’s pool LP token ATA

				// === Swap Initialization ===
				const swapCurve = {
					curveType: CurveType.ConstantProduct,
					calculator: new Array(32).fill(0) // 32 bytes for curve parameters
				}

				const fees = {
					tradeFeeNumerator: new BN(feeConfig.numerator),
					tradeFeeDenominator: new BN(feeConfig.denominator),
					ownerTradeFeeNumerator: new BN(0),
					ownerTradeFeeDenominator: new BN(0),
					ownerWithdrawFeeNumerator: new BN(0),
					ownerWithdrawFeeDenominator: new BN(0),
					hostFeeNumerator: new BN(0),
					hostFeeDenominator: new BN(0)
				}

				const swapIx = createInitializeInstruction(
					{
						tokenSwap: tokenSwap.publicKey,
						authority: authority,
						tokenA: baseTokenAccount,
						tokenB: quoteTokenAccount,
						poolMint: poolKeypair.publicKey,
						feeAccount,
						destination: destinationAccount,
						tokenProgram: TOKEN_PROGRAM_ID
					},
					{ fees, swapCurve }
				)

				const finalTx = new Transaction().add(swapIx)
				finalTx.recentBlockhash = latestBlockhash.blockhash
				finalTx.feePayer = ownerAddress
				finalTx.partialSign(tokenSwap)

				const signedFinalTx = await signTransaction?.(finalTx)
				if (!signedFinalTx) throw new Error('Final transaction signing failed')
				const sig = await connection.sendRawTransaction(signedFinalTx.serialize())
				await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')

				return {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					poolMint: poolKeypair.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					lpTokenAccount: poolTokenAccount.toBase58()
				}
			} catch (error) {
				console.error('❌ Pool creation failed:', error)
				
				// Enhanced error handling with specific error messages
				if (error instanceof Error) {
					if (error.message.includes('insufficient funds')) {
						throw new Error('Insufficient funds to create pool. Please ensure you have enough BBA for transaction fees.')
					}
					if (error.message.includes('TokenAccountNotFound')) {
						throw new Error('Token account not found. Please ensure the selected tokens are valid.')
					}
					if (error.message.includes('InvalidOwner')) {
						throw new Error('Invalid token owner. Please check your wallet permissions.')
					}
					if (error.message.includes('TokenMintToFailed')) {
						throw new Error('Failed to mint pool tokens. Please try again.')
					}
					if (error.message.includes('SimulateTransactionError')) {
						throw new Error('Transaction simulation failed. Please check your inputs and try again.')
					}
					throw error
				}
				
				throw new Error('Pool creation failed due to an unexpected error. Please try again.')
			}
		}
	})
}
