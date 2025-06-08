import './globals.css'
import { Roboto } from 'next/font/google'
import { ThemeProvider } from 'next-themes'

import BBAChainProvider from '@/components/providers/BBAChainProvider'
import { ClusterProvider } from '@/components/providers/ClusterProvider'
import ReactQueryProvider from '@/components/providers/QueryProvider'
import UiProvider from '@/components/providers/UiProvider'
import { TooltipProvider } from '@/components/ui/tooltip'

const roboto = Roboto({
	weight: ['100', '300', '400', '500', '700', '900'],
	subsets: ['latin']
})

export const metadata = {
	title: 'Quick Token Generator',
	description:
		'Effortlessly streamline token deployment across BBA network with our adaptable platform, engineered for seamless integration',
	icons: {
		icon: './token-generator-favicon.svg'
	}
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={roboto.className}>
				<ReactQueryProvider>
					<ClusterProvider>
						<BBAChainProvider>
							<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
								<TooltipProvider>
									<UiProvider>{children}</UiProvider>
								</TooltipProvider>
							</ThemeProvider>
						</BBAChainProvider>
					</ClusterProvider>
				</ReactQueryProvider>
			</body>
		</html>
	)
}
