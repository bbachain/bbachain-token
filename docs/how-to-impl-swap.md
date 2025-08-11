# BBAChain Swap Integration Guide

A comprehensive step-by-step guide for integrating BBAChain's swap functionality into your mobile or web application. This guide focuses on the blockchain client logic and hooks needed for swap operations.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Core Components](#core-components)
4. [Configuration](#configuration)
5. [Implementation Steps](#implementation-steps)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Overview

This guide helps you integrate BBAChain's native swap functionality into your application. The swap system utilizes:

- **BBAChain's native liquidity pools**: Onchain pools with constant product formula (x \* y = k)
- **Native BBA token handling**: Automatic wrapping/unwrapping between BBA and WBBA
- **Real-time price quotes**: Dynamic pricing based on pool reserves and slippage
- **Multiple token support**: Swap between any tokens with available liquidity pools

### Key Features

- ✅ Native BBA ↔ Token swaps with automatic wrapping
- ✅ Token ↔ Token direct swaps
- ✅ Real-time price calculation and slippage protection
- ✅ Multiple wallet adapter support
- ✅ Onchain pool data integration
- ✅ Transaction execution with error handling

## Prerequisites

Before starting, ensure you have:

- Basic knowledge of React/React Native development
- Understanding of Web3 concepts (wallets, transactions, tokens)
- Node.js 16+ installed
- Access to BBAChain network endpoints
- BBAChain dependencies installed in your project

## Core Components

### 1. Blockchain Configuration

Create `src/config/bbachain.ts`:

```typescript
import { NATIVE_MINT } from '@bbachain/spl-token'

export const BBACHAIN_CONFIG = {
	NATIVE_MINT: NATIVE_MINT.toBase58(),
	NETWORK: process.env.NEXT_PUBLIC_BBACHAIN_NETWORK || 'mainnet',
	RPC_ENDPOINT: process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api-mainnet.bbachain.com',
	DALTON_UNIT: 1_000_000_000 // 1 BBA = 10^9 daltons
}

export const ENDPOINTS = {
	TOKENS: '/api/tokens'
}
```

### 2. Token Type Definitions

Create `src/types/swap.ts`:

```typescript
export interface TokenInfo {
	address: string
	symbol: string
	name: string
	decimals: number
	logoURI?: string
	tags?: string[]
}

export interface SwapQuote {
	inputAmount: number
	outputAmount: number
	minimumReceived: number
	priceImpact: number
	exchangeRate: number
	feeRate: number
	poolAddress: string
}

export interface SwapParams {
	inputMint: string
	outputMint: string
	inputAmount: string
	slippage: number
	poolAddress: string
}
```

### 3. BBAChain Provider Setup

Create `src/providers/BBAChainProvider.tsx`:

```typescript
'use client'

import { WalletError } from '@bbachain/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@bbachain/wallet-adapter-react'
import { BBAWalletAdapter } from '@bbachain/wallet-adapter-wallets'
import { ReactNode, useCallback, useMemo } from 'react'
import { BBACHAIN_CONFIG } from '../config/bbachain'

export default function BBAChainProvider({ children }: { children: ReactNode }) {
	const endpoint = useMemo(() => BBACHAIN_CONFIG.RPC_ENDPOINT, [])
	const wallets = useMemo(() => [new BBAWalletAdapter()], [])

	const onError = useCallback((error: WalletError) => {
		console.error('Wallet error:', error)
	}, [])

	return (
		<ConnectionProvider endpoint={endpoint}>
			<WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
				{children}
			</WalletProvider>
		</ConnectionProvider>
	)
}
```

## Configuration

### 1. Token Configuration Service

Create `src/services/tokenService.ts`:

```typescript
import { NATIVE_MINT } from '@bbachain/spl-token'
import { TokenInfo } from '../types/swap'
import axios from 'axios'

// BBAChain official tokens API endpoint
const TOKENS_API_URL = 'https://token.bbachain.com/api/tokens'

interface TokenApiResponse {
	message: string
	data: Array<{
		name: string
		symbol: string
		address: string
		logoURI: string
		decimals: number
		tags: string[]
	}>
}

// Cache for tokens to avoid frequent API calls
let tokensCache: TokenInfo[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch tokens from BBAChain API
 */
export async function fetchTokensFromAPI(): Promise<TokenInfo[]> {
	const now = Date.now()

	// Return cached data if still valid
	if (tokensCache && now - lastFetchTime < CACHE_DURATION) {
		return tokensCache
	}

	console.log('🔄 Fetching tokens from BBAChain API...')
	const response = await axios.get<TokenApiResponse>(TOKENS_API_URL)

	const tokens: TokenInfo[] = response.data.data.map((token) => ({
		address: token.address,
		symbol: token.symbol,
		name: token.name,
		decimals: token.decimals,
		logoURI: token.logoURI,
		tags: token.tags
	}))

	// Update cache
	tokensCache = tokens
	lastFetchTime = now

	console.log(
		`✅ Fetched ${tokens.length} tokens from API:`,
		tokens.map((t) => t.symbol)
	)
	return tokens
}

/**
 * Check if a token is the native BBA token
 */
export function isNativeBBA(address: string): boolean {
	return address === NATIVE_MINT.toBase58()
}

/**
 * Get token by address from cached tokens
 */
export async function getTokenByAddress(address: string): Promise<TokenInfo | null> {
	const tokens = await fetchTokensFromAPI()
	return tokens.find((token) => token.address === address) || null
}

/**
 * Get all available tokens
 */
export async function getAllTokens(): Promise<TokenInfo[]> {
	return await fetchTokensFromAPI()
}

/**
 * Search tokens by symbol or name
 */
export async function searchTokens(query: string): Promise<TokenInfo[]> {
	const tokens = await fetchTokensFromAPI()
	const searchTerm = query.toLowerCase()

	return tokens.filter(
		(token) =>
			token.symbol.toLowerCase().includes(searchTerm) ||
			token.name.toLowerCase().includes(searchTerm) ||
			token.address.toLowerCase().includes(searchTerm)
	)
}
```

### 2. Liquidity Pool Utilities

Create `src/utils/poolCalculations.ts`:

```typescript
/**
 * Calculate output amount using constant product formula (x * y = k)
 */
export function calculateOutputAmount(
	inputAmount: number,
	inputReserve: number,
	outputReserve: number,
	feeRate: number
): number {
	if (inputAmount <= 0 || inputReserve <= 0 || outputReserve <= 0) {
		return 0
	}

	// Apply fee to input amount
	const inputAmountWithFee = inputAmount * (1 - feeRate)

	// Constant product formula: (x + dx) * (y - dy) = x * y
	const outputAmount = (outputReserve * inputAmountWithFee) / (inputReserve + inputAmountWithFee)

	return Math.max(0, outputAmount)
}

/**
 * Calculate price impact for a swap
 */
export function calculatePriceImpact(
	inputAmount: number,
	inputReserve: number,
	outputReserve: number,
	feeRate: number
): number {
	if (inputAmount <= 0 || inputReserve <= 0 || outputReserve <= 0) return 0

	const currentPrice = outputReserve / inputReserve
	const outputAmount = calculateOutputAmount(inputAmount, inputReserve, outputReserve, feeRate)
	const effectivePrice = outputAmount / inputAmount

	return Math.abs((currentPrice - effectivePrice) / currentPrice) * 100
}
```

## Implementation Steps

### Step 1: Pool Data Service

Create `src/services/poolService.ts`:

```typescript
import { getAccount, getMint, TOKEN_PROGRAM_ID, NATIVE_MINT } from '@bbachain/spl-token'
import { PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID } from '@bbachain/spl-token-swap'
import { Connection, PublicKey } from '@bbachain/web3.js'
import { struct, u8, blob } from '@bbachain/buffer-layout'
import { getTokenByAddress } from './tokenService'
import { TokenInfo } from '../types/swap'

// Layout for parsing TokenSwap account data
const publicKey = (property: string = 'publicKey') => {
	return blob(32, property)
}

const uint64 = (property: string = 'uint64') => {
	return blob(8, property)
}

interface RawTokenSwap {
	version: number
	isInitialized: boolean
	bumpSeed: number
	poolTokenProgramId: Uint8Array
	tokenAccountA: Uint8Array
	tokenAccountB: Uint8Array
	tokenPool: Uint8Array
	mintA: Uint8Array
	mintB: Uint8Array
	feeAccount: Uint8Array
	tradeFeeNumerator: Uint8Array
	tradeFeeDenominator: Uint8Array
	ownerTradeFeeNumerator: Uint8Array
	ownerTradeFeeDenominator: Uint8Array
	ownerWithdrawFeeNumerator: Uint8Array
	ownerWithdrawFeeDenominator: Uint8Array
	hostFeeNumerator: Uint8Array
	hostFeeDenominator: Uint8Array
	curveType: number
	curveParameters: Uint8Array
}

export const TokenSwapLayout = struct<RawTokenSwap>([
	u8('version'),
	u8('isInitialized'),
	u8('bumpSeed'),
	publicKey('poolTokenProgramId'),
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
	u8('curveType'),
	blob(32, 'curveParameters')
])

export interface OnchainPoolData {
	address: string
	programId: string
	swapData: RawTokenSwap
	mintA: TokenInfo
	mintB: TokenInfo
	tokenAccountA: string
	tokenAccountB: string
	reserveA: bigint
	reserveB: bigint
	feeRate: number
}

/**
 * Fetch all pool accounts from the Token Swap Program
 */
export async function getPoolAccounts(connection: Connection): Promise<Array<{ pubkey: PublicKey; account: any }>> {
	try {
		const accounts = await connection.getProgramAccounts(TOKEN_SWAP_PROGRAM_ID, {
			filters: [
				{
					dataSize: TokenSwapLayout.span
				}
			]
		})
		return accounts
	} catch (error) {
		console.error('Error fetching pool accounts:', error)
		throw new Error('Failed to fetch pool accounts from onchain')
	}
}

/**
 * Parse raw pool account data into structured format
 */
export function parsePoolData(pubkey: PublicKey, accountData: Buffer): RawTokenSwap & { address: string } {
	try {
		const data = new Uint8Array(accountData.buffer, accountData.byteOffset, accountData.byteLength)
		const swapData = TokenSwapLayout.decode(data)

		return {
			address: pubkey.toBase58(),
			...swapData
		}
	} catch (error) {
		console.error('Error parsing pool data:', error)
		throw new Error(`Failed to parse pool data for ${pubkey.toBase58()}`)
	}
}

/**
 * Get all liquidity pools from onchain
 */
export async function getAllPoolsFromOnchain(connection: Connection): Promise<OnchainPoolData[]> {
	console.log('🔍 Fetching all pools from BBAChain...')

	try {
		const poolAccounts = await getPoolAccounts(connection)
		console.log(`📊 Found ${poolAccounts.length} pool accounts`)

		const pools: OnchainPoolData[] = []

		for (const { pubkey, account } of poolAccounts) {
			try {
				const parsedData = parsePoolData(pubkey, account.data)

				// Get mint information for both tokens
				const mintAPubkey = new PublicKey(parsedData.mintA)
				const mintBPubkey = new PublicKey(parsedData.mintB)

				const [mintAInfo, mintBInfo] = await Promise.all([
					getTokenMintInfo(connection, mintAPubkey),
					getTokenMintInfo(connection, mintBPubkey)
				])

				// Get token account balances for reserves
				const tokenAccountAPubkey = new PublicKey(parsedData.tokenAccountA)
				const tokenAccountBPubkey = new PublicKey(parsedData.tokenAccountB)

				const [reserveA, reserveB] = await Promise.all([
					getTokenAccountBalance(connection, tokenAccountAPubkey),
					getTokenAccountBalance(connection, tokenAccountBPubkey)
				])

				// Calculate fee rate
				const feeRate = calculateFeeRate(
					bufferToBigInt(parsedData.tradeFeeNumerator),
					bufferToBigInt(parsedData.tradeFeeDenominator)
				)

				const poolData: OnchainPoolData = {
					address: parsedData.address,
					programId: TOKEN_SWAP_PROGRAM_ID.toBase58(),
					swapData: parsedData,
					mintA: mintAInfo,
					mintB: mintBInfo,
					tokenAccountA: tokenAccountAPubkey.toBase58(),
					tokenAccountB: tokenAccountBPubkey.toBase58(),
					reserveA,
					reserveB,
					feeRate
				}

				pools.push(poolData)
			} catch (error) {
				console.warn(`⚠️ Failed to process pool ${pubkey.toBase58()}:`, error)
				continue
			}
		}

		console.log(`✅ Successfully processed ${pools.length} pools`)
		return pools
	} catch (error) {
		console.error('❌ Error fetching pools from onchain:', error)
		throw error
	}
}

// Helper functions
function bufferToBigInt(buffer: Uint8Array): bigint {
	return BigInt(
		'0x' +
			Array.from(buffer)
				.map((b) => b.toString(16).padStart(2, '0'))
				.reverse()
				.join('')
	)
}

function calculateFeeRate(numerator: bigint, denominator: bigint): number {
	if (denominator === BigInt(0)) return 0
	const feeRate = Number(numerator) / Number(denominator)
	return feeRate > 0.05 ? 0.01 : feeRate // Cap at 5%, default to 1%
}

async function getTokenMintInfo(connection: Connection, mintAddress: PublicKey): Promise<TokenInfo> {
	try {
		const addressStr = mintAddress.toBase58()

		// Check if it's a known token from BBAChain API
		const knownToken = await getTokenByAddress(addressStr)
		if (knownToken) {
			console.log(`✅ Found known token: ${knownToken.symbol} (${knownToken.name})`)
			return knownToken
		}

		// Get mint info from onchain for unknown tokens
		const mint = await getMint(connection, mintAddress)

		console.log(`⚠️ Unknown token ${addressStr}, using fallback data`)
		return {
			address: addressStr,
			symbol: addressStr.slice(0, 6).toUpperCase(),
			name: `Token ${addressStr.slice(0, 6)}`,
			decimals: mint.decimals,
			logoURI: '/icon-placeholder.svg'
		}
	} catch (error) {
		console.error(`Error fetching mint info for ${mintAddress.toBase58()}:`, error)

		const addressStr = mintAddress.toBase58()
		return {
			address: addressStr,
			symbol: addressStr.slice(0, 6).toUpperCase(),
			name: `Token ${addressStr.slice(0, 6)}`,
			decimals: 6,
			logoURI: '/icon-placeholder.svg'
		}
	}
}

async function getTokenAccountBalance(connection: Connection, tokenAccount: PublicKey): Promise<bigint> {
	try {
		const account = await getAccount(connection, tokenAccount)
		return account.amount
	} catch (error) {
		console.error(`Error fetching token account balance for ${tokenAccount.toBase58()}:`, error)
		return BigInt(0)
	}
}
```

### Step 2: Create Swap Hooks

Create `src/hooks/useSwap.ts`:

```typescript
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
	TOKEN_PROGRAM_ID,
	NATIVE_MINT,
	createApproveInstruction,
	createSyncNativeInstruction,
	createCloseAccountInstruction
} from '@bbachain/spl-token'
import { createSwapInstruction, PROGRAM_ID as TOKEN_SWAP_PROGRAM_ID } from '@bbachain/spl-token-swap'
import { PublicKey, Transaction, SystemProgram } from '@bbachain/web3.js'
import { SwapQuote, SwapParams } from '../types/swap'
import { getAllPoolsFromOnchain, OnchainPoolData } from '../services/poolService'
import { calculateOutputAmount, calculatePriceImpact } from '../utils/poolCalculations'
import { isNativeBBA } from '../services/tokenService'

/**
 * Find the best pool for a token pair
 */
function findBestPool(pools: OnchainPoolData[], inputMint: string, outputMint: string): OnchainPoolData | null {
	const availablePools = pools.filter((pool) => {
		const hasInputToken = pool.mintA.address === inputMint || pool.mintB.address === inputMint
		const hasOutputToken = pool.mintA.address === outputMint || pool.mintB.address === outputMint
		return hasInputToken && hasOutputToken
	})

	if (availablePools.length === 0) return null

	// Return the first available pool
	return availablePools[0]
}

/**
 * Hook to get swap quote using onchain pools
 */
export const useSwapQuote = ({
	inputMint,
	outputMint,
	inputAmount,
	slippage = 0.5
}: {
	inputMint: string
	outputMint: string
	inputAmount: string
	slippage?: number
}) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['swap-quote', inputMint, outputMint, inputAmount, slippage],
		queryFn: async (): Promise<SwapQuote | null> => {
			if (!inputAmount || Number(inputAmount) <= 0) return null
			if (inputMint === outputMint) return null

			try {
				// Get all pools from onchain
				const pools = await getAllPoolsFromOnchain(connection)

				// Find the best pool for this token pair
				const bestPool = findBestPool(pools, inputMint, outputMint)
				if (!bestPool) {
					throw new Error('No liquidity pool found for this token pair')
				}

				// Determine which token is A and which is B
				const isInputTokenA = bestPool.mintA.address === inputMint

				const inputReserve = isInputTokenA
					? Number(bestPool.reserveA) / Math.pow(10, bestPool.mintA.decimals)
					: Number(bestPool.reserveB) / Math.pow(10, bestPool.mintB.decimals)
				const outputReserve = isInputTokenA
					? Number(bestPool.reserveB) / Math.pow(10, bestPool.mintB.decimals)
					: Number(bestPool.reserveA) / Math.pow(10, bestPool.mintA.decimals)

				if (inputReserve <= 0 || outputReserve <= 0) {
					throw new Error('Pool has invalid reserves')
				}

				const inputAmountNumber = Number(inputAmount)
				const feeRateDecimal = bestPool.feeRate > 1 ? bestPool.feeRate / 100 : bestPool.feeRate

				const outputAmount = calculateOutputAmount(inputAmountNumber, inputReserve, outputReserve, feeRateDecimal)
				const priceImpact = calculatePriceImpact(inputAmountNumber, inputReserve, outputReserve, feeRateDecimal)

				if (outputAmount <= 0) {
					throw new Error('Cannot calculate valid output amount')
				}

				// Calculate minimum received with slippage
				const slippageMultiplier = 1 - slippage / 100
				const minimumReceived = outputAmount * slippageMultiplier

				// Calculate exchange rate
				const exchangeRate = outputAmount / inputAmountNumber

				return {
					inputAmount: inputAmountNumber,
					outputAmount,
					minimumReceived,
					priceImpact,
					exchangeRate,
					feeRate: bestPool.feeRate,
					poolAddress: bestPool.address
				}
			} catch (error) {
				console.error('Error in swap quote calculation:', error)
				throw error
			}
		},
		enabled: !!inputMint && !!outputMint && !!inputAmount && Number(inputAmount) > 0 && inputMint !== outputMint,
		staleTime: 10000,
		refetchInterval: 15000,
		retry: 2
	})
}

/**
 * Hook for executing swaps through BBAChain liquidity pools
 */
export const useExecuteSwap = () => {
	const { connection } = useConnection()
	const { publicKey, sendTransaction } = useWallet()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: SwapParams) => {
			if (!publicKey) throw new Error('Wallet not connected')

			const { inputMint, outputMint, inputAmount, slippage, poolAddress } = params

			// BBA detection
			const isInputBBA = isNativeBBA(inputMint)
			const isOutputBBA = isNativeBBA(outputMint)
			const isBBASwap = isInputBBA || isOutputBBA

			// Get pool data
			const pools = await getAllPoolsFromOnchain(connection)
			const pool = pools.find((p) => p.address === poolAddress)
			if (!pool) throw new Error('Pool not found')

			// Handle BBA/WBBA mint mapping for pool matching
			const effectiveInputMint = isInputBBA ? NATIVE_MINT.toBase58() : inputMint
			const effectiveOutputMint = isOutputBBA ? NATIVE_MINT.toBase58() : outputMint

			const isInputTokenA = pool.mintA.address === effectiveInputMint
			const inputAmountNumber = Number(inputAmount)
			const inputDecimals = isInputTokenA ? pool.mintA.decimals : pool.mintB.decimals
			const outputDecimals = isInputTokenA ? pool.mintB.decimals : pool.mintA.decimals

			const inputAmountDaltons = Math.floor(inputAmountNumber * Math.pow(10, inputDecimals))

			// Calculate expected output and minimum received
			const inputReserve = isInputTokenA
				? Number(pool.reserveA) / Math.pow(10, pool.mintA.decimals)
				: Number(pool.reserveB) / Math.pow(10, pool.mintB.decimals)
			const outputReserve = isInputTokenA
				? Number(pool.reserveB) / Math.pow(10, pool.mintB.decimals)
				: Number(pool.reserveA) / Math.pow(10, pool.mintA.decimals)

			const feeRateDecimal = pool.feeRate > 1 ? pool.feeRate / 100 : pool.feeRate
			const expectedOutput = calculateOutputAmount(inputAmountNumber, inputReserve, outputReserve, feeRateDecimal)
			const expectedOutputDaltons = Math.floor(expectedOutput * Math.pow(10, outputDecimals))

			const slippageMultiplier = 1 - slippage / 100
			const minimumOutputDaltons = Math.floor(expectedOutputDaltons * slippageMultiplier)

			// Token account preparation
			let userInputTokenAccount: PublicKey
			let userOutputTokenAccount: PublicKey
			let preTxInstructions: any[] = []
			let postTxInstructions: any[] = []

			if (isBBASwap) {
				if (isInputBBA) {
					// BBA → Token: Use WBBA account for input
					const userBBABalance = await connection.getBalance(publicKey)
					const requiredBBA = Math.floor(inputAmountNumber * Math.pow(10, 9)) // BBA has 9 decimals

					if (userBBABalance < requiredBBA) {
						throw new Error(`Insufficient BBA balance. Required: ${inputAmountNumber} BBA`)
					}

					// Use WBBA associated token account
					userInputTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, publicKey)

					// Create WBBA account if it doesn't exist and fund it
					const wbbaAccountInfo = await connection.getAccountInfo(userInputTokenAccount)
					if (!wbbaAccountInfo) {
						const createWBBAIx = createAssociatedTokenAccountInstruction(
							publicKey,
							userInputTokenAccount,
							publicKey,
							NATIVE_MINT
						)
						preTxInstructions.push(createWBBAIx)
					}

					// Transfer BBA and sync
					const transferBBAIx = SystemProgram.transfer({
						fromPubkey: publicKey,
						toPubkey: userInputTokenAccount,
						lamports: requiredBBA
					})
					const syncBBAIx = createSyncNativeInstruction(userInputTokenAccount)
					preTxInstructions.push(transferBBAIx, syncBBAIx)

					// For output, use standard token account
					userOutputTokenAccount = await getAssociatedTokenAddress(new PublicKey(outputMint), publicKey)
				} else if (isOutputBBA) {
					// Token → BBA: Swap to WBBA then unwrap
					userInputTokenAccount = await getAssociatedTokenAddress(new PublicKey(inputMint), publicKey)
					userOutputTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, publicKey)

					// Create WBBA account if it doesn't exist
					const wbbaAccountInfo = await connection.getAccountInfo(userOutputTokenAccount)
					if (!wbbaAccountInfo) {
						const createWBBAIx = createAssociatedTokenAccountInstruction(
							publicKey,
							userOutputTokenAccount,
							publicKey,
							NATIVE_MINT
						)
						preTxInstructions.push(createWBBAIx)
					}

					// Unwrap WBBA to BBA after swap
					const closeWBBAIx = createCloseAccountInstruction(userOutputTokenAccount, publicKey, publicKey)
					postTxInstructions.push(closeWBBAIx)
				}
			} else {
				// Standard token/token swap
				userInputTokenAccount = await getAssociatedTokenAddress(new PublicKey(inputMint), publicKey)
				userOutputTokenAccount = await getAssociatedTokenAddress(new PublicKey(outputMint), publicKey)
			}

			// Get pool info
			const poolInfo = pool.swapData

			// Derive swap authority
			const [swapAuthority] = PublicKey.findProgramAddressSync(
				[new PublicKey(poolAddress).toBuffer()],
				TOKEN_SWAP_PROGRAM_ID
			)

			// Prepare accounts for swap instruction
			const accounts = {
				tokenSwap: new PublicKey(poolAddress),
				authority: swapAuthority,
				userTransferAuthority: publicKey,
				source: userInputTokenAccount,
				swapSource: isInputTokenA ? new PublicKey(poolInfo.tokenAccountA) : new PublicKey(poolInfo.tokenAccountB),
				swapDestination: isInputTokenA ? new PublicKey(poolInfo.tokenAccountB) : new PublicKey(poolInfo.tokenAccountA),
				destination: userOutputTokenAccount,
				poolMint: new PublicKey(poolInfo.tokenPool),
				feeAccount: new PublicKey(poolInfo.feeAccount),
				tokenProgram: TOKEN_PROGRAM_ID,
				swapProgram: TOKEN_SWAP_PROGRAM_ID
			}

			// Create swap instruction
			const swapInstruction = createSwapInstruction(accounts, {
				amountIn: inputAmountDaltons,
				minimumAmountOut: minimumOutputDaltons
			})

			// Build transaction
			const transaction = new Transaction()

			// Add pre-swap instructions
			preTxInstructions.forEach((ix) => transaction.add(ix))

			// Add approve instruction for input token if needed
			if (isBBASwap && isInputBBA) {
				const approveIx = createApproveInstruction(
					userInputTokenAccount,
					publicKey,
					publicKey,
					Math.floor(inputAmountNumber * Math.pow(10, 9))
				)
				transaction.add(approveIx)
			}

			// Add main swap instruction
			transaction.add(swapInstruction)

			// Add post-swap instructions
			postTxInstructions.forEach((ix) => transaction.add(ix))

			// Send transaction
			const signature = await sendTransaction(transaction, connection)

			// Wait for confirmation
			const confirmation = await connection.confirmTransaction(signature, 'confirmed')
			if (confirmation.value.err) {
				throw new Error(`Transaction failed: ${confirmation.value.err}`)
			}

			return {
				signature,
				inputAmount: inputAmountNumber,
				outputAmount: expectedOutput,
				actualOutputAmount: expectedOutput,
				priceImpact: calculatePriceImpact(inputAmountNumber, inputReserve, outputReserve, feeRateDecimal)
			}
		},
		onSuccess: () => {
			// Invalidate relevant queries to refresh balances
			queryClient.invalidateQueries({ queryKey: ['swap-quote'] })
			queryClient.invalidateQueries({ queryKey: ['token-balance'] })
		},
		onError: (error) => {
			console.error('Swap failed:', error)
		}
	})
}
```

### Step 3: Create User Balance Hook

Create `src/hooks/useBalance.ts`:

```typescript
import { useConnection, useWallet } from '@bbachain/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { getAssociatedTokenAddress } from '@bbachain/spl-token'
import { PublicKey } from '@bbachain/web3.js'
import { isNativeBBA } from '../services/tokenService'

export const useTokenBalance = (mintAddress: string) => {
	const { publicKey } = useWallet()
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['token-balance', mintAddress, publicKey?.toBase58()],
		queryFn: async () => {
			if (!publicKey) return 0

			try {
				if (isNativeBBA(mintAddress)) {
					// Get native BBA balance
					const balance = await connection.getBalance(publicKey)
					return balance
				} else {
					// Get SPL token balance
					const mint = new PublicKey(mintAddress)
					const ata = await getAssociatedTokenAddress(mint, publicKey)
					const balanceInfo = await connection.getTokenAccountBalance(ata)
					return Number(balanceInfo.value.amount)
				}
			} catch (error) {
				console.error('Balance fetch error:', error)
				return 0
			}
		},
		enabled: !!mintAddress && !!publicKey,
		staleTime: 30000,
		refetchInterval: 60000
	})
}
```

Create `src/hooks/useTokens.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchTokensFromAPI, searchTokens, getTokenByAddress } from '../services/tokenService'
import { TokenInfo } from '../types/swap'

/**
 * Hook to fetch all available tokens from BBAChain API
 */
export const useTokens = () => {
	return useQuery({
		queryKey: ['tokens'],
		queryFn: fetchTokensFromAPI,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}

/**
 * Hook to search tokens
 */
export const useSearchTokens = (searchQuery: string) => {
	return useQuery({
		queryKey: ['tokens', 'search', searchQuery],
		queryFn: () => searchTokens(searchQuery),
		enabled: !!searchQuery && searchQuery.length > 0,
		staleTime: 2 * 60 * 1000, // 2 minutes
		retry: 1
	})
}

/**
 * Hook to get a specific token by address
 */
export const useToken = (address: string) => {
	return useQuery({
		queryKey: ['token', address],
		queryFn: () => getTokenByAddress(address),
		enabled: !!address,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2
	})
}
```

### Step 4: Additional Hooks

Create `src/hooks/useCanSwap.ts`:

```typescript
import { useConnection } from '@bbachain/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { getAllPoolsFromOnchain } from '../services/poolService'

/**
 * Hook to check if a swap is possible between two tokens
 */
export const useCanSwap = (inputMint: string, outputMint: string) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['can-swap', inputMint, outputMint],
		queryFn: async () => {
			if (!inputMint || !outputMint || inputMint === outputMint) {
				return false
			}

			const pools = await getAllPoolsFromOnchain(connection)
			const availablePool = pools.find((pool) => {
				const hasInputToken = pool.mintA.address === inputMint || pool.mintB.address === inputMint
				const hasOutputToken = pool.mintA.address === outputMint || pool.mintB.address === outputMint
				return hasInputToken && hasOutputToken
			})

			return !!availablePool
		},
		enabled: !!inputMint && !!outputMint && inputMint !== outputMint,
		staleTime: 30000
	})
}
```

Create `src/hooks/useSwapRoute.ts`:

```typescript
import { useConnection } from '@bbachain/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { getAllPoolsFromOnchain, OnchainPoolData } from '../services/poolService'

function findBestPool(pools: OnchainPoolData[], inputMint: string, outputMint: string): OnchainPoolData | null {
	const availablePools = pools.filter((pool) => {
		const hasInputToken = pool.mintA.address === inputMint || pool.mintB.address === inputMint
		const hasOutputToken = pool.mintA.address === outputMint || pool.mintB.address === outputMint
		return hasInputToken && hasOutputToken
	})

	if (availablePools.length === 0) return null
	return availablePools[0]
}

/**
 * Hook to get swap route information
 */
export const useGetSwapRoute = (inputMint: string, outputMint: string) => {
	const { connection } = useConnection()

	return useQuery({
		queryKey: ['swap-route', inputMint, outputMint],
		queryFn: async () => {
			if (!inputMint || !outputMint || inputMint === outputMint) {
				return null
			}

			const pools = await getAllPoolsFromOnchain(connection)
			const directPool = findBestPool(pools, inputMint, outputMint)

			if (directPool) {
				return {
					type: 'direct',
					pools: [directPool],
					route: [inputMint, outputMint],
					totalFeeRate: directPool.feeRate
				}
			}

			// For now, return null if no direct route exists
			// TODO: Implement multi-hop routing for indirect swaps
			return null
		},
		enabled: !!inputMint && !!outputMint && inputMint !== outputMint,
		staleTime: 60000
	})
}
```

## Testing

### 1. Unit Tests

Create `src/__tests__/poolCalculations.test.ts`:

```typescript
import { calculateOutputAmount, calculatePriceImpact } from '../utils/poolCalculations'

describe('Pool Calculations', () => {
	test('calculateOutputAmount should return correct value', () => {
		const inputAmount = 100
		const inputReserve = 1000
		const outputReserve = 2000
		const feeRate = 0.003

		const result = calculateOutputAmount(inputAmount, inputReserve, outputReserve, feeRate)
		expect(result).toBeGreaterThan(0)
		expect(result).toBeLessThan(inputAmount * 2) // Should account for slippage
	})

	test('calculatePriceImpact should return percentage', () => {
		const result = calculatePriceImpact(100, 1000, 2000, 0.003)
		expect(result).toBeGreaterThanOrEqual(0)
		expect(result).toBeLessThanOrEqual(100)
	})
})
```

### 2. Integration Tests

Create a test file for testing the hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSwapQuote, useExecuteSwap } from '../hooks/useSwap'
import { useTokenBalance } from '../hooks/useBalance'
import BBAChainProvider from '../providers/BBAChainProvider'

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<BBAChainProvider>{children}</BBAChainProvider>
		</QueryClientProvider>
	)
}

