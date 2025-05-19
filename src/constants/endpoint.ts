const PINATA_API_BASE_ENDPOINT = 'https://api.pinata.cloud'
const IPFS_BASE_ENDPOINT = 'https://ipfs.io/ipfs'

const PINATA_ENDPOINTS = {
	UPLOAD_FILE: PINATA_API_BASE_ENDPOINT + '/pinning/pinFileToIPFS',
	UPLOAD_JSON: PINATA_API_BASE_ENDPOINT + '/pinning/pinJSONToIPFS'
} as const

const ENDPOINTS = {
	PINATA: PINATA_ENDPOINTS,
	IPFS_BASE: IPFS_BASE_ENDPOINT
} as const

export default ENDPOINTS
