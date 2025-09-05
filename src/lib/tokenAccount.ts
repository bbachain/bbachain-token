import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@bbachain/spl-token'
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