describe('Swap Hooks', () => {
	test('useSwapQuote returns null for invalid input', async () => {
		const wrapper = createWrapper()
		const { result } = renderHook(
			() =>
				useSwapQuote({
					inputMint: 'tokenA',
					outputMint: 'tokenB',
					inputAmount: '',
					slippage: 0.5
				}),
			{ wrapper }
		)

		await waitFor(() => {
			expect(result.current.data).toBeNull()
		})
	})

	test('useTokenBalance fetches balance correctly', async () => {
		const wrapper = createWrapper()
		const { result } = renderHook(() => useTokenBalance('mock-token-address'), { wrapper })

		await waitFor(() => {
			expect(result.current.data).toBeDefined()
		})
	})
})
```

## Troubleshooting

### Common Issues

1. **"Failed to find account" Error**

   - Ensure the wallet is connected
   - Check if the token account exists
   - Verify the mint address is correct

2. **"Insufficient liquidity" Error**

   - Check if a liquidity pool exists for the token pair
   - Verify pool reserves are sufficient for the swap amount

3. **High Price Impact Warnings**

   - Reduce swap amount
   - Check if there are alternative pools
   - Enable expert mode for high impact swaps

4. **Transaction Timeout**
   - Check network congestion
   - Increase transaction timeout settings
   - Retry with higher priority fees

### Debug Mode

Enable debug logging by adding to your environment:

```env
NEXT_PUBLIC_DEBUG_SWAP=true
```

Then use in your components:

```typescript
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_SWAP === 'true'

