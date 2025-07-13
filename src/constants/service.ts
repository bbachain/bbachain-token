const GLOBAL_SERVICE_KEY = {
	GET_SIGNATURES: 'get-signatures',
	GET_TOKEN_ACCOUNTS: 'get-token-accounts'
} as const

const WALLET_SERVICE_KEY = {
	GET_BALANCE: 'get-balance',
	TRANSFER_BBA: 'transfer-bba',
	REQUEST_AIRDROP: 'request-airdrop'
} as const

const TOKEN_SERVICE_KEY = {
	CREATE_TOKEN: 'create-token',
	GET_TOKEN: 'get-token',
	GET_TOKEN_DETAIL: 'get-token-detail',
	UPDATE_TOKEN_METADATA: 'update-token-metadata',
	REVOKE_FREEZE: 'revoke-freeze',
	REVOKE_MINT: 'revoke-mint',
	LOCK_METADATA: 'lock-metadata',
	BURN_TOKEN_SUPPLY: 'burn-token-supply',
	MINT_TOKEN_SUPPLY: 'mint-token-supply'
} as const

const NFT_SERVICE_KEY = {
	CREATE_NFT: 'create-nft',
	GET_NFT: 'get-nft',
	GET_NFT_DETAIL: 'get-nft-detail',
	CREATE_COLLECTION: 'create-collection',
	GET_COLLECTION: 'get-collection',
	VALIDATE_METADATA_OFFCHAIN: 'validate-metadata-offchain'
} as const

const SWAP_SERVICE_KEY = {
	GET_SWAPPABLE_TOKEN: 'get-swappable-token',
	GET_TOKEN_PRICE: 'get-token-price',
	GET_USER_BALANCE_BY_MINT: 'get-user-balance-by-mint',
	GET_SWAP_TRANSACTION: 'get-swap-transaction'
} as const

const POOL_SERVICE_KEY = {
	GET_POOLS: 'get-pools',
	CREATE_POOL: 'create-pool',
	GET_POOL_BY_ID: 'get-pool-by-id',
	GET_POOL_BY_MINT: 'get-pool-by-mint',
	GET_POOL_STATS: 'get-pool-stats',
	// Enhanced services
	CREATE_ENHANCED_POOL: 'create-enhanced-pool',
	GET_ENHANCED_BBA_BALANCE: 'get-enhanced-bba-balance',
	GET_ENHANCED_POOL_AVAILABILITY: 'get-enhanced-pool-availability',
	GET_ENHANCED_TRADING_PAIRS: 'get-enhanced-trading-pairs'
} as const

const SERVICES_KEY = {
	GLOBAL: GLOBAL_SERVICE_KEY,
	WALLET: WALLET_SERVICE_KEY,
	TOKEN: TOKEN_SERVICE_KEY,
	NFT: NFT_SERVICE_KEY,
	SWAP: SWAP_SERVICE_KEY,
	POOL: POOL_SERVICE_KEY
} as const

export default SERVICES_KEY
