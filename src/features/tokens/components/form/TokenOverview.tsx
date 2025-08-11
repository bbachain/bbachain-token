'use client'

import { CopyButton } from '@/components/common/CopyButton'
import { type TCreateTokenPayload } from '@/features/tokens/types'

type CreateTokenOverviewProps = Partial<TCreateTokenPayload> & {
	image_link: string
}

type OverviewItemProps = {
	label: string
	content: JSX.Element | string
}

export default function CreateTokenOverview(props: CreateTokenOverviewProps) {
	const tokenOverviewData: OverviewItemProps[] = [
		{
			label: 'Token Name',
			content: props.name ?? ''
		},
		{
			label: 'Symbol',
			content: props.symbol ?? ''
		},
		{
			label: 'Total Supply',
			content: Number(props.supply).toLocaleString() ?? ''
		},
		{
			label: 'Decimals',
			content: props.decimals ?? ''
		},
		{
			label: 'Network',
			content: 'BBA Chain'
		}
	]

	const tokenOptionsData: OverviewItemProps[] = [
		{
			label: 'Mint Authority',
			content: props.revoke_mint ? 'Active' : 'Inactive'
		},
		{
			label: 'Freeze Authority',
			content: props.revoke_freeze ? 'Active' : 'Inactive'
		},
		{
			label: 'Lock Metadata',
			content: props.immutable_metadata ? 'Locked' : 'Unlocked'
		}
	]

	const metadata: OverviewItemProps[] = [
		{
			label: 'Description',
			content: props.description ?? 'No Description'
		},
		{
			label: 'Token Icon',
			content: (
				<div className="flex items-center">
					<a
						className="text-main-green w-full max-w-[100px] !truncate hover:text-hover-green"
						href={props.image_link}
						target="_blank"
						rel="noopener noreferrer"
					>
						{props.icon?.name}
					</a>
					<CopyButton secretValue={props.image_link} />
				</div>
			)
		},
		{
			label: 'Metadata Status',
			content: props.immutable_metadata ? 'Locked' : 'Not Locked'
		}
	]

	return (
		<section className="grid dark:bg-[#151515] bg-[#F8F8F8] rounded-[21px] md:p-9 p-6 md:grid-cols-2 grid-cols-1 lg:gap-12 gap-6">
			<div className="flex md:w-[466px] flex-col md:space-y-9 space-y-3">
				<h2 className="text-main-black lg:text-2xl md:text-xl text-base font-medium">Token Overview</h2>
				<div className="flex flex-col space-y-[18px]">
					{tokenOverviewData.map(({ label, content }) => (
						<div className="flex items-center space-x-3 md:text-base text-sm text-main-black" key={label}>
							<p className="lg:w-[160px] w-[112px]">{label}</p>
							<span>:</span>
							<p>{content}</p>
						</div>
					))}
				</div>
			</div>
			<div className="flex flex-col md:space-y-9 space-y-3">
				<h2 className="text-main-black lg:text-2xl md:text-xl text-base font-medium">Token Overview</h2>
				<div className="flex flex-col space-y-[18px]">
					{tokenOptionsData.map(({ label, content }) => (
						<div className="flex items-center space-x-3" key={label}>
							<p className="md:text-lg text-sm text-main-black">{label}</p>
							<p className="text-sm text-main-green">{content}</p>
						</div>
					))}
				</div>
			</div>
			<div className="flex flex-col w-full md:space-y-9 space-y-3">
				<h2 className="text-main-black lg:text-2xl md:text-xl text-base font-medium">Metadata</h2>
				<div className="flex flex-col w-full space-y-[18px]">
					{metadata.map(({ label, content }) => (
						<div className="flex w-full items-center space-x-3 md:text-base text-sm text-main-black" key={label}>
							<p className="lg:!w-[160px] w-[112px]">{label}</p>
							<span>:</span>
							{typeof content === 'string' ? <p className="truncate">{content}</p> : content}
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
