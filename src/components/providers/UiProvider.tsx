'use client'

import * as React from 'react'
import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'

import ErrorDialog from '@/components/common/ErrorDialog'
import WalletListDialog from '@/components/common/WalletDialog'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'

export default function UiProvider({ children }: { children: ReactNode }) {
	return (
		<main className="min-h-screen w-full h-full">
			<Toaster position="top-right" />
			<div className="flex min-h-screen bg-main-white  w-full flex-col justify-between">
				<Navbar />
				{children}
				<Footer />
			</div>
			<WalletListDialog />
			<ErrorDialog />
		</main>
	)
}
