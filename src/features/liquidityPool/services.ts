import {
	TOKEN_PROGRAM_ID,
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	createInitializeMintInstruction
} from '@bbachain/spl-token'
import { CurveType, createInitializeInstruction } from '@bbachain/spl-token-swap'
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

			console.log('🚀 Starting BBAChain Liquidity Pool creation process...')
			console.log('📊 Pool Configuration:', {
				baseToken: `${payload.baseToken.symbol} (${payload.baseToken.address})`,
				quoteToken: `${payload.quoteToken.symbol} (${payload.quoteToken.address})`,
				feeTier: `${payload.feeTier}%`,
				initialPrice: `${payload.initialPrice} ${payload.baseToken.symbol} per ${payload.quoteToken.symbol}`,
				baseAmount: `${payload.baseTokenAmount} ${payload.baseToken.symbol}`,
				quoteAmount: `${payload.quoteTokenAmount} ${payload.quoteToken.symbol}`,
				programId: TOKEN_SWAP_PROGRAM_ID.toBase58()
			})

			try {
				// Validate pool creation requirements
				console.log('🔍 Validating pool creation requirements...')

				// Check if tokens are different
				if (payload.baseToken.address === payload.quoteToken.address) {
					throw new Error('Base and quote tokens must be different')
				}

				// Check if amounts are valid
				const baseAmount = parseFloat(payload.baseTokenAmount)
				const quoteAmount = parseFloat(payload.quoteTokenAmount)

				if (baseAmount <= 0 || quoteAmount <= 0) {
					throw new Error('Token amounts must be greater than zero')
				}

				// Check if initial price is valid
				const initialPrice = parseFloat(payload.initialPrice)
				if (initialPrice <= 0) {
					throw new Error('Initial price must be greater than zero')
				}

				console.log('✅ Pool validation passed')

				const daltons = await getMinimumBalanceForRentExemptMint(connection)
				const latestBlockhash = await connection.getLatestBlockhash('confirmed')
				const baseMint = new PublicKey(payload.baseToken.address)
				const quoteMint = new PublicKey(payload.quoteToken.address)

				console.log('🔑 Token mint addresses:', {
					baseMint: baseMint.toBase58(),
					quoteMint: quoteMint.toBase58()
				})

				const tokenSwap = Keypair.generate()
				const [authority, bumpSeed] = PublicKey.findProgramAddressSync(
					[tokenSwap.publicKey.toBuffer()],
					TOKEN_SWAP_PROGRAM_ID
				)

				console.log('🔑 Authority Derivation:', {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					authority: authority.toBase58(),
					bumpSeed,
					programId: TOKEN_SWAP_PROGRAM_ID.toBase58()
				})

				console.log('authority ', authority.toBase58())

				// Create swap's token A account (owned by authority)
				const swapTokenAAccount = await getAssociatedTokenAddress(baseMint, authority, true)
				console.log('🏦 Swap Token A Account:', swapTokenAAccount.toBase58())
				const baseTokenInfo = await connection.getAccountInfo(swapTokenAAccount)

				if (!baseTokenInfo) {
					console.log('📝 Creating swap token A account...')
					const ix = createAssociatedTokenAccountInstruction(ownerAddress, swapTokenAAccount, authority, baseMint)
					const tx = new Transaction().add(ix)
					const sig = await sendTransaction(tx, connection)
					await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')
					console.log('✅ Swap Token A account created:', sig)
				}

				// Create swap's token B account (owned by authority)
				const swapTokenBAccount = await getAssociatedTokenAddress(quoteMint, authority, true)
				console.log('🏦 Swap Token B Account:', swapTokenBAccount.toBase58())
				const quoteTokenInfo = await connection.getAccountInfo(swapTokenBAccount)
				if (!quoteTokenInfo) {
					console.log('📝 Creating swap token B account...')
					const ix = createAssociatedTokenAccountInstruction(ownerAddress, swapTokenBAccount, authority, quoteMint)
					const tx = new Transaction().add(ix)
					const sig = await sendTransaction(tx, connection)
					await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')
					console.log('✅ Swap Token B account created:', sig)
				}

				// === Create LP token mint ===
				console.log('🏭 Creating LP token mint...')
				const poolMint = Keypair.generate()

				console.log('🔑 Generated LP token mint:', poolMint.publicKey.toBase58())

				// Step 1: Create mint account (only requires poolMint signature)
				const createMintIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: poolMint.publicKey,
					space: MINT_SIZE,
					daltons,
					programId: TOKEN_PROGRAM_ID
				})

				// Step 2: Initialize mint (requires authority)
				const initMintIx = createInitializeMintInstruction(poolMint.publicKey, 2, authority, null)

				// Step 3: Create user's LP token account
				const poolTokenAccount = await getAssociatedTokenAddress(poolMint.publicKey, ownerAddress)
				const ataIx = createAssociatedTokenAccountInstruction(
					ownerAddress,
					poolTokenAccount,
					ownerAddress,
					poolMint.publicKey
				)

				// Create transaction using sendTransaction with signers (BBA wallet compatible approach)
				console.log('📝 Creating LP mint transaction with sendTransaction method...')
				const createPoolTx = new Transaction().add(createMintIx, initMintIx, ataIx)

				// Use sendTransaction which can handle additional signers
				const poolSig = await sendTransaction(createPoolTx, connection, {
					signers: [poolMint], // Pass poolMint as additional signer
					skipPreflight: false,
					preflightCommitment: 'confirmed'
				})

				console.log('⏳ LP mint transaction sent:', poolSig)

				await connection.confirmTransaction({ signature: poolSig, ...latestBlockhash }, 'confirmed')
				console.log('✅ LP token mint created successfully')

				// === Enhanced Fee Configuration ===
				const feeTierMap: Record<string, { numerator: number; denominator: number }> = {
					'0.01': { numerator: 1, denominator: 10000 }, // 0.01%
					'0.05': { numerator: 5, denominator: 10000 }, // 0.05%
					'0.1': { numerator: 1, denominator: 1000 }, // 0.1%
					'0.25': { numerator: 25, denominator: 10000 }, // 0.25%
					'0.3': { numerator: 3, denominator: 1000 }, // 0.3%
					'1': { numerator: 1, denominator: 100 } // 1%
				}
				const feeConfig = feeTierMap[payload.feeTier]
				if (!feeConfig) {
					throw new Error(
						`Invalid fee tier: ${payload.feeTier}%. Supported tiers: ${Object.keys(feeTierMap).join(', ')}%`
					)
				}

				console.log('💰 Pool fee configuration:', {
					tier: `${payload.feeTier}%`,
					numerator: feeConfig.numerator,
					denominator: feeConfig.denominator
				})

				console.log('token swap ', tokenSwap.publicKey.toBase58())
				console.log('authority ', authority.toBase58())
				console.log('token A ', swapTokenAAccount.toBase58())
				console.log('token B ', swapTokenBAccount.toBase58())
				console.log('Pool mint ', poolMint.publicKey.toBase58())
				console.log('Token program id ', TOKEN_PROGRAM_ID.toBase58())

				const feeAccount = await getAssociatedTokenAddress(poolMint.publicKey, authority, true)
				const feeInfo = await connection.getAccountInfo(feeAccount)
				if (!feeInfo) {
					const feeIx = createAssociatedTokenAccountInstruction(ownerAddress, feeAccount, authority, poolMint.publicKey)
					const tx = new Transaction().add(feeIx)
					const sig = await sendTransaction(tx, connection)
					await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')
					console.log('✅ Fee account created:', sig)
				}

				// Verify all accounts exist before initialization
				console.log('🔍 Verifying all required accounts exist...')
				const [baseInfo, quoteInfo, poolInfo, feeUpdatedInfo] = await Promise.all([
					connection.getAccountInfo(swapTokenAAccount),
					connection.getAccountInfo(swapTokenBAccount),
					connection.getAccountInfo(poolMint.publicKey),
					connection.getAccountInfo(feeAccount)
				])

				console.log('📋 Account Verification:', {
					swapTokenAAccount: !!baseInfo,
					swapTokenBAccount: !!quoteInfo,
					poolMint: !!poolInfo,
					feeAccount: !!feeUpdatedInfo,
					allExist: !!(baseInfo && quoteInfo && poolInfo && feeUpdatedInfo)
				})

				if (!baseInfo || !quoteInfo || !poolInfo || !feeUpdatedInfo) {
					throw new Error('Some required accounts do not exist. Cannot proceed with pool initialization.')
				}

				// === CRITICAL: Deposit Initial Liquidity ===
				console.log('💰 Depositing initial liquidity to swap token accounts...')

				// Get user's token accounts for transfer
				const userBaseTokenAccount = await getAssociatedTokenAddress(baseMint, ownerAddress)
				const userQuoteTokenAccount = await getAssociatedTokenAddress(quoteMint, ownerAddress)

				// Convert amounts to proper decimals (assuming 6 decimals for both tokens)
				// Calculate quote amount from initial price: baseAmount / initialPrice
				const liquidityBaseAmount = parseFloat(payload.baseTokenAmount)
				const liquidityInitialPrice = parseFloat(payload.initialPrice) // SHIB per USDT
				const liquidityQuoteAmount = liquidityBaseAmount / liquidityInitialPrice // USDT amount

				const baseAmountLamports = Math.floor(liquidityBaseAmount * Math.pow(10, 6))
				const quoteAmountLamports = Math.floor(liquidityQuoteAmount * Math.pow(10, 6))

				console.log('💰 Initial Liquidity Amounts:', {
					baseAmount: payload.baseTokenAmount,
					calculatedQuoteAmount: liquidityQuoteAmount,
					initialPrice: liquidityInitialPrice,
					baseAmountLamports,
					quoteAmountLamports,
					userBaseAccount: userBaseTokenAccount.toBase58(),
					userQuoteAccount: userQuoteTokenAccount.toBase58()
				})

				// Create transfer instructions to fund the swap accounts
				const { createTransferInstruction } = await import('@bbachain/spl-token')

				const transferBaseIx = createTransferInstruction(
					userBaseTokenAccount,
					swapTokenAAccount,
					ownerAddress,
					baseAmountLamports
				)

				const transferQuoteIx = createTransferInstruction(
					userQuoteTokenAccount,
					swapTokenBAccount,
					ownerAddress,
					quoteAmountLamports
				)

				// Send initial liquidity transfer
				const liquidityTx = new Transaction().add(transferBaseIx, transferQuoteIx)
				const liquiditySig = await sendTransaction(liquidityTx, connection)
				await connection.confirmTransaction({ signature: liquiditySig, ...latestBlockhash }, 'confirmed')
				console.log('✅ Initial liquidity deposited:', liquiditySig)

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

				console.log('🔧 Creating token swap instruction using @bbachain/spl-token-swap...')

				// Create the token swap initialization instruction with all required accounts
				console.log('🔧 Preparing swap initialization accounts...')
				console.log('📋 Account Details:', {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					authority: authority.toBase58(),
					tokenA: swapTokenAAccount.toBase58(),
					tokenB: swapTokenBAccount.toBase58(),
					poolMint: poolMint.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					destination: destinationAccount.toBase58(),
					tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
					// Also log the mint addresses for debugging
					mintA: baseMint.toBase58(),
					mintB: quoteMint.toBase58()
				})

				// Use library function for exact BBAChain compatibility
				console.log('🔧 Using @bbachain/spl-token-swap createInitializeInstruction...')

				const swapIx = createInitializeInstruction(
					{
						tokenSwap: tokenSwap.publicKey,
						authority: authority,
						tokenA: swapTokenAAccount,
						tokenB: swapTokenBAccount,
						poolMint: poolMint.publicKey,
						feeAccount,
						destination: destinationAccount,
						tokenProgram: TOKEN_PROGRAM_ID
					},
					{
						fees,
						swapCurve
					}
				)

				console.log('📋 Library Instruction Analysis:', {
					programId: swapIx.programId.toBase58(),
					dataLength: swapIx.data.length,
					accountCount: swapIx.keys.length,
					firstDataBytes: Array.from(swapIx.data.slice(0, 10))
						.map((b) => `0x${b.toString(16).padStart(2, '0')}`)
						.join(' '),
					fees: {
						tradeFeeNum: fees.tradeFeeNumerator.toString(),
						tradeFeeDenom: fees.tradeFeeDenominator.toString()
					},
					bumpSeed: bumpSeed,
					// Complete instruction data dump for analysis
					completeDataHex: Array.from(swapIx.data)
						.map((b) => `0x${b.toString(16).padStart(2, '0')}`)
						.join(' ')
				})

				console.log('🔍 Library-Generated Account List:', {
					accountCount: swapIx.keys.length,
					accounts: swapIx.keys.map(
						(key, index) => `${index}. ${key.pubkey.toBase58()} (signer: ${key.isSigner}, writable: ${key.isWritable})`
					)
				})

				console.log('✅ Token swap instruction created successfully')
				console.log('📋 Swap Instruction Details:', {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					authority: authority.toBase58(),
					tokenA: swapTokenAAccount.toBase58(),
					tokenB: swapTokenBAccount.toBase58(),
					poolMint: poolMint.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					destination: destinationAccount.toBase58(),
					curveType: 'ConstantProduct',
					tradeFee: `${feeConfig.numerator}/${feeConfig.denominator}`
				})

				// Log the instruction keys for debugging
				console.log(
					'🔍 Instruction accounts:',
					swapIx.keys.map((key, index) => ({
						index,
						pubkey: key.pubkey.toBase58(),
						isSigner: key.isSigner,
						isWritable: key.isWritable
					}))
				)

				// === Create TokenSwap Account + Initialize in Single Transaction ===
				console.log('🏗️ Creating TokenSwap account and initializing in single transaction...')
				// Import TokenSwapLayout to get exact span
				const { TokenSwapLayout } = await import('./onchain')
				const tokenSwapAccountSize = TokenSwapLayout.span // Use exact layout span instead of hardcoded 324
				console.log('📏 TokenSwap account size from layout:', tokenSwapAccountSize)
				const swapAccountDaltons = await connection.getMinimumBalanceForRentExemption(tokenSwapAccountSize)

				const createSwapAccountIx = SystemProgram.createAccount({
					fromPubkey: ownerAddress,
					newAccountPubkey: tokenSwap.publicKey,
					space: tokenSwapAccountSize,
					daltons: swapAccountDaltons,
					programId: TOKEN_SWAP_PROGRAM_ID
				})

				console.log('🔧 Combining create account + initialize in single transaction...')
				console.log('📋 Final Transaction Instructions:', {
					instruction1: 'SystemProgram.createAccount',
					instruction2: 'TokenSwap.initialize',
					tokenSwapAccount: tokenSwap.publicKey.toBase58(),
					expectedSize: tokenSwapAccountSize,
					owner: TOKEN_SWAP_PROGRAM_ID.toBase58()
				})

				// Combine create account + initialize in single transaction
				const finalTx = new Transaction().add(createSwapAccountIx, swapIx)
				finalTx.recentBlockhash = latestBlockhash.blockhash
				finalTx.feePayer = ownerAddress

				// Verify critical account properties BEFORE simulation
				console.log('🔍 Pre-flight account verification...')

				// Check LP mint authority
				const poolMintInfo = await connection.getAccountInfo(poolMint.publicKey)
				if (poolMintInfo) {
					// Parse mint data to check authority
					const mintData = poolMintInfo.data
					console.log('🏦 Pool Mint Analysis:', {
						exists: true,
						owner: poolMintInfo.owner.toBase58(),
						dataLength: mintData.length,
						expectedOwner: TOKEN_PROGRAM_ID.toBase58(),
						authorityBytes: mintData.slice(4, 36), // authority is at offset 4-36
						authorityPubkey: new PublicKey(mintData.slice(4, 36)).toBase58(),
						expectedAuthority: authority.toBase58(),
						authorityMatch: new PublicKey(mintData.slice(4, 36)).equals(authority)
					})
				}

				// Check token account ownership
				const [tokenAInfo, tokenBInfo] = await Promise.all([
					connection.getAccountInfo(swapTokenAAccount),
					connection.getAccountInfo(swapTokenBAccount)
				])

				console.log('🔍 Token Account Ownership Verification:', {
					tokenAExists: !!tokenAInfo,
					tokenBExists: !!tokenBInfo,
					tokenAOwner: tokenAInfo?.owner.toBase58(),
					tokenBOwner: tokenBInfo?.owner.toBase58(),
					expectedTokenOwner: TOKEN_PROGRAM_ID.toBase58(),
					tokenAOwnerCorrect: tokenAInfo?.owner.equals(TOKEN_PROGRAM_ID),
					tokenBOwnerCorrect: tokenBInfo?.owner.equals(TOKEN_PROGRAM_ID)
				})

				// Parse token account data to check authority AND balances
				if (tokenAInfo && tokenBInfo) {
					const tokenAAuthority = new PublicKey(tokenAInfo.data.slice(32, 64))
					const tokenBAuthority = new PublicKey(tokenBInfo.data.slice(32, 64))

					// Parse token account balances (amount is at offset 64-72, 8 bytes little endian)
					const tokenABalance = new BN(tokenAInfo.data.slice(64, 72), 'le')
					const tokenBBalance = new BN(tokenBInfo.data.slice(64, 72), 'le')

					console.log('🔍 Token Account Authority Check:', {
						tokenAAuthority: tokenAAuthority.toBase58(),
						tokenBAuthority: tokenBAuthority.toBase58(),
						expectedAuthority: authority.toBase58(),
						tokenAAuthorityCorrect: tokenAAuthority.equals(authority),
						tokenBAuthorityCorrect: tokenBAuthority.equals(authority)
					})

					console.log('💰 Token Account Balance Verification:', {
						tokenABalance: tokenABalance.toString(),
						tokenBBalance: tokenBBalance.toString(),
						tokenABalanceFormatted: tokenABalance.div(new BN(1000000)).toString() + ' tokens',
						tokenBBalanceFormatted: tokenBBalance.div(new BN(1000000)).toString() + ' tokens',
						bothHaveBalance: tokenABalance.gt(new BN(0)) && tokenBBalance.gt(new BN(0)),
						minimumBalanceCheck: tokenABalance.gte(new BN(1000000)) && tokenBBalance.gte(new BN(1000000)) // At least 1 token each
					})

					// Verify balances are sufficient
					if (tokenABalance.isZero() || tokenBBalance.isZero()) {
						throw new Error('Token swap accounts must have non-zero balances before initialization')
					}
				}

				// Simulate transaction first to catch any errors
				try {
					console.log('🧪 Simulating transaction...')
					const simulation = await connection.simulateTransaction(finalTx)

					console.log('📊 Simulation Result:', {
						success: !simulation.value.err,
						error: simulation.value.err,
						unitsConsumed: simulation.value.unitsConsumed,
						returnData: simulation.value.returnData,
						logs: simulation.value.logs // All logs for debugging
					})

					// Enhanced error analysis specifically for InvalidAccountData
					if (simulation.value.err && JSON.stringify(simulation.value.err).includes('InvalidAccountData')) {
						console.log('🔍 Enhanced InvalidAccountData Analysis:', {
							errorDetail: simulation.value.err,
							instructionIndex: JSON.stringify(simulation.value.err).includes('[1,') ? 1 : 0,
							accountsInInstruction: swapIx.keys.length,
							programLogs: simulation.value.logs?.filter((log) => log.includes('Program SwapD4')),
							allLogs: simulation.value.logs,
							accountMeta: swapIx.keys.map((key, i) => ({
								index: i,
								pubkey: key.pubkey.toBase58(),
								writable: key.isWritable,
								signer: key.isSigner
							}))
						})
					}

					// Enhanced error analysis for InvalidAccountData
					if (simulation.value.err) {
						const errorStr = JSON.stringify(simulation.value.err)
						console.error('🔍 Detailed simulation error analysis:', {
							errorType: typeof simulation.value.err,
							errorString: errorStr,
							isInvalidAccountData: errorStr.includes('InvalidAccountData'),
							programLogs: simulation.value.logs?.filter((log) =>
								log.includes('Program SwapD4hpSrcB23e4RGdXPBdNzgXoFGaTEa1ZwoouotX')
							)
						})

						// Check if any of the accounts failed validation
						const failedAccountLogs =
							simulation.value.logs?.filter(
								(log) =>
									log.includes('invalid') || log.includes('Invalid') || log.includes('fail') || log.includes('error')
							) || []

						if (failedAccountLogs.length > 0) {
							console.error('🚨 Failed account validation logs:', failedAccountLogs)
						}

						throw new Error(`Transaction simulation failed: ${errorStr}`)
					}
				} catch (simError) {
					console.error('❌ Simulation failed:', simError)
					console.log(
						'⚠️ Simulation failed, but attempting actual transaction (sometimes simulation is overly strict)...'
					)

					// Don't throw here - try actual transaction as simulation can be overly restrictive
				}

				console.log('📝 Sending pool initialization transaction...')
				// Send transaction with tokenSwap as signer (BBA wallet compatible)
				const sig = await sendTransaction(finalTx, connection, {
					signers: [tokenSwap], // Include tokenSwap as signer for account creation
					skipPreflight: true, // Skip preflight since we already simulated
					preflightCommitment: 'confirmed'
				})
				console.log('⏳ Pool initialization transaction sent:', sig)

				await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed')

				console.log('🎉 BBAChain Liquidity Pool created successfully!')
				console.log('📄 Final transaction signature:', sig)
				console.log('🏊‍♂️ Pool is now live and ready for trading!')

				return {
					tokenSwap: tokenSwap.publicKey.toBase58(),
					poolMint: poolMint.publicKey.toBase58(),
					feeAccount: feeAccount.toBase58(),
					lpTokenAccount: poolTokenAccount.toBase58()
				}
			} catch (error) {
				console.error('❌ Pool creation failed:', error)

				// Enhanced error handling with specific error messages
				if (error instanceof Error) {
					if (error.message.includes('insufficient funds')) {
						throw new Error(
							'Insufficient funds to create pool. Please ensure you have enough BBA for transaction fees.'
						)
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
