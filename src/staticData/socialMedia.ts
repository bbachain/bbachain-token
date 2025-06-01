import { FaLinkedin, FaInstagram, FaFacebook, FaYoutube, FaTiktok, FaDiscord } from 'react-icons/fa'
import { FaXTwitter, FaTelegram, FaMedium } from 'react-icons/fa6'
import { IconType } from 'react-icons/lib'

type SocialMediaProps = {
	icon: IconType
	href: string
}

const SocialMedia: SocialMediaProps[] = [
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

export default SocialMedia
