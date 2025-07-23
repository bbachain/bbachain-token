import { NextRequest, NextResponse } from 'next/server'

import StaticTokens, { ExtendedMintInfo } from '@/staticData/tokens'
import { TSuccessMessage } from '@/types'

export type TGetTokensResponse = TSuccessMessage & {
	data: ExtendedMintInfo[]
}

/**
 * GET /api/tokens
 * Returns the list of available tokens for swap and liquidity pool creation
 */
export async function GET(request: NextRequest): Promise<NextResponse<TGetTokensResponse>> {
	try {
		// Get search query parameter for filtering
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')?.toLowerCase()
		const includeAddress = searchParams.get('includeAddress') === 'true'

		let tokens = [...StaticTokens]

		// Filter tokens if search parameter is provided
		if (search) {
			tokens = tokens.filter(
				(token) =>
					token.name.toLowerCase().includes(search) ||
					token.symbol.toLowerCase().includes(search) ||
					(includeAddress && token.address.toLowerCase().includes(search))
			)
		}

		// Sort tokens by symbol for consistent ordering
		tokens.sort((a, b) => a.symbol.localeCompare(b.symbol))

		return NextResponse.json(
			{
				message: `Successfully retrieved ${tokens.length} tokens`,
				data: tokens
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error fetching tokens:', error)
		return NextResponse.json(
			{
				message: 'Failed to fetch tokens',
				data: []
			},
			{ status: 500 }
		)
	}
}

/**
 * GET /api/tokens/[address]
 * Returns details for a specific token by address
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const body = await request.json()
		const { addresses } = body

		if (!Array.isArray(addresses)) {
			return NextResponse.json(
				{
					message: 'Addresses must be an array',
					data: []
				},
				{ status: 400 }
			)
		}

		const tokens = StaticTokens.filter((token) => addresses.includes(token.address))

		return NextResponse.json(
			{
				message: `Successfully retrieved ${tokens.length} tokens`,
				data: tokens
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error fetching specific tokens:', error)
		return NextResponse.json(
			{
				message: 'Failed to fetch specific tokens',
				data: []
			},
			{ status: 500 }
		)
	}
}
