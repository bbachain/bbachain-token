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
		<main className="min-h-screen w-full bg-main-white">
			<Toaster position="top-right" />
			<div className="flex min-h-screen w-full flex-col justify-between">
				<Navbar />
				<div className="pt-24 md:my-20 my-6 w-full">{children}</div>
				<Footer />
			</div>
			<WalletListDialog />
			<ErrorDialog />
		</main>
	)
}
