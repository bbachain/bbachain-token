import { NATIVE_MINT } from '@bbachain/spl-token'
import { PublicKey } from '@bbachain/web3.js'

import { type TExtendedTradeableTokenProps } from '@/features/tokens/types'

export const USDT_MINT = new PublicKey('C5CpKwRY2Q5kPYhx78XimCg2eRT3YUgPFAoocFF7Vgf')

const StaticTradeableTokens: TExtendedTradeableTokenProps[] = [
	{
		name: 'BBA Coin',
		symbol: 'BBA',
		coinGeckoId: 'bbachain',
		address: '',
		logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/34568.png',
		decimals: 9,
		isNative: true,
		tags: ['native']
	},
	{
		name: 'Wrapped BBA',
		symbol: 'WBBA',
		coinGeckoId: 'bbachain',
		address: NATIVE_MINT.toBase58(),
		logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/34568.png',
		decimals: 9,
		isNative: false,
		tags: ['wrapped', 'native']
	},
	{
		name: 'Tether USD',
		symbol: 'USDT',
		coinGeckoId: 'tether',
		address: USDT_MINT.toBase58(),
		logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
		decimals: 6,
		isNative: false,
		tags: ['stablecoin']
	},
	{
		name: 'SLSA',
		symbol: 'SLSA',
		coinGeckoId: '',
		address: '2pCnkCrLZt4BTfsqABJpQCrynZZbtoqYmq86CusP4FbS',
		logoURI: 'https://ipfs.io/ipfs/Qmd5CCuusYMDW7KDaed9x2LyeHesdzfthQg43gUuGgmbPD',
		decimals: 6,
		isNative: false,
		tags: ['meme']
	}
]

export default StaticTradeableTokens
