import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatisticCardProps {
	title: string
	content: string
	isLoading: boolean
}

export default function StatisticCard({ title, content, isLoading }: StatisticCardProps) {
	return (
		<Card className="bg-box flex flex-col md:space-y-2.5 border-box-2 rounded-[8px] md:p-[18px] p-1.5">
			<CardHeader className="p-0">
				<CardTitle className="text-main-black lg:text-lg text-xs">{title}</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<Skeleton className="h-8 w-16" />
				) : (
					<p className="font-semibold text-main-black lg:text-[27px] text-sm">{content}</p>
				)}
			</CardContent>
		</Card>
	)
}
