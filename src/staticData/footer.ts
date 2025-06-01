type FooterMenuProps = {
	name: string
	href: string
}

const FooterMenu: FooterMenuProps[] = [
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
		href: 'mailto:developers@bbachain.com'
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

export default FooterMenu
