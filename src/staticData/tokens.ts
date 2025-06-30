type StaticTokenProps = {
	id: string
	address: string
	name: string
	symbol: string
	icon: string
}

const StaticTokens: StaticTokenProps[] = [
	{
		name: 'Solana',
		symbol: 'SOL',
		id: 'solana',
		address: 'So11111111111111111111111111111111111111112',
		icon: 'https://assets.coingecko.com/coins/images/4128/small/solana.png'
	},
	{
		name: 'USD Coin',
		symbol: 'USDC',
		id: 'usd-coin',
		address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		icon: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
	},
	{
		name: 'Tether',
		symbol: 'USDT',
		id: 'tether',
		address: 'Es9vMFrzaCERCL1YUMP2bQJZ9ZrEWgBQAojNfE6vT73F',
		icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png'
	},
	{
		name: 'Bonk',
		symbol: 'BONK',
		id: 'bonk',
		address: 'DezXQb5cY5T27NprrKBL45wBuTx2Yr9wJg6Z5ZwD1iLh',
		icon: 'https://coin-images.coingecko.com/coins/images/28600/thumb/bonk.jpg'
	}
]

export default StaticTokens
