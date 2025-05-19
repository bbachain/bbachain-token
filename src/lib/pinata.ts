import axios from 'axios'
import ERROR from '@/constants/error'
import ENDPOINTS from '@/constants/endpoint'
import type { UploadToMetadataPayload } from '@/types/request.types'

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
