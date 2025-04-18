import './globals.css'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { BBAChainProvider } from '@/components/contexts/bbachain-provider'
import { UiLayout } from '@/components/common/ui-layout'
import { ReactQueryProvider } from './react-query-provider'
import { ThemeProvider } from 'next-themes'
import { Roboto } from 'next/font/google'

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
								<UiLayout>{children}</UiLayout>
							</ThemeProvider>
						</BBAChainProvider>
					</ClusterProvider>
				</ReactQueryProvider>
			</body>
		</html>
	)
}
