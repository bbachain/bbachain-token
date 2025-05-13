import { FaXTwitter, FaTelegram, FaMedium } from 'react-icons/fa6'
import { FaLinkedin, FaInstagram, FaFacebook, FaYoutube, FaTiktok, FaDiscord } from 'react-icons/fa'
import { type InfoItem, type FAQItem } from './types'

export const NavMenu = [
	{
		name: 'Home',
		href: '/'
	},
	{
		name: 'Create Token',
		href: '/create-token'
	},
	{
		name: 'My Tokens',
		href: '/my-tokens'
	},
	{
		name: 'NFT',
		href: '',
		subMenu: [
			{
				name: 'Mint New NFT',
				href: '/create-nft'
			},
			{
				name: 'Create Collection',
				href: '/create-collection'
			},
			{
				name: 'My NFTs',
				href: '/my-nfts'
			}
		]
	},
	{
		name: 'Contact',
		href: '/contact'
	}
]

export const FooterMenu = [
	{
		name: 'Home',
		href: '/'
	},
	{
		name: 'Create Token',
		href: '/create-token'
	},
	{
		name: 'Contact',
		href: '/contact'
	},
	{
		name: 'Terms &Service',
		href: '/term-of-service'
	},
	{
		name: 'Privacy Policy',
		href: '/privacy-policy'
	}
]

export const SocialMedia = [
	{
		icon: FaXTwitter,
		href: 'https://twitter.com/bbachain_com'
	},
	{
		icon: FaFacebook,
		href: 'https://www.facebook.com/bbachain'
	},
	{
		icon: FaInstagram,
		href: 'https://www.instagram.com/bbachaincom/'
	},
	{
		icon: FaLinkedin,
		href: 'https://www.linkedin.com/company/bti-group-bbachain/?viewAsMember=true'
	},
	{
		icon: FaYoutube,
		href: 'https://www.youtube.com/@BBAChain'
	},
	{
		icon: FaTiktok,
		href: 'https://www.tiktok.com/@bbachain'
	},
	{
		icon: FaDiscord,
		href: 'https://www.tiktok.com/@bbachain'
	},
	{
		icon: FaTelegram,
		href: 'https://t.me/bbachain_Global'
	},
	{
		icon: FaTelegram,
		href: 'https://t.me/bbachain'
	},
	{
		icon: FaMedium,
		href: 'https://medium.com/@bbachain'
	}
]

export const FAQData: FAQItem[] = [
	{
		question: 'How does the BTI quick token generator(QTG) work',
		answer:
			'The BTI quick token generator simplifies the token creation process by providing a user-friendly interface where users can input token details and deploy tokens swiftly onto BBA network.'
	},
	{
		question: 'Is the token creation process secure with the BTI QTG',
		answer:
			'Yes, the BTI QTG ensures security through robust encryption protocols and smart contract validation mechanisms, providing users with a secure environment for token creation and deployment.'
	},
	{
		question: 'What blockchain networks does BTI QTG support',
		answer: 'Currently, the BTI quick token generator supports deployment on BBAChain.'
	},
	{
		question: 'Can I customize the features of token using the BTI QTG',
		answer:
			'Absolutely! The BBA quick token generator offers extensive customization options, allowing users to tailor token features such as supply and distribution mechanisms.'
	},
	{
		question: 'How long does it take to create and deploy a token',
		answer:
			'With its streamlined process and intuitive interface, users can create and deploy tokens within minutes using the BTI QTG, significantly reducing the time and effort required compared to traditional methods.'
	},
	{
		question: 'What support options are available for users',
		answer:
			'Users of the BTI QTG have access to comprehensive support resources, including documentation, tutorials, and a dedicated support team.'
	}
]

