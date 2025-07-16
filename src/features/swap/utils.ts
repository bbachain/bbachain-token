import { CoinGeckoTokenIds } from '@/staticData/tokens'

export function getCoinGeckoTokenId(symbol: string): string | undefined {
	return CoinGeckoTokenIds[symbol.toUpperCase()]
}
