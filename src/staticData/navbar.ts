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
		name: 'Tokens',
		href: '',
		subMenu: [
			{
				name: 'Create Token',
				href: '/tokens/create'
			},
			{
				name: 'My Tokens',
				href: '/tokens'
			}
		]
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
		name: 'Swap',
		href: '/swap'
	},
	{
		name: 'Liquidity',
		href: '',
		subMenu: [
			{
				name: 'All Liquidity Pools',
				href: '/liquidity-pools'
			},
			{
				name: 'Create Liquidity Pool',
				href: '/liquidity-pools/create-pool'
			}
		]
	},
	{
		name: 'Contact',
		href: 'mailto:developers@bbachain.com'
	}
]

export default NavMenu