export const TermsOfServices: InfoItem[] = [
	{
		title: 'Purpose of the Platform',
		description:
			'The Quick Token Generator is a tool that enables Users to create tokens on the BBAChain network quickly and easily. The Platform provides an accessible interface for token creation but does not offer legal, financial, or technical advice, nor does it support or endorse any tokens generated through the Platform.'
	},
	{
		title: 'User Responsibilities',
		items: [
			{
				title: 'Compliance with Laws',
				description:
					'Users are solely responsible for ensuring that any tokens they create comply with all applicable laws, regulations, and guidelines, including but not limited to those governing securities, financial instruments, and data protection in Estonia and the European Union (EU).'
			},
			{
				title: 'Ownership and Liability',
				description:
					'Users retain full ownership of, and responsibility for, any tokens they create. BTI Group OÜ and BBAChain are not affiliated with, do not endorse, and accept no liability for any tokens or projects created using the Platform.'
			},
			{
				title: 'Prohibited Activities',
				description:
					'You agree not to use the Platform to create tokens for any illegal, unethical, or fraudulent purposes, including but not limited to:',
				lists: [
					'Money laundering',
					'Fraudulent schemes',
					'Unlawful financial instruments',
					'Malware distribution or phishing'
				]
			},
			{
				title: 'Transparency',
				description:
					'Users are encouraged to provide clear and accurate information about their tokens and projects to their potential users or investors, but BTI Group OÜ does not verify or validate any claims made by token creators.'
			}
		]
	},
	{
		title: 'Disclaimer of Liability',
		items: [
			{
				title: 'No Endorsement or Affiliation',
				description:
					'BTI Group OÜ and BBAChain are not affiliated with or responsible for any tokens, projects, or entities created using the Platform. The inclusion of a token on the BBAChain network does not imply endorsement or support.'
			},
			{
				title: 'No Legal or Financial Responsibility',
				description:
					'We shall not be liable for any legal, financial, or reputational damages arising from the use of the Platform or the tokens generated. Users acknowledge that they are fully responsible for any risks associated with the creation, distribution, or management of their tokens. '
			},
			{
				title: 'No Warranty',
				description:
					'The Platform is provided "as is" without any warranty, express or implied. We do not guarantee uninterrupted access, error-free operation, or compatibility with third-party systems.'
			}
		]
	},
	{
		title: 'Platform Use',
		items: [
			{
				title: 'User Conduct',
				description:
					'Users must use the Platform responsibly and refrain from actions that could harm the Platform, its Users, or its reputation.'
			},
			{
				title: 'Termination of Access',
				description:
					'We reserve the right to suspend or terminate access to the Platform for any User who violates these Terms or engages in prohibited activities.'
			},
			{
				title: 'Modifications to the Platform',
				description:
					'We reserve the right to modify, suspend, or discontinue the Platform at any time without prior notice or liability.'
			}
		]
	},
	{
		title: 'Intellectual Property',
		items: [
			{
				title: 'Ownership',
				description:
					'The Platform, including its software, design, and underlying technology, is the property of BTI Group OÜ and is protected by intellectual property laws.'
			},
			{
				title: 'Limited License',
				description:
					'Users are granted a limited, non-exclusive, and non-transferable license to use the Platform solely for the purpose of creating tokens on the BBAChain network.'
			}
		]
	},
	{
		title: 'Indemnification',
		description:
			'Users agree to indemnify and hold harmless BTI Group OÜ, BBAChain, and their officers, directors, employees, and agents from any claims, damages, or liabilities arising from their use of the Platform or any tokens created using the Platform.'
	},
	{
		title: 'Governing Law and Dispute Resolution',
		items: [
			{
				title: 'Governing Law',
				description: 'These Terms are governed by the laws of Estonia and applicable EU legislation.'
			},
			{
				title: 'Dispute Resolution',
				description:
					'Any disputes arising from or relating to these Terms shall be resolved through binding arbitration in Estonia, in accordance with Estonian arbitration rules.'
			}
		]
	},
	{
		title: 'Changes to Terms',
		description:
			'We reserve the right to update or modify these Terms at any time without prior notice. Your continued use of the Platform after changes are made constitutes your acceptance of the revised Terms.'
	},
	{
		title: 'Contact Information',
		description: (
			<p>
				If you have any questions or concerns about these Terms, please contact us at contact@bbachain.com.
				<span className="mt-2 block">
					By using the Quick Token Generator, you acknowledge that you have read, understood, and agree to these Terms
					of Service.
				</span>
			</p>
		)
	}
]

export const PrivacyPolicy: InfoItem[] = [
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
