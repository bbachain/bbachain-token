import StaticTokens from '@/staticData/tokens'

export function getCoinGeckoId(address: string) {
	const coinGeckoId = StaticTokens.find((token) => address === token.address)?.coinGeckoId
	return coinGeckoId
}
