import { useState, useEffect } from 'react'
import { create } from 'zustand'

type WalletListDialogState = {
	isDialogOpen: boolean
	openWalletList: () => void
	closeWalletList: () => void
}

type ErrorContentProps = {
	title: string
	description: string
}

type ErrorDialogState = {
	isErrorOpen: boolean
	errorContent: ErrorContentProps
	openErrorDialog: ({ title, description }: ErrorContentProps) => void
	closeErrorDialog: () => void
}

export const useIsMobile = () => {
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const updateIsMobile = () => {
			if (typeof window !== 'undefined') {
				const isMobileQuery = window.matchMedia('(max-width: 500px)')
				setIsMobile(isMobileQuery.matches)
			}
		}

		updateIsMobile()
		window.addEventListener('resize', updateIsMobile)

		return () => window.removeEventListener('resize', updateIsMobile)
	}, [])

	return isMobile
}

export const useWalletListDialog = create<WalletListDialogState>((set) => ({
	isDialogOpen: false,
	openWalletList: () => set({ isDialogOpen: true }),
	closeWalletList: () => set({ isDialogOpen: false })
}))

export const useErrorDialog = create<ErrorDialogState>((set) => ({
	isErrorOpen: false,
	errorContent: { title: '', description: '' },
	openErrorDialog: ({ title, description }) =>
		set({ isErrorOpen: true, errorContent: { title: title, description: description } }),
	closeErrorDialog: () => set({ isErrorOpen: false })
}))
