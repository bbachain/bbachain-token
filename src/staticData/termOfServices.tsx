export type InfoItem = {
	title: string
	description?: string | JSX.Element
	lists?: string[]
	items?: InfoItem[]
}

const TermsOfServices: InfoItem[] = [
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

export default TermsOfServices
