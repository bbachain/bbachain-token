type NavMenuProps = {
	name: string
	href: string
	subMenu?: NavMenuProps[]
}

const NavMenu: NavMenuProps[] = [
	{
		name: 'Home',
		href: '/'
	},
	{
		name: 'Create Token',
		href: '/tokens/create'
	},
	{
		name: 'My Tokens',
		href: '/tokens'
	},
	{
		name: 'NFT',
		href: '',
		subMenu: [
			{
				name: 'Mint New NFT',
				href: '/nfts/create'
			},
			{
				name: 'Create Collection',
				href: '/nfts/collection/create'
			},
			{
				name: 'My NFTs',
				href: '/nfts'
			}
		]
	},
	{
		name: 'Contact',
		href: 'mailto:developers@bbachain.com'
	}
]

export default NavMenu
