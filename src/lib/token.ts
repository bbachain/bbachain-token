import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@bbachain/spl-token'
import { BBA_DALTON_UNIT, Connection, PublicKey } from '@bbachain/web3.js'

import { TTradeableTokenProps } from '@/features/tokens/types'
import StaticTradeableTokens from '@/staticData/tokens'
import { TGetTokenAccountsData } from '@/types'

export const getTokenAccounts = async (
	connection: Connection,
	ownerAddress: PublicKey
): Promise<TGetTokenAccountsData[]> => {
	try {
		const [tokenAccounts, token2022Accounts] = await Promise.all([
			connection.getParsedTokenAccountsByOwner(ownerAddress, {
				programId: TOKEN_PROGRAM_ID
			}),
			connection.getParsedTokenAccountsByOwner(ownerAddress, {
				programId: TOKEN_2022_PROGRAM_ID
			})
		])

		const tokenAccountsData = [...tokenAccounts.value, ...token2022Accounts.value]

		return tokenAccountsData.map((account) => {
			const parsedInfo = account.account.data.parsed.info
			const mintAddress = parsedInfo.mint as string
			const owner = parsedInfo.owner as string
			const supply = parsedInfo.tokenAmount.uiAmount as number
			const decimals = parsedInfo.tokenAmount.decimals as number

			console.log({
				pubKey: account.pubkey.toBase58(),
				mintAddress,
				ownerAddress: owner,
				supply,
				decimals
			})

			return {
				pubKey: account.pubkey.toBase58(),
				mintAddress,
				ownerAddress: owner,
				supply,
				decimals
			}
		})
	} catch (error) {
		console.error('Error fetching token accounts:', error)
		throw new Error('Error fetching token accounts')
	}
}

const TradeableTokenRegistry = new Map<string, TTradeableTokenProps>()
StaticTradeableTokens.forEach((token) => {
	TradeableTokenRegistry.set(token.address, token)
})

export function getTradeableTokenByAddress(address: string): TTradeableTokenProps | null {
	return TradeableTokenRegistry.get(address) || null
}

export function getKnownTokenAddresses(): string[] {
	return Array.from(TradeableTokenRegistry.keys())
}

export function isKnownTradeableToken(address: string): boolean {
	return TradeableTokenRegistry.has(address)
}

export function isNativeBBA(address: string): boolean {
	return address === NATIVE_MINT.toBase58()
}

export function isBBAToken(address: string): boolean {
	const token = getTradeableTokenByAddress(address)
	return token?.symbol === 'BBA' || isNativeBBA(address)
}

export function getNativeBBAToken(): TTradeableTokenProps {
	return StaticTradeableTokens[0] // First token is always BBA
}

export function getBBAFromDaltons(daltons: number): number {
	return daltons / BBA_DALTON_UNIT
}

export function getDaltonsFromBBA(bbaAmount: number): number {
	return Math.floor(bbaAmount * BBA_DALTON_UNIT)
}

/**
 * Format token balance from daltons to human-readable format
 * @param balance - Balance in daltons (smallest unit)
 * @param decimals - Number of decimals for the token
 * @returns Formatted balance as number
 */
export function formatTokenBalance(balance: number, decimals: number): number {
	if (!balance || !decimals) return 0
	return balance / Math.pow(10, decimals)
}

/**
 * Format token amount to daltons
 * @param amount - Amount in human-readable format
 * @param decimals - Number of decimals for the token
 * @returns Amount in daltons
 */
export function formatTokenToDaltons(amount: number, decimals: number): number {
	if (!amount || !decimals) return 0
	return amount * Math.pow(10, decimals)
}

export function getCoinGeckoId(address: string) {
	const coinGeckoId = StaticTradeableTokens.find((token) => address === token.address)?.coinGeckoId
	return coinGeckoId
}
