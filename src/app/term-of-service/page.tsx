import InfoCard from '@/components/common/info-card'
import { TermsOfServices } from '@/lib/static'

export default function TermOfService() {
	return (
		<div className="xl:px-80 md:px-36 px-[15px] mt-40 mb-20">
			<InfoCard
				title={'Terms of Service'}
				description={
					'These Terms of Service ("Terms") govern the use of the Quick Token Generator ("Platform") provided by BTI Group OÜ ("we," "us," or "our"). By accessing or using the Platform, you ("User," "you," or "your") agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Platform.'
				}
				data={TermsOfServices}
			/>
		</div>
	)
}
