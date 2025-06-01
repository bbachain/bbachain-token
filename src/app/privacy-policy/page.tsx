import InfoCard from '@/components/layout/InfoCard'
import PrivacyPolicyData from '@/staticData/privacyPolicy'

export default function PrivacyPolicy() {
	return (
		<div className="xl:px-80 md:px-36 px-[15px] mt-40 mb-20">
			<InfoCard
				title={'Privacy Policy'}
				description={
					'BTI Group OÜ ("we," "us," or "our") is committed to protecting the privacy of users ("you" or "your") who use the Quick Token Generator Platform ("Platform"). This Privacy Policy outlines how we collect, use, and safeguard your information when you interact with our Platform.'
				}
				data={PrivacyPolicyData}
			/>
		</div>
	)
}
