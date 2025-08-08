import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Format token balance from daltons to human-readable format
 * @param balance - Balance in daltons (smallest unit)
 * @param decimals - Number of decimals for the token
 * @returns Formatted balance as number
 */
export function formatTokenBalance(balance: number, decimals: number): number {
	if (!balance || !decimals) return 0
	return balance / Math.pow(10, decimals)
}

/**
 * Format token amount to daltons
 * @param amount - Amount in human-readable format
 * @param decimals - Number of decimals for the token
 * @returns Amount in daltons
 */
export function formatTokenToDaltons(amount: number, decimals: number): number {
	if (!amount || !decimals) return 0
	return amount * Math.pow(10, decimals)
}

/**
 * Format balance for display with proper number formatting
 * @param balance - Balance in daltons
 * @param decimals - Number of decimals for the token
 * @param maxDecimals - Maximum decimals to show in display (default: 6)
 * @returns Formatted balance string
 */
export function formatBalanceDisplay(balance: number, decimals: number, maxDecimals: number = 6): string {
	const formatted = formatTokenBalance(balance, decimals)
	return formatted.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: maxDecimals
	})
}

export const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';