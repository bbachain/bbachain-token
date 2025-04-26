import { UploadToMetadataPayload } from './types'

export const uploadIconToPinata = async (file: File) => {
	const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY
	const pinataSecret = process.env.NEXT_PUBLIC_PINATA_API_SECRET

	const formData = new FormData()
	formData.append('file', file)

	if (!pinataApiKey || !pinataSecret) {
		throw new Error('Missing Pinata API credentials')
	}

	const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
		method: 'POST',
		body: formData,
		headers: {
			pinata_api_key: pinataApiKey,
			pinata_secret_api_key: pinataSecret
		}
	})

	if (!response.ok) throw new Error('Failed to upload file to Pinata')

	const data = await response.json()
	return `https://ipfs.io/ipfs/${data.IpfsHash}`
}

export const uploadMetadataToPinata = async (payload: UploadToMetadataPayload, imageUri: string) => {
	const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY
	const pinataSecret = process.env.NEXT_PUBLIC_PINATA_API_SECRET

	const metadata = {
		name: payload.token_name,
		symbol: payload.token_symbol,
		description: payload.description,
		image: imageUri,
		decimals: payload.custom_decimals,
		supply: payload.token_supply,
		revoke_freeze: payload.revoke_freeze,
		revoke_mint: payload.revoke_mint,
		immutable_metadata: payload.immutable_metadata
	}

	if (!pinataApiKey || !pinataSecret) {
		throw new Error('Missing Pinata API credentials')
	}

	const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			pinata_api_key: pinataApiKey,
			pinata_secret_api_key: pinataSecret
		},
		body: JSON.stringify(metadata)
	})

	if (!response.ok) throw new Error('Failed to upload JSON to Pinata')

	const data = await response.json()
	return `https://ipfs.io/ipfs/${data.IpfsHash}`
}
