'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import Moment from 'react-moment'

import { Skeleton } from '@/components/ui/skeleton'

export interface NftCardProps {
	address: string
	image: string
	name: string
	collection: string
	date: number
}

export const NftCard: React.FC<NftCardProps> = ({ image, name, collection, address, date }) => {
	const [isLoading, setIsLoading] = useState(false)

	if (isLoading) {
		return <Skeleton className="md:h-[282px] md:w-[220px] w-[130px] h-[146px] rounded-[10px] shadow-lg" />
	}

	return (
		<Link
			href={`/nfts/${address}`}
			className="relative sm:h-[282px] sm:w-[220px] w-[130px] h-[146px] rounded-[10px] overflow-hidden shadow-lg"
		>
			<Image
				src={image}
				alt={name}
				fill
				style={{ objectFit: 'cover' }}
				className="w-full"
				onLoad={() => setIsLoading(false)}
				priority
			/>

			{/* Overlay Text */}
			<div className="absolute bottom-0 w-full bg-[rgba(0,0,0,0.20)] text-white p-3 space-y-1.5">
				<h2 className="md:text-sm text-xs font-medium">{name}</h2>
				<p className="md:text-xs text-[10px]">
					<span className="mr-1.5">Collection:</span> {collection}
				</p>
				<p className="md:text-xs text-[10px] truncate">
					<span className="mr-1.5">Address:</span> {address}
				</p>
				<p className="md:text-xs text-[10px]">
					<span className="mr-1.5">Minted:</span>
					<Moment unix format="D MMM, YYYY">
						{date}
					</Moment>
				</p>
			</div>
		</Link>
	)
}
