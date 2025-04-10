export type FAQItemProps = {
	question: string
	answer: string
}

export default function FAQItem(props: FAQItemProps) {
	const { question, answer } = props
	return (
		<div className="flex flex-col space-y-1.5">
			<h4 className="text-[15px] font-semibold text-main-black">{question}?</h4>
			<p className="text-xs text-light-grey">{answer}</p>
		</div>
	)
}