if (DEBUG) {
	console.log('Swap parameters:', {
		inputMint,
		outputMint,
		inputAmount,
		slippage
	})
}
```

### Performance Optimization

1. **Query Caching**: Use appropriate staleTime and cacheTime for React Query:

```typescript
// Optimized query configuration
export const QUERY_CONFIG = {
	SWAP_QUOTE: {
		staleTime: 10000, // 10 seconds
		refetchInterval: 15000, // 15 seconds
		retry: 2
	},
	TOKEN_BALANCE: {
		staleTime: 30000, // 30 seconds
		refetchInterval: 60000, // 1 minute
		retry: 1
	},
	POOL_DATA: {
		staleTime: 60000, // 1 minute
		refetchInterval: 300000, // 5 minutes
		retry: 3
	}
}
```

2. **Debounced Inputs**: Implement input debouncing:

```typescript
import { useCallback, useRef } from 'react'

export const useDebounce = (callback: Function, delay: number) => {
	const timeoutRef = useRef<NodeJS.Timeout>()

	return useCallback(
		(...args: any[]) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}

			timeoutRef.current = setTimeout(() => {
				callback(...args)
			}, delay)
		},
		[callback, delay]
	)
}
```

3. **Connection Management**: Optimize connection usage:

```typescript
// Singleton connection manager
class ConnectionManager {
	private static instance: Connection

