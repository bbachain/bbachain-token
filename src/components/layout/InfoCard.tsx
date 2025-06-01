import React from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type TInfo = {
	title: string
	description?: string | JSX.Element
	lists?: string[]
	items?: TInfo[]
}

type InfoCardProps = {
	title: string
	description: string
	data: TInfo[]
}

const InfoCard: React.FC<InfoCardProps> = ({ title, description, data }) => {
	return (
		<Card>
			<CardHeader className="bg-[url('/info_card_bg.svg')] text-center  w-full bg-cover py-10 bg-center">
				<CardTitle className="md:text-[55px] text-2xl mb-4 font-bold text-white">{title}</CardTitle>
				<CardDescription className="md:text-base text-sm  text-white font-medium">
					Last updated: January 02, 2025
				</CardDescription>
			</CardHeader>
			<CardContent className="md:p-6 py-6 px-2.5 text-sm text-main-black">
				<p>{description}</p>
				<div className="mt-3">
					{data.map((section, index) => (
						<InfoSection key={`section-${index}`} section={section} index={index} />
					))}
				</div>
			</CardContent>
		</Card>
	)
}

type InfoSectionProps = {
	section: TInfo
	index: number
}

const InfoSection: React.FC<InfoSectionProps> = ({ section, index }) => {
	return (
		<section className="mt-3">
			<h2 className="font-semibold text-base">{`${index + 1}. ${section.title}`}</h2>
			{section.description && section.title !== 'Contact Information' ? (
				<p className="mt-2">{section.description}</p>
			) : (
				<div>{section.description}</div>
			)}
			{section.items && (
				<div className="mt-2">
					{section.items.map((item, itemIndex) => (
						<InfoItem key={`item-${index}-${itemIndex}`} item={item} index={`${index + 1}.${itemIndex + 1}`} />
					))}
				</div>
			)}
			{section.lists && (
				<ul className="list-disc mt-2 ml-6">
					{section.lists.map((list, listIndex) => (
						<li key={`list-${index}-${listIndex}`}>{list}</li>
					))}
				</ul>
			)}
		</section>
	)
}

type InfoItemProps = {
	item: TInfo
	index: string
}

const InfoItem: React.FC<InfoItemProps> = ({ item, index }) => {
	return (
		<article className="mt-2">
			<h5>{`${index}. ${item.title}`}</h5>
			{item.description && <p>{`${item.description}`}</p>}
			{item.lists && (
				<ul className="list-disc mt-2 ml-6">
					{item.lists.map((list, listIndex) => (
						<li key={`list-${index}-${listIndex}`}>{list}</li>
					))}
				</ul>
			)}
		</article>
	)
}

export default InfoCard
