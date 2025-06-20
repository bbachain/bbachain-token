'use client'

import Image from 'next/image'
import { Dispatch, SetStateAction } from 'react'

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

import { TTokenFarmProps } from '../types'

interface SelectFarmProps {
	data: TTokenFarmProps[]
	selectedTokenId: string
	setSelectedTokenId: Dispatch<SetStateAction<string>>
}

export default function SelectTokenFarm({ data, selectedTokenId, setSelectedTokenId }: SelectFarmProps) {
	const selectedTokenFarm = data.find((t) => t.id === selectedTokenId)

	return (
		<Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
			<SelectTrigger className="p-2.5 w-full bg-box rounded-[10px] ">
				<SelectValue>
					{selectedTokenFarm && (
						<div className="w-full flex md:space-x-24 space-x-2 justify-between">
							<section className="w-full pl-2.5 flex space-x-2.5 items-center">
								<section className="flex space-x-0 relative items-center">
									<Image
										src={selectedTokenFarm.fromToken.icon}
										width={14}
										height={14}
										alt={`${selectedTokenFarm.fromToken.name} - from icon`}
									/>
									<Image
										src={selectedTokenFarm.toToken.icon}
										width={14}
										height={14}
										alt={`${selectedTokenFarm.toToken.name} - to icon`}
									/>
								</section>
								<h4 className="text-sm w-full text-main-black">{`${selectedTokenFarm.fromToken.symbol}/${selectedTokenFarm.toToken.symbol}`}</h4>
							</section>
							<p className="text-sm !text-center text-main-black">TVL: {selectedTokenFarm.tvl}</p>
						</div>
					)}
				</SelectValue>
			</SelectTrigger>
			<SelectContent className="bg-box w-[--radix-select-trigger-width] rounded-[10px]">
				{data.map((token) => (
					<SelectItem key={token.id} value={token.id} className="p-2.5 border-b-2 border-b-box-2">
						<div className="flex flex-wrap md:space-x-11 space-x-2">
							<section className="flex md:space-x-2.5 space-x-1 items-center">
								<section className="flex space-x-0 relative items-center">
									<Image
										src={token.fromToken.icon}
										width={14}
										height={14}
										alt={`${token.fromToken.name} - from icon`}
									/>
									<Image src={token.toToken.icon} width={14} height={14} alt={`${token.toToken.name} - to icon`} />
								</section>
								<h4 className="text-sm text-main-black">{`${token.fromToken.symbol}/${token.toToken.symbol}`}</h4>
							</section>
							<p className="text-sm md:w-[120px] text-main-black">TVL: {token.tvl}</p>
							<p className="text-sm text-main-black">APR: {token.apr}</p>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
