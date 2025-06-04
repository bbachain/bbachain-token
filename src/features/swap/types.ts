export type TTokenProps = {
	address: string
	name: string
	symbol: string
	icon: string
	balance: number
}

export type TSwapItem = {
	type: 'from' | 'to'
	tokenProps: TTokenProps
	inputAmount: string
}
