const PINATA_ERROR_MESSAGE = {
	MISSING_CREDENTIALS: 'Missing Pinata API credentials',
	FILE_UPLOAD_FAIL: 'Failed to upload file to Pinata',
	JSON_UPLOAD_FAIL: 'Failed to upload JSON to Pinata'
} as const

const ERROR = {
	PINATA: PINATA_ERROR_MESSAGE
} as const

export default ERROR
