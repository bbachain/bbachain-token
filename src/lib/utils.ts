import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function getExplorerAddress(address: string) {
	return `https://explorer.bbachain.com/address/${address}?cluster=testnet`
}

export function shortenAddress(address: string, startLength = 6, endLength = 4): string {
	if (!address || address.length < startLength + endLength) return address
	return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

export const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production'
