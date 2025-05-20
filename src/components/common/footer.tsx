'use client'

import Link from 'next/link'
import { FooterMenu, SocialMedia } from '@/lib/static'
import ThemeImage from './theme-image'

export default function Footer() {
	const topMobileMenu = FooterMenu.slice(0, 3)
	const bottomMobileMenu = FooterMenu.slice(3)

	return (
		<footer className="dark:bg-[url('/bg-footer-dark.svg')] bg-[url('/bg-footer-light.svg')] bg-cover pt-5 pb-2  flex flex-col items-center justify-center text-center space-y-9">
			<div className="flex flex-col  space-y-7 items-center">
				<ThemeImage
					lightSrc="/quick-token-logo-light.svg"
					darkSrc="/quick-token-logo-dark.svg"
					width={153}
					height={50}
					alt="Quick Token Logo"
				/>
				<div className="md:flex hidden md:space-x-9 space-x-[15px] justify-center">
					{FooterMenu.map((menu) =>
						menu.name === 'Contact' ? (
							<a className="text-sm text-main-black hover:text-hover-green" key={menu.name} href={menu.href}>
								{menu.name}
							</a>
						) : (
							<Link className="text-sm text-main-black hover:text-hover-green" key={menu.name} href={menu.href}>
								{menu.name}
							</Link>
						)
					)}
				</div>
				<div className="md:hidden flex md:space-x-9 space-x-[15px] justify-center">
					{topMobileMenu.map((menu) => (
						<Link className="text-sm text-main-black hover:text-hover-green" key={menu.name} href={menu.href}>
							{menu.name}
						</Link>
					))}
				</div>
				<div className="md:hidden flex md:space-x-9 space-x-[15px] justify-center">
					{bottomMobileMenu.map((menu) => (
						<Link className="text-sm text-main-black hover:text-hover-green" key={menu.name} href={menu.href}>
							{menu.name}
						</Link>
					))}
				</div>
				<div className="flex space-x-3">
					{SocialMedia.map((media, index) => (
						<Link key={index} href={media.href}>
							<media.icon className="text-lg text-main-black hover:text-hover-green" />
						</Link>
					))}
				</div>
			</div>
			<p className="text-sm text-main-black font-light">© 2024 BTI Group OÜ</p>
		</footer>
	)
}
