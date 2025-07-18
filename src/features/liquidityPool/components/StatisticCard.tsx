import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatisticCardProps {
	title: string
	content: string
	isLoading: boolean
}

export default function StatisticCard({ title, content, isLoading }: StatisticCardProps) {
	return (
		<Card className="bg-box flex flex-col space-y-2.5 border-box-2 rounded-[8px] p-[18px]">
			<CardHeader className="p-0">
				<CardTitle className="text-main-black text-lg">{title}</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<Skeleton className="h-8 w-16" />
				) : (
					<p className="font-semibold text-main-black text-[27px]">{content}</p>
				)}
			</CardContent>
		</Card>
	)
}
