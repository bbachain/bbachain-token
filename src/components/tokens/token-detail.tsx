import { capitalCase, titleCase } from 'text-case'
import Image from 'next/image'
import { AiOutlineInfoCircle } from 'react-icons/ai'
import { HiArrowPath } from 'react-icons/hi2'
import { CopyTooltip } from '../common/copy'
import { Tooltip, TooltipContent, TooltipArrow, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useErrorDialog, useIsMobile } from '@/lib/hooks'
import { PublicKey } from '@bbachain/web3.js'
import { useRevokeAuthority } from '../account/account-data-access'
import { AuthorityType, revoke } from '@bbachain/spl-token'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

export type TokenOverviewProps = {
	dataText: {
		token_name: string
		symbol: string
		total_supply: string
		decimals: number
		network: string
		mint_address: string
	}
	dataImage: string
}

export type TokenOptionProps = {
	mint_authority: boolean
	freeze_authority: boolean
	lock_metadata: boolean
}

export type TokenMetadataProps = {
	description: string
	ipfs_link: string
	metadata_status: boolean
}

function TooltipComponent({ content }: { content: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="ghost" size="icon">
						<AiOutlineInfoCircle className="text-[#989898]" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="w-full max-w-56 bg-white dark:bg-[#333333]">
					<p className="text-xs text-[#424242] dark:text-[#A7A7A7]">{content}</p>
					<TooltipArrow className="fill-white dark:fill-[#333333]" />
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

export function TokenOverview(props: TokenOverviewProps) {
	const { dataText, dataImage } = props
	const isMobile = useIsMobile()
	return (
		<div className="flex w-full rounded-[16px] border border-[#69E651] min-h-[316px] h-full p-6 flex-col md:space-y-9 space-y-3">
			<h2 className="text-main-black lg:text-2xl md:text-xl text-base font-medium">Token Overview</h2>
			<section className="flex md:flex-row md:space-y-0 space-y-2.5 flex-col justify-between">
				<div className="flex flex-col space-y-[18px]">
					{Object.entries(dataText).map(([key, value]) => (
						<div className="flex items-center space-x-3 md:text-base text-sm text-main-black" key={key}>
							<p className="lg:w-[160px] w-[112px]">{capitalCase(key)}</p>
							<span>:</span>
							{key === 'mint_address' && typeof value === 'string' ? (
								<div className="flex items-center">
									<a
										className="text-main-green w-full md:max-w-[101px] max-w-[90px] !truncate hover:text-hover-green"
										href={value}
										target="_blank"
										rel="noopener noreferrer"
									>
										{value}
									</a>
									<CopyTooltip secretValue={value} />
								</div>
							) : (
								<p>{value}</p>
							)}
						</div>
					))}
				</div>
				<div className="flex md:flex-col flex-row items-center md:space-y-2.5 md:space-x-0 space-x-2.5">
					<Image
						src={dataImage}
						width={isMobile ? 62 : 111}
						height={isMobile ? 62 : 111}
						alt={dataText.token_name + '-' + 'icon'}
					/>
					<Button disabled type="button" className="bg-main-green rounded-[8px] text-sm py-1.5 h-7 w-28">
						Change
						<HiArrowPath className="text-xs" />
					</Button>
				</div>
			</section>
		</div>
	)
}

export function TokenOptions(props: { mintAddress: PublicKey; state: TokenOptionProps }) {
	const { state, mintAddress } = props
	const revokeAuthority = useRevokeAuthority({ mintAddress })
	const { openErrorDialog } = useErrorDialog()

	const optionButtonsData = {
		mint_authority: {
			buttonText: 'Revoke Mint Authority',
			state: state.mint_authority ? 'Active' : 'Inactive',
			info: 'Controls who can mint (create) new tokens. Revoking this adds trust and prevents further minting.',
			pending: revokeAuthority.isPending && revokeAuthority.variables === AuthorityType.MintTokens,
			onClick: () => revokeAuthority.mutate(AuthorityType.MintTokens)
		},
		freeze_authority: {
			buttonText: 'Revoke Freeze Authority',
			state: state.freeze_authority ? 'Active' : 'Inactive',
			info: 'Allows freezing user wallets holding this token. Revoke to make the token fully decentralized and ready for liquidity pools.',
			pending: revokeAuthority.isPending && revokeAuthority.variables === AuthorityType.FreezeAccount,
			onClick: () => revokeAuthority.mutate(AuthorityType.FreezeAccount)
		},
		lock_metadata: {
			buttonText: 'Lock Metadata',
			state: state.lock_metadata ? 'Locked' : 'Unlocked',
			info: 'Once locked, the token&apos;s name, symbol, and icon can&apos;t be changed. Enhances trust and transparency.',
			pending: false,
			onClick: () => {}
		},
		burnt_token: {
			buttonText: 'Burn',
			state: '',
			info: 'Permanently remove tokens from circulation. Useful for reducing supply or managing errors.',
			pending: false,
			onClick: () => {}
		}
	}

	useEffect(() => {
		if (revokeAuthority.isSuccess && revokeAuthority.data) toast.success(revokeAuthority.data.message)
	}, [revokeAuthority.data, revokeAuthority.isSuccess])

	useEffect(() => {
		if (revokeAuthority.isError && revokeAuthority.error)
			openErrorDialog({ title: 'We can not proceed your transaction', description: revokeAuthority.error.message })
	}, [openErrorDialog, revokeAuthority.error, revokeAuthority.isError])

	return (
		<div className="flex flex-col p-6 rounded-[16px] border border-[#69E651] min-h-[316px] h-full w-full md:space-y-9 space-y-3">
			<h2 className="text-main-black lg:text-2xl md:text-xl text-base font-medium">Manage Token Options</h2>
			<div className="flex flex-col space-y-[18px]">
				{Object.entries(state).map(([key, value]) => {
					const data = optionButtonsData[key as keyof typeof state]
					return (
						<div className="flex md:flex-row flex-col justify-between" key={key}>
							<div className="flex items-center space-x-3">
								<section className="flex space-x-0.5 items-center">
									<TooltipComponent content={data.info} />
									<h5 className="md:text-lg text-sm text-main-black">{titleCase(key)}</h5>
								</section>
								<p className="text-sm text-main-green">{data.state}</p>
							</div>
							{!value && (
								<Button
									type="button"
									onClick={data.onClick}
									disabled={revokeAuthority.isPending}
									className="bg-main-green md:ml-0 ml-9  rounded-[8px] text-sm w-auto md:max-w-none max-w-[171px] min-w-[114px] h-7 md:px-3 px-0 py-1.5 font-medium"
								>
									{data.pending && <Loader2 className="animate-spin" />}
									{data.buttonText}
								</Button>
							)}
						</div>
					)
				})}
				<div className="flex flex-col space-y-2">
					<section className="flex space-x-0.5 items-center">
						<TooltipComponent content={optionButtonsData.burnt_token.info} />
						<h5 className="md:text-lg text-sm text-main-black">Burnt Token</h5>
					</section>
					<section className="flex ml-9 space-x-2.5">
						<Input className="md:w-52 rounded-[8px]" placeholder="Enter amount" />
						<Button type="button" disabled className="bg-main-green rounded-[8px]">
							{optionButtonsData.burnt_token.buttonText}
						</Button>
					</section>
				</div>
			</div>
		</div>
	)
}

export function TokenMetadata(props: { data: TokenMetadataProps }) {
	const { data } = props

	const metadataMap = {
		Description: <p>{data.description}</p>,
		'IPFS Link':
			data.ipfs_link !== '-' ? (
				<div className="flex items-center">
					<a
						className="text-main-green w-full md:max-w-[158px] max-w-[90px] !truncate hover:text-hover-green"
						href={data.ipfs_link}
						target="_blank"
						rel="noopener noreferrer"
					>
						{data.ipfs_link}
					</a>
					<CopyTooltip secretValue={data.ipfs_link} />
				</div>
			) : (
				<p>{data.ipfs_link}</p>
			),
		'Metadata Status': <p>{data.metadata_status ? 'Locked' : 'Not Locked'}</p>
	}

	return (
		<div className="flex w-full rounded-[16px] border border-[#69E651]  h-full p-6 flex-col  md:space-y-9 space-y-3">
			<h2 className="text-main-black lg:text-2xl md:text-xl text-base font-medium">Metadata</h2>
			<div className="flex flex-col w-full space-y-[18px]">
				{Object.entries(metadataMap).map(([key, value]) => (
					<div className="flex w-full items-center space-x-3 md:text-base text-sm text-main-black" key={key}>
						<p className="lg:!w-[160px] w-[112px]">{key}</p>
						<span>:</span>
						{value}
					</div>
				))}
			</div>
		</div>
	)
}
