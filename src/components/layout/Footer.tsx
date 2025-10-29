import Link from 'next/link'

import ThemeImage from '@/components/common/ThemeImage'
import FooterMenu from '@/staticData/footer'
import SocialMedia from '@/staticData/socialMedia'

export default function Footer() {
	const topMobileMenu = FooterMenu.slice(0, 3)
	const bottomMobileMenu = FooterMenu.slice(3)

	return (
		<footer className="relative pt-5 pb-2">
			<ThemeImage
				darkSrc="/bg-footer-dark.svg"
				lightSrc="/bg-footer-light.svg"
				fill
				quality={45}
				loading="lazy"
				style={{ objectFit: 'cover' }}
				sizes="(max-width: 768px) 100vw, 50vw"
				alt="footer background image"
			/>
			<div className="relative flex-col items-center justify-center text-center space-y-9 z-20">
				<div className="flex flex-col space-y-7 items-center">
					<ThemeImage
						lightSrc="/quick-token-logo-light.svg"
						darkSrc="/quick-token-logo-dark.svg"
						width={153}
						height={50}
						alt="Quick Token Logo"
					/>
					<div className="md:flex hidden md:space-x-9 space-x-4 justify-center">
						{FooterMenu.map((menu) => (
							<Link
								className="text-sm text-main-black hover:text-hover-green"
								key={menu.name}
								href={menu.href}
							>
								{menu.name}
							</Link>
						))}
					</div>
					<div className="md:hidden flex md:space-x-9 space-x-4 justify-center">
						{topMobileMenu.map((menu) => (
							<Link
								className="text-sm text-main-black hover:text-hover-green"
								key={menu.name}
								href={menu.href}
							>
								{menu.name}
							</Link>
						))}
					</div>
					<div className="md:hidden flex md:space-x-9 space-x-4 justify-center">
						{bottomMobileMenu.map((menu) => (
							<Link
								className="text-sm text-main-black hover:text-hover-green"
								key={menu.name}
								href={menu.href}
							>
								{menu.name}
							</Link>
						))}
					</div>
					<div className="flex space-x-3">
						{SocialMedia.map((media, index) => (
							<a key={index} aria-label={media.label} href={media.href}>
								<media.icon className="text-lg text-main-black hover:text-hover-green" />
							</a>
						))}
					</div>
				</div>
				<p className="text-sm text-main-black font-light">© 2024 BTI Group OÜ</p>
			</div>
		</footer>
	)
}