	static getInstance(): Connection {
		if (!ConnectionManager.instance) {
			ConnectionManager.instance = new Connection(BBACHAIN_CONFIG.RPC_ENDPOINT, 'confirmed')
		}
		return ConnectionManager.instance
	}
}
```

4. **Error Boundaries**: Implement error boundaries:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
	children: ReactNode
}

interface State {
	hasError: boolean
	error?: Error
}

class SwapErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('Swap error:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="error-boundary">
					<h2>Something went wrong with the swap</h2>
					<button onClick={() => this.setState({ hasError: false })}>
						Try again
					</button>
				</div>
			)
		}

		return this.props.children
	}
}
```

## Conclusion

This guide provides a complete foundation for integrating BBAChain's swap functionality at the blockchain client level. The implementation covers:

- **Core blockchain operations**: Pool data fetching, swap quote calculation, and transaction execution
- **Robust hook architecture**: Modular hooks for different aspects of swapping
- **Native BBA handling**: Automatic wrapping/unwrapping for seamless user experience
- **Error handling**: Comprehensive error management and recovery
- **Performance optimization**: Efficient queries and connection management
- **Live token data**: Dynamic token fetching from BBAChain API

### Key Implementation Points

1. **Pool Data Service**: Real-time fetching of onchain liquidity pool data
2. **Swap Execution**: Complete transaction building with BBA wrapping support
3. **Quote Calculation**: Accurate pricing using constant product formula
4. **Balance Management**: Efficient token balance tracking
5. **Route Discovery**: Pool availability and route optimization

### Next Steps

1. Implement the core services and hooks following this guide
2. Test thoroughly with testnet tokens
3. Add monitoring and analytics
4. Implement additional features like multi-hop routing
5. Deploy with proper security measures

For additional support or questions, refer to the BBAChain documentation or community resources.
