import { MintLayout, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@bbachain/spl-token'
import { Metadata } from '@bbachain/spl-token-metadata'
import { Connection, PublicKey } from '@bbachain/web3.js'

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

export const getTokenAccounts2 = async (connection: Connection): Promise<TGetTokenAccountsData[]> => {
	try {
		const [tokenAccounts, token2022Accounts] = await Promise.all([
			connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
				filters: [{ dataSize: MintLayout.span }]
			}),
			connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
				filters: [{ dataSize: MintLayout.span }]
			})
		])

		const tokenAccountsData = [...tokenAccounts, ...token2022Accounts]

		return tokenAccountsData.map((account) => {
			const data = new Uint8Array(
				account.account.data.buffer,
				account.account.data.byteOffset,
				account.account.data.byteLength
			)
			const mintInfo = MintLayout.decode(data)
			const mintAddress = account.pubkey.toBase58()
			const owner = account.pubkey.toBase58()
			const supply = Number(mintInfo.supply)
			const decimals = Number(mintInfo.decimals)

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
