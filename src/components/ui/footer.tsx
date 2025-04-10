'use client'

import Link from 'next/link'
import { FaXTwitter, FaTelegram, FaMedium } from 'react-icons/fa6'
import { FaLinkedin, FaInstagram, FaFacebook, FaYoutube, FaTiktok, FaDiscord } from 'react-icons/fa'
import ThemeImage from './theme-image'

const footerMenu = [
	{
		name: 'Home',
		href: '/'
	},
	{
		name: 'Create Token',
		href: '/create-token'
	},
	{
		name: 'Contact',
		href: '/contact'
	},
	{
		name: 'Terms &Service',
		href: '/term-of-service'
	},
	{
		name: 'Privacy Policy',
		href: '/privacy-policy'
	}
]

const socialMedia = [
	{
		icon: FaXTwitter,
		href: 'https://twitter.com/bbachain_com'
	},
	{
		icon: FaFacebook,
		href: 'https://www.facebook.com/bbachain'
	},
	{
		icon: FaInstagram,
		href: 'https://www.instagram.com/bbachaincom/'
	},
	{
		icon: FaLinkedin,
		href: 'https://www.linkedin.com/company/bti-group-bbachain/?viewAsMember=true'
	},
	{
		icon: FaYoutube,
		href: 'https://www.youtube.com/@BBAChain'
	},
	{
		icon: FaTiktok,
		href: 'https://www.tiktok.com/@bbachain'
	},
	{
		icon: FaDiscord,
		href: 'https://www.tiktok.com/@bbachain'
	},
	{
		icon: FaTelegram,
		href: 'https://t.me/bbachain_Global'
	},
	{
		icon: FaTelegram,
		href: 'https://t.me/bbachain'
	},
	{
		icon: FaMedium,
		href: 'https://medium.com/@bbachain'
	}
]

export default function Footer() {
	const topMobileMenu = footerMenu.slice(0, 3)
	const bottomMobileMenu = footerMenu.slice(3)

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
					{footerMenu.map((menu) => (
						<Link className="text-sm text-main-black hover:text-hover-green" key={menu.name} href={menu.href}>
							{menu.name}
						</Link>
					))}
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
					{socialMedia.map((media, index) => (
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
