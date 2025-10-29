'use client'

import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { IoMdClose } from 'react-icons/io'
import { IoSunnySharp, IoMoonSharp } from 'react-icons/io5'
import { RxHamburgerMenu } from 'react-icons/rx'

import SelectCluster from '@/components/common/SelectCluster'
import ThemeImage from '@/components/common/ThemeImage'
import CustomWalletButton from '@/components/common/WalletButton'
import { useCluster } from '@/components/providers/ClusterProvider'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger
} from '@/components/ui/drawer'
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger
} from '@/components/ui/navigation-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/isMobile'
import NavMenu from '@/staticData/navbar'

function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme()
	const isDark = resolvedTheme === 'dark'

	return (
		<Button
			aria-label={isDark ? 'dark toggle' : 'white toggle'}
			type="button"
			variant="ghost"
			className="[&_svg]:size-6"
			onClick={() => setTheme(isDark ? 'light' : 'dark')}
			size="icon"
		>
			{isDark ? <IoMoonSharp /> : <IoSunnySharp />}
		</Button>
	)
}

function MobileMenuDrawer() {
	const { clusters, setCluster, cluster } = useCluster()
	const handleSelect = (item: typeof cluster) => setCluster(item)

	return (
		<Drawer direction="right">
			<DrawerTrigger asChild>
				<Button
					aria-label="hamburger button"
					type="button"
					variant="ghost"
					className="[&_svg]:size-6"
					size="icon"
				>
					<RxHamburgerMenu />
				</Button>
			</DrawerTrigger>
			<DrawerContent
				aria-describedby={undefined}
				className="h-screen rounded-none top-0 mt-0 right-0 left-auto w-4/6"
			>
				<DrawerHeader className="p-0 m-0">
					<VisuallyHidden>
						<DrawerTitle>Mobile Menu Title</DrawerTitle>
					</VisuallyHidden>
					<DrawerClose asChild>
						<Button
							aria-label="close button"
							variant="ghost"
							className="absolute right-0 [&_svg]:size-6"
							size="icon"
						>
							<IoMdClose />
						</Button>
					</DrawerClose>
				</DrawerHeader>
				<section className="flex py-5 h-full flex-col justify-between">
					<div className="flex w-full items-start flex-col pt-1.5">
						{NavMenu.map((nav) =>
							nav.subMenu ? (
								<Accordion key={nav.name} type="single" className="w-full" collapsible>
									<AccordionItem value="item-1">
										<AccordionTrigger className="text-sm w-full px-3.5 hover:no-underline font-normal border-b-[1px] border-[#E9E9E9] py-1.5 hover:!text-hover-green text-main-black">
											{nav.name}
										</AccordionTrigger>
										<AccordionContent className="flex w-full items-start flex-col">
											{nav.subMenu.map((subMenu) => (
												<DrawerClose key={subMenu.name} asChild>
													<Link
														className="text-sm w-full px-3.5 font-normal text-dark-grey py-1.5 hover:!text-hover-green"
														href={subMenu.href}
													>
														{subMenu.name}
													</Link>
												</DrawerClose>
											))}
										</AccordionContent>
									</AccordionItem>
								</Accordion>
							) : (
								<DrawerClose key={nav.name} asChild>
									{nav.name === 'Contact' ? (
										<a
											href={nav.href}
											className="text-sm w-full px-3.5 font-normal border-b-[1px] border-[#E9E9E9] py-1.5 hover:!text-hover-green text-main-black"
										>
											{nav.name}
										</a>
									) : (
										<Link
											className="text-sm w-full px-3.5 font-normal border-b-[1px] border-[#E9E9E9] py-1.5 hover:!text-hover-green text-main-black"
											href={nav.href}
										>
											{nav.name}
										</Link>
									)}
								</DrawerClose>
							)
						)}
						<Accordion type="single" className="w-full" collapsible>
							<AccordionItem value="item-1">
								<AccordionTrigger className="text-sm w-full px-3.5 hover:no-underline font-normal border-b-[1px] border-[#E9E9E9] py-1.5 hover:!text-hover-green text-main-black">
									{cluster.name}
								</AccordionTrigger>
								<AccordionContent className="flex w-full items-start flex-col">
									{clusters.map((item) => (
										<DrawerClose key={item.name} asChild>
											<Button
												variant="ghost"
												className="text-sm w-full text-left justify-start px-3.5 font-normal text-dark-grey py-1.5 hover:!text-hover-green"
												onClick={() => handleSelect(item)}
											>
												{item.name}
											</Button>
										</DrawerClose>
									))}
								</AccordionContent>
							</AccordionItem>
						</Accordion>
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

export default function Navbar() {
	const isMobile = useIsMobile()
	const [mounted, setMounted] = useState<boolean>(false)

	useEffect(() => setMounted(true), [])

	return (
		<nav className="2xl:px-24 xl:px-10 md:px-20 py-3.5 h-24 flex items-center justify-between px-4 fixed !bg-main-white z-50 w-full">
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
				<NavigationMenu className="xl:flex hidden">
					<NavigationMenuList className="xl:flex space-x-9 items-center hidden">
						{NavMenu.map((nav) =>
							nav.subMenu ? (
								<NavigationMenuItem className="relative" key={nav.name}>
									<NavigationMenuTrigger className="text-sm w-full p-0 hover:!bg-transparent font-normal hover:!text-hover-green text-main-black">
										{nav.name}
									</NavigationMenuTrigger>
									<NavigationMenuContent className="top-full absolute -left-6">
										<ul className="bg-background shadow-xl data-[motion=from-start]:slide-in-from-left-80 flex flex-col w-[230px] p-3">
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
					<span className="xl:block hidden">
						<SelectCluster />
					</span>
					<span className="xl:hidden block">
						<MobileMenuDrawer />
					</span>
					<span className="xl:block hidden">
						<ThemeToggle />
					</span>
				</div>
			)}
		</nav>
	)
}
