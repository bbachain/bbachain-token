'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useIsMobile } from '@/lib/hooks'
import ThemeImage from './theme-image'
import { Skeleton } from '../ui/skeleton'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { WalletButton } from '../contexts/bbachain-provider'
import { ClusterUiSelect } from '../cluster/cluster-ui'
import { RxHamburgerMenu } from 'react-icons/rx'
import { IoMdClose } from 'react-icons/io'
import { NavMenu } from '@/lib/static'

function ThemeSwitch() {
	const [mounted, setMounted] = useState<boolean>(false)
	const { resolvedTheme, setTheme } = useTheme()

	useEffect(() => setMounted(true), [])

	if (!mounted) {
		return <Skeleton className="h-[31px] w-16" />
	}

	return (
		<Switch
			classNames={{
				root: 'w-16 h-[31px]',
				thumb: 'data-[state=checked]:translate-x-8 w-7 h-7 dark:bg-main-green'
			}}
			checked={resolvedTheme === 'dark'}
			onCheckedChange={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
		/>
	)
}

function MobileMenuDrawer() {
	return (
		<Drawer direction="right">
			<DrawerTrigger asChild>
				<Button variant="ghost" className="[&_svg]:size-6" size="icon">
					<RxHamburgerMenu />
				</Button>
			</DrawerTrigger>
			<DrawerContent className="h-screen top-0 mt-0 right-0 left-auto w-4/6">
				<DrawerHeader className="p-0 m-0">
					<DrawerTitle></DrawerTitle>
					<DrawerClose asChild>
						<Button variant="ghost" className="absolute right-0 [&_svg]:size-6" size="icon">
							<IoMdClose />
						</Button>
					</DrawerClose>
				</DrawerHeader>
				<section className="flex py-5 h-full flex-col justify-between">
					<div className="flex w-full items-start flex-col pt-1.5">
						{NavMenu.map((nav) => (
							<Link
								key={nav.name}
								className="text-sm w-full px-3.5 font-normal border-b-[1px] border-[#E9E9E9] py-1.5 hover:!text-hover-green text-main-black"
								href={nav.href}
							>
								{nav.name}
							</Link>
						))}
					</div>
					<div className="flex flex-col space-y-2 pt-1.5 pb-4 border-b-2 border-main-black items-center justify-center">
						<ThemeSwitch />
						<Link href="/">
							<ThemeImage
								lightSrc={`/quick-token-logo-light.svg`}
								darkSrc={`/quick-token-logo-dark.svg`}
								width={95}
								height={31}
								alt="Quick Token Logo"
							/>
						</Link>
					</div>
				</section>
			</DrawerContent>
		</Drawer>
	)
}

export default function Navbar() {
	const isMobile = useIsMobile()

	return (
		<nav className="lg:px-24 md:px-20 py-3.5  flex items-center justify-between px-4 fixed !bg-main-white z-50 w-full">
			<div className="flex items-center md:space-x-5 lg:space-x-[35px]">
				<Link href="/">
					<ThemeImage
						lightSrc={`/quick-token-logo-light.svg`}
						darkSrc={`/quick-token-logo-dark.svg`}
						width={isMobile ? 95 : 175}
						height={isMobile ? 31 : 57}
						alt="Quick Token Logo"
					/>
				</Link>
				<section className="lg:flex space-x-9 items-center hidden">
					{NavMenu.map((nav) => (
						<Link
							key={nav.name}
							className="text-sm font-normal hover:!text-hover-green text-main-black"
							href={nav.href}
						>
							{nav.name}
						</Link>
					))}
				</section>
			</div>
			<div className="flex items-center space-x-1.5 md:space-x-4 lg:space-x-9 ">
				<WalletButton />
				<span className="lg:block hidden">
					<ClusterUiSelect />
				</span>
				<span className="lg:hidden block">
					<MobileMenuDrawer />
				</span>
				<span className="lg:block hidden">
					<ThemeSwitch />
				</span>
			</div>
		</nav>
	)
}
