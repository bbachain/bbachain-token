export type FAQItem = {
	question: string
	answer: string
}

const FAQData: FAQItem[] = [
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

export default FAQData
