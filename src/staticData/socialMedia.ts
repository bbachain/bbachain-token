import { FaLinkedin, FaInstagram, FaFacebook, FaYoutube, FaTiktok, FaDiscord } from 'react-icons/fa'
import { FaXTwitter, FaTelegram, FaMedium } from 'react-icons/fa6'
import { IconType } from 'react-icons/lib'

type SocialMediaProps = {
	icon: IconType
	label: string
	href: string
}

const SocialMedia: SocialMediaProps[] = [
	{
		icon: FaXTwitter,
		label: 'bbachain twitter',
		href: 'https://twitter.com/bbachain_com'
	},
	{
		icon: FaFacebook,
		label: 'bbachain facebook',
		href: 'https://www.facebook.com/bbachain'
	},
	{
		icon: FaInstagram,
		label: 'bbachain instagram',
		href: 'https://www.instagram.com/bbachaincom/'
	},
	{
		icon: FaLinkedin,
		label: 'bbachain linkedin',
		href: 'https://www.linkedin.com/company/bti-group-bbachain/?viewAsMember=true'
	},
	{
		icon: FaYoutube,
		label: 'bbachain youtube',
		href: 'https://www.youtube.com/@BBAChain'
	},
	{
		icon: FaTiktok,
		label: 'bbachain tiktok',
		href: 'https://www.tiktok.com/@bbachain'
	},
	{
		icon: FaDiscord,
		label: 'bbachain discord',
		href: 'https://www.tiktok.com/@bbachain'
	},
	{
		icon: FaTelegram,
		label: 'bbachain telegram global',
		href: 'https://t.me/bbachain_Global'
	},
	{
		icon: FaTelegram,
		label: 'bbachain telegram',
		href: 'https://t.me/bbachain'
	},
	{
		icon: FaMedium,
		label: 'bbachain medium',
		href: 'https://medium.com/@bbachain'
	}
]

export default SocialMedia
