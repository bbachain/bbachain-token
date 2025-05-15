const GLOBAL_SERVICE_KEY = {
	GET_BALANCE: 'get-balance',
	GET_SIGNATURES: 'get-signatures',
	GET_TOKEN_ACCOUNTS: 'get-token-accounts',
	TRANSFER_BBA: 'transfer-bba',
	REQUEST_AIRDROP: 'request-airdrop'
} as const

const TOKEN_SERVICE_KEY = {
	CREATE_TOKEN: 'create-token',
	GET_TOKEN: 'get-token',
	GET_TOKEN_DETAIL: 'get-token-detail',
	UPDATE_METADATA: 'update-metadata',
	REVOKE_AUTHORITY: 'revoke-authority',
	LOCK_METADATA: 'lock-metadata'
} as const

const NFT_SERVICE_KEY = {
	CREATE_NFT: 'create-nft',
	CREATE_COLLECTION: 'create-collection',
	GET_NFT: 'get-nft',
	GET_COLLECTION: 'get-collection',
	GET_NFT_DETAIL: 'get-nft-detail'
} as const

const SERVICES_KEY = {
	GLOBAL: GLOBAL_SERVICE_KEY,
	TOKEN: TOKEN_SERVICE_KEY,
	NFT: NFT_SERVICE_KEY
} as const

export default SERVICES_KEY
