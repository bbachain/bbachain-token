'use client'

import { titleCase } from 'text-case'
import Image from 'next/image'

type TokenOverviewProps = {
	dataText: {
		token_name: string | null
		symbol: string | null
		total_supply: string | null
		decimals: number | null
		network: string | null
		mint_address: string | null
	}
	dataImage: string | null
}

function TokenOverview(props: TokenOverviewProps) {
	const { dataText, dataImage } = props
	return (
		<div className="flex w-full p-6 flex-col md:space-y-9 space-y-3">
			<h2 className="text-main-black lg:text-2xl md:text-xl text-base font-medium">Token Overview</h2>
			<section className="flex justify-between">
				<div className="flex flex-col space-y-[18px]">
					{Object.entries(dataText).map(([key, value]) => (
						<div className="flex items-center space-x-3 md:text-base text-sm text-main-black" key={key}>
							<p className="lg:w-[160px] w-[112px]">{titleCase(key)}</p>
							<span>:</span>
							<p>{value ?? '-'}</p>
						</div>
					))}
				</div>
				<div>
					<Image
						src={dataImage ?? '/icon-placeholder.svg'}
						width={111}
						height={111}
						alt={dataText.token_name + '-' + 'icon'}
					/>
				</div>
			</section>
		</div>
	)
}

function TokenOptions() {
    
}

export default function TokenDetail({ params }: { params: { mintAddress: string } }) {
	return <p>{params.mintAddress}</p>
}
