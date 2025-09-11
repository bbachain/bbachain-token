export type TSuccessMessage = {
	message: string
}

export type ErrorContentProps = {
	title: string
	description: string | JSX.Element
}

export type ErrorDialogStore = {
	isErrorOpen: boolean
	errorContent: ErrorContentProps
	openErrorDialog: ({ title, description }: ErrorContentProps) => void
	closeErrorDialog: () => void
}

export type TGetTokenAccountsData = {
	pubKey: string
	mintAddress: string
	ownerAddress: string
	supply: number
	decimals: number
}
