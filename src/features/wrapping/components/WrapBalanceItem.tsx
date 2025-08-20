import Image from 'next/image'

import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/isMobile'

interface WrapBalanceItemProps {
	type: 'BBA' | 'WBBA'
	balance: number
	isLoading?: boolean
}

export default function WrapBalanceItem({ type, balance, isLoading }: WrapBalanceItemProps) {
	const isWBBA = type === 'WBBA'
	const isMobile = useIsMobile()
	return (
		<section className="w-full flex space-between items-center md:p-5 p-3 bg-box-3 border border-box-2 rounded-[8px]">
			<section className="flex flex-col w-full space-y-3">
				<h4 className="text-main-black md:text-lg text-sm font-normal">{`${type} Balance`}</h4>
				{isLoading ? (
					<Skeleton className="w-24 h-8" />
				) : (
					<p className="text-main-black md:text-2xl text-xl font-semibold">{`${balance.toLocaleString(undefined, {
						minimumFractionDigits: 0,
						maximumFractionDigits: 6
					})} ${type}`}</p>
				)}
			</section>
			<Image
				src={isWBBA ? '/WBBA_logo_wrapping.svg' : '/BBA_logo_wrapping.svg'}
				width={isMobile ? 28 : 50}
				height={isMobile ? 28 : 50}
				alt={isWBBA ? 'WBBA icon' : 'BBA icon'}
			/>
		</section>
	)
}
