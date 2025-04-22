import { useState, useEffect } from 'react'
import { create } from 'zustand'

interface WalletListDialogState {
	isDialogOpen: boolean
	openWalletList: () => void
	closeWalletList: () => void
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
