import { type FAQItem } from '@/staticData/faq'

export type FAQItemProps = FAQItem

export default function FAQItem(props: FAQItemProps) {
	const { question, answer } = props
	return (
		<div className="flex flex-col space-y-1.5">
			<h4 className="text-base font-semibold text-main-black">{question}?</h4>
			<p className="text-xs text-light-grey">{answer}</p>
		</div>
	)
}
