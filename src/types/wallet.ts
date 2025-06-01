export type TRequestAirdropPayload = {
	amount: number
}

export type TWalletListDialogStore = {
	isDialogOpen: boolean
	openWalletList: () => void
	closeWalletList: () => void
}
