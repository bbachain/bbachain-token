import { create } from 'zustand'

import { type TWalletListDialogStore } from '@/types/wallet'

export const useWalletListDialog = create<TWalletListDialogStore>((set) => ({
	isDialogOpen: false,
	openWalletList: () => set({ isDialogOpen: true }),
	closeWalletList: () => set({ isDialogOpen: false })
}))
