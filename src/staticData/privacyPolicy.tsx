import { InfoItem } from './termOfServices'

const PrivacyPolicyData: InfoItem[] = [
	{
		title: 'Scope of the Privacy Policy',
		description:
			'This Privacy Policy applies exclusively to the Quick Token Generator, a Web3 platform that operates without user registration. Users interact with the Platform solely by connecting their blockchain wallets.'
	},
	{
		title: 'Information We Collect',
		description:
			'The Platform does not require registration or the submission of personal information. The information we collect is strictly limited to the following:',
		items: [
			{
				title: 'Blockchain Wallet Address',
				lists: [
					'When you connect your wallet to the Platform, we may process your wallet address to facilitate transactions and provide token creation services.',
					'This information is inherently public on the blockchain and is neither stored nor used for any purpose beyond providing the service.'
				]
			},
			{
				title: 'Transactional Data',
				lists: [
					'We process information related to token creation and blockchain transactions initiated by you on the Platform. This includes the type of token, transaction ID, and related blockchain data.',
					' All transactional data is recorded on the blockchain and is publicly accessible due to the nature of blockchain technology. '
				]
			}
		]
	},
	{
		title: 'How We Use Your Information',
		description: 'We use the limited information collected to:',
		lists: [
			'Enable and facilitate the token creation process.',
			'Ensure the proper functioning and security of the Platform.',
			'Monitor and analyze Platform usage to improve the overall user experience.'
		]
	},
	{
		title: 'Information Sharing and Disclosure',
		items: [
			{
				title: 'No Third-Party Sharing',
				lists: [
					'We do not sell, rent, or share your information with third parties for marketing or any commercial purposes.'
				]
			},
			{
				title: 'Blockchain Transparency',
				lists: [
					'As the Platform operates on a blockchain, your wallet address and transactional data are publicly accessible on the blockchain. We have no control over the availability of this data on the blockchain network.'
				]
			}
		]
	},
	{
		title: 'Data Storage and Security',
		items: [
			{
				title: 'No Personal Data Storage',
				lists: [
					'We do not store personal information or wallet addresses on our servers. The Platform operates entirely as a decentralized Web3 service.'
				]
			},
			{
				title: 'Security Measures',
				lists: [
					'We implement industry-standard security measures to protect the integrity and functionality of the Platform. However, as a Web3 platform, users are solely responsible for the security of their wallets and private keys. '
				]
			}
		]
	},
	{
		title: 'User Responsibilities',
		lists: [
			'Ensure the security of your blockchain wallet and private keys. We will never request your private key or seed phrase.',
			'Use the Platform responsibly and ensure compliance with all applicable laws and regulations in your jurisdiction.'
		]
	},
	{
		title: 'Third-Party Services',
		description:
			'The Platform may include links to third-party services or platforms. We are not responsible for the privacy practices, content, or operations of these third parties. We encourage you to review their privacy policies before engaging with their services.'
	},
	{
		title: "Children's Privacy",
		description:
			'The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect or process personal information from minors.'
	},
	{
		title: 'Changes to this Privacy Policy',
		description:
			'We reserve the right to update or modify this Privacy Policy at any time without prior notice. Changes will be effective immediately upon posting on the Platform. We encourage you to review this Privacy Policy periodically for any updates. '
	},
	{
		title: 'Contact Information',
		description: (
			<>
				<p>
					If you have any questions or concerns about this Privacy Policy or your interactions with the Platform, please
					contact us at:
				</p>
				<ul className="my-4">
					<li>
						<span className="font-semibold">Email</span>: contact@bbachain.com{' '}
					</li>
					<li>
						<span className="font-semibold">Address</span>: BTI Group OÜ, Tornimäe tn 3 Tallinn, Estonia 10145 By using
						the
					</li>
				</ul>
				<p>Quick Token Generator, you acknowledge that you have read, understood, and agreed to this Privacy Policy.</p>
			</>
		)
	}
]

export default PrivacyPolicyData
