'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useIsMobile, useWalletListDialog } from '@/lib/hooks'
import ThemeImage from './theme-image'
import { Skeleton } from '../ui/skeleton'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer'
import { Button } from '../ui/button'
import { ClusterUiSelect } from '../cluster/cluster-ui'
import { RxHamburgerMenu } from 'react-icons/rx'
import { IoMdClose } from 'react-icons/io'
import { CiWallet } from 'react-icons/ci'
import { IoSunnySharp, IoMoonSharp } from 'react-icons/io5'
import { NavMenu } from '@/lib/static'
import { useWallet } from '@bbachain/wallet-adapter-react'
import Image from 'next/image'
import { copyToClipboard } from './copy'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { useGetBalance } from '../account/account-data-access'
import { PublicKey } from '@bbachain/web3.js'
import { BalanceComponent } from '../account/account-ui'
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle
} from '../ui/navigation-menu'
import { ChevronRight } from 'lucide-react'

function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme()

	return (
		<Button
			type="button"
			variant="ghost"
			className="[&_svg]:size-6"
			onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
			size="icon"
		>
			{resolvedTheme === 'dark' ? <IoMoonSharp /> : <IoSunnySharp />}
		</Button>
	)
}

function MobileMenuDrawer() {
	return (
		<Drawer direction="right">
			<DrawerTrigger asChild>
				<Button type="button" variant="ghost" className="[&_svg]:size-6" size="icon">
					<RxHamburgerMenu />
				</Button>
			</DrawerTrigger>
			<DrawerContent aria-describedby={undefined} className="h-screen rounded-none top-0 mt-0 right-0 left-auto w-4/6">
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
							<DrawerClose key={nav.name} asChild>
								<Link
									className="text-sm w-full px-3.5 font-normal border-b-[1px] border-[#E9E9E9] py-1.5 hover:!text-hover-green text-main-black"
									href={nav.href}
								>
									{nav.name}
								</Link>
							</DrawerClose>
						))}
					</div>
					<div className="flex flex-col space-y-2 pt-1.5 pb-4 border-b-2 border-main-black items-center justify-center">
						<ThemeToggle />
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

function BalanceValue({ address }: { address: string }) {
	const balance = useGetBalance({ address: new PublicKey(address) })
	return (
		<div className="bg-light-green px-[5px] rounded-[6px]">
			<h4 className="text-[#333333] text-sm">
				{balance.data ? <BalanceComponent balance={balance.data} /> : '...'} BBA
			</h4>
		</div>
	)
}

function CustomWalletButton() {
	const { publicKey, wallet, connected, disconnect } = useWallet()
	const { openWalletList } = useWalletListDialog()
	const isMobile = useIsMobile()
	const [isCopied, setIsCopied] = useState<boolean>(false)

	const selectedWalletAddress = publicKey?.toBase58()
	const selectedWalletIcon = wallet?.adapter?.icon
	const selectedWalletName = wallet?.adapter?.name

	const handleCopyClick = async (value: string) => {
		await copyToClipboard(value)
		setIsCopied(true)
	}

	useEffect(() => {
		if (isCopied) {
			const timer = setTimeout(() => {
				setIsCopied(false)
			}, 2000)
			return () => clearTimeout(timer)
		}
	}, [isCopied])

	if (connected && selectedWalletAddress) {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						className="flex bg-[#E9E9E9] dark:bg-[#343434] w-full md:px-2.5 px-1 hover:bg-light-grey space-x-2 rounded-[10px] items-center"
					>
						<BalanceValue address={selectedWalletAddress} />
						{selectedWalletIcon && !isMobile && (
							<Image src={selectedWalletIcon} width={18} height={18} alt={`${selectedWalletName} logo`} />
						)}
						<h4 className="text-main-black text-sm">{`${selectedWalletAddress.slice(0, 6)}...`}</h4>
					</Button>
				</PopoverTrigger>

				<PopoverContent className="w-48 flex flex-col gap-1 p-2">
					<Button
						variant="ghost"
						className="justify-start text-sm"
						onClick={() => handleCopyClick(selectedWalletAddress)}
					>
						{isCopied ? 'Copied' : 'Copy Address'}
					</Button>
					<Button variant="ghost" className="justify-start text-sm" onClick={openWalletList}>
						Change Wallet
					</Button>
					<Button variant="ghost" className="justify-start text-sm" onClick={disconnect}>
						Disconnect
					</Button>
				</PopoverContent>
			</Popover>
		)
	}
	return (
		<Button
			type="button"
			onClick={openWalletList}
			className="bg-main-green hover:bg-hover-green  w-[124px] text-main-white  px-2.5 py-2 rounded-[10px] text-sm font-normal"
		>
			<CiWallet width={18} height={18} />
			Connect
		</Button>
	)
}

export default function Navbar() {
	const isMobile = useIsMobile()
	const [mounted, setMounted] = useState<boolean>(false)

	useEffect(() => setMounted(true), [])

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
				<NavigationMenu className="lg:flex hidden">
					<NavigationMenuList className="lg:flex space-x-9 items-center hidden">
						{NavMenu.map((nav) =>
							nav.subMenu ? (
								<NavigationMenuItem key={nav.name}>
									<NavigationMenuTrigger className="text-sm w-full p-0 hover:!bg-transparent font-normal hover:!text-hover-green text-main-black">
										{nav.name}
									</NavigationMenuTrigger>
									<NavigationMenuContent className='absolute top-full left-44 bg-background shadow-xl data-[motion=from-start]:slide-in-from-left-80'>
										<ul className="flex flex-col w-[230px] p-3">
											{nav.subMenu.map((subNav) => (
												<Link
													className="flex px-3 py-2.5 justify-between text-sm font-normal hover:!text-hover-green text-main-black"
													key={subNav.name}
													href={subNav.href}
												>
													{subNav.name}
													<ChevronRight />
												</Link>
											))}
										</ul>
									</NavigationMenuContent>
								</NavigationMenuItem>
							) : (
								<NavigationMenuItem
									className="text-sm font-normal hover:!text-hover-green text-main-black"
									key={nav.name}
								>
									<Link href={nav.href} legacyBehavior passHref>
										<NavigationMenuLink>{nav.name}</NavigationMenuLink>
									</Link>
								</NavigationMenuItem>
							)
						)}
					</NavigationMenuList>
				</NavigationMenu>
			</div>
			{!mounted ? (
				<Skeleton className="h-[31px] w-32" />
			) : (
				<div className="flex items-center space-x-1.5 md:space-x-4 lg:space-x-9 ">
					<CustomWalletButton />
					<span className="lg:block hidden">
						<ClusterUiSelect />
					</span>
					<span className="lg:hidden block">
						<MobileMenuDrawer />
					</span>
					<span className="lg:block hidden">
						<ThemeToggle />
					</span>
				</div>
			)}
		</nav>
	)
}
