import { MintInfo } from '@/features/liquidityPool/types'

const StaticTokens: MintInfo[] = [
	{
		name: 'BBA Coin',
		symbol: 'BBA',
		address: 'BBA1111111111111111111111111111111111111111',
		logoURI: '/bba_logo.svg',
		decimals: 9,
		tags: ['native']
	},
	{
		name: 'Tether USD',
		symbol: 'USDT',
		address: 'GyWmvShQr9QGGYsqpVJtMHsyLAng4QtZRgDmwWvYTMaR',
		logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
		decimals: 6,
		tags: ['stablecoin']
	},
	{
		name: 'Shiba Inu',
		symbol: 'SHIB',
		address: 'LUGhbMWAWsMCmNDRivANNg1adxw2Bgqz6sAm8QYA1Qq',
		logoURI: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
		decimals: 9,
		tags: ['meme']
	}
]

export default StaticTokens
