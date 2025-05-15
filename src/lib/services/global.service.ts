import axios from 'axios'
import ERROR from '@/lib/constant/error.constant'
import ENDPOINTS from '@/lib/constant/endpoint.constant'
import type { UploadToMetadataPayload } from '@/lib/types/request.types'
import { Connection, PublicKey } from '@bbachain/web3.js'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@bbachain/spl-token'
import { TGetTokenAccount } from '../types/response.types'

export const uploadIconToPinata = async (file: File): Promise<string> => {
	const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY
	const pinataSecret = process.env.NEXT_PUBLIC_PINATA_API_SECRET

	if (!pinataApiKey || !pinataSecret) {
		throw new Error(ERROR.PINATA.MISSING_CREDENTIALS)
	}

	const formData = new FormData()
	formData.append('file', file)

	try {
		const response = await axios.post(ENDPOINTS.PINATA.UPLOAD_FILE, formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
				pinata_api_key: pinataApiKey,
				pinata_secret_api_key: pinataSecret
			}
		})

		return ENDPOINTS.IPFS_BASE + '/' + response.data.IpfsHash
	} catch (error) {
		console.error(`${ERROR.PINATA.FILE_UPLOAD_FAIL}:`, error)
		throw new Error(ERROR.PINATA.FILE_UPLOAD_FAIL)
	}
}

export const uploadMetadataToPinata = async (payload: UploadToMetadataPayload): Promise<string> => {
	const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY
	const pinataSecret = process.env.NEXT_PUBLIC_PINATA_API_SECRET

	if (!pinataApiKey || !pinataSecret) {
		throw new Error(ERROR.PINATA.MISSING_CREDENTIALS)
	}

	try {
		const response = await axios.post(ENDPOINTS.PINATA.UPLOAD_JSON, payload, {
			headers: {
				'Content-Type': 'application/json',
				pinata_api_key: pinataApiKey,
				pinata_secret_api_key: pinataSecret
			}
		})

		return ENDPOINTS.IPFS_BASE + '/' + response.data.IpfsHash
	} catch (error) {
		console.error(`${ERROR.PINATA.JSON_UPLOAD_FAIL}:`, error)
		throw new Error(ERROR.PINATA.JSON_UPLOAD_FAIL)
	}
}

export const gGetetTokenAccounts = async (
	connection: Connection,
	ownerAddress: PublicKey
): Promise<TGetTokenAccount[]> => {
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
