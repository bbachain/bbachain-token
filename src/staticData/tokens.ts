import { MintInfo } from '@/features/liquidityPool/types'

const StaticTokens: MintInfo[] = [
	{
		name: 'BBAChain',
		symbol: 'BBA',
		address: 'BBA1111111111111111111111111111111111111111',
		logoURI: './bba_logo.svg',
		decimals: 9
	},
	{
		name: 'Tether',
		symbol: 'USDT',
		address: 'C5CpKwRY2Q5kPYhx78XimCg2eRT3YUgPFAoocFF7Vgf',
		logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
		decimals: 6
	},
	{
		name: 'Monkey',
		symbol: 'MNK',
		address: 'HBKVxLv7RqcBqxCy3ei6no3Ctz9WGanYfh9K5kfrPDoi',
		logoURI: '',
		decimals: 0
	}
]

export default StaticTokens
