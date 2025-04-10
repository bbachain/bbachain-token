'use client'

import { Navbar as FlowbiteNavbar } from 'flowbite-react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useIsMobile } from '@/lib/hooks'
import ThemeImage from './theme-image'
import { Skeleton } from './skeleton'
import { Switch } from './switch'
import { WalletButton } from '../contexts/bbachain-provider'

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

export default function Navbar() {
	const isMobile = useIsMobile()

	return (
		<FlowbiteNavbar className="lg:px-24 md:px-12 px-4 fixed !bg-main-white z-50 w-full" fluid rounded>
			<div className="flex items-center space-x-[35px]">
				<FlowbiteNavbar.Brand href="/">
					<ThemeImage
						lightSrc={`/quick-token-logo-light.svg`}
						darkSrc={`/quick-token-logo-dark.svg`}
						width={isMobile ? 95 : 175}
						height={isMobile ? 31 : 57}
						alt="Quick Token Logo"
						placeholder="blur"
						blurDataURL="/quick-token-logo-placeholder.svg"
					/>
				</FlowbiteNavbar.Brand>
				<FlowbiteNavbar.Collapse className="md:flex hidden">
					<FlowbiteNavbar.Link
						as={Link}
						className="text-sm font-normal hover:!text-hover-green text-main-black"
						href="/"
					>
						Home
					</FlowbiteNavbar.Link>
					<FlowbiteNavbar.Link
						as={Link}
						className="text-sm font-normal hover:!text-hover-green text-main-black"
						href="/create-token"
					>
						Create Token
					</FlowbiteNavbar.Link>
					<FlowbiteNavbar.Link
						as={Link}
						className="text-sm font-normal hover:!text-hover-green text-main-black"
						href="/contact"
					>
						Contact
					</FlowbiteNavbar.Link>
				</FlowbiteNavbar.Collapse>
			</div>

			<div className="flex items-center md:space-x-9 md:order-2">
				<WalletButton />
				<FlowbiteNavbar.Toggle />
				<div className="md:block hidden">
					<ThemeSwitch />
				</div>
			</div>
			<FlowbiteNavbar.Collapse className="md:hidden md:order-1 py-5 px-3.5">
				<FlowbiteNavbar.Link
					as={Link}
					className="text-sm border-none p-0 font-normal hover:!text-[#636463] md:text-[#333333]"
					href="/"
				>
					Home
				</FlowbiteNavbar.Link>
				<FlowbiteNavbar.Link
					as={Link}
					className="text-sm border-none p-0 md:my-0 my-3 font-normal hover:!text-[#19DC00] md:text-[#333333]"
					href="/create-token"
				>
					Create Token
				</FlowbiteNavbar.Link>
				<FlowbiteNavbar.Link
					as={Link}
					className="text-sm border-none p-0 font-normal mb-5 hover:!text-[#19DC00] md:text-[#333333]"
					href="/contact"
				>
					Contact
				</FlowbiteNavbar.Link>
				<div className="md:hidden block">
					<ThemeSwitch />
				</div>
				<hr className="border-1 border-main-black mt-5" />
			</FlowbiteNavbar.Collapse>
		</FlowbiteNavbar>
	)
}
