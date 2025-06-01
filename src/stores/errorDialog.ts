import { create } from 'zustand'

import { ErrorDialogStore } from '@/types'

export const useErrorDialog = create<ErrorDialogStore>((set) => ({
	isErrorOpen: false,
	errorContent: { title: '', description: '' },
	openErrorDialog: ({ title, description }) =>
		set({ isErrorOpen: true, errorContent: { title: title, description: description } }),
	closeErrorDialog: () => set({ isErrorOpen: false })
}))
