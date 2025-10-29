'use client'

import { motion, Variants } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'

import FAQItem from '@/components/common/FaqItem'
import ThemeImage from '@/components/common/ThemeImage'
import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import FAQData from '@/staticData/faq'

const StepsData = [
	{
		value: 'connect_wallet',
		title: 'Connect Wallet',
		description:
			'Link your wallet to the platform for seamless management of funds during the token creation process.',
		image: '/connect_wallet.svg'
	},
	{
		value: 'token_details',
		title: 'Add Token Details',
		description:
			'Customize your token by providing essential information such as its name, symbol, and total supply.',
		image: '/token_details.svg'
	},
	{
		value: 'add_features',
		title: 'Add Features',
		description:
			"Tailor your token's functionality by choosing from a variety of features such as smart contract conditions and governance structures.",
		image: '/add_features.svg'
	},
	{
		value: 'deploy_token',
		title: 'Deploy Token',
		description:
			'Finalize and launch your token onto the blockchain network, making it accessible for users within your ecosystem.',
		image: '/deploy_token.svg'
	}
]

const containerVariants: Variants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.2,
			when: 'beforeChildren'
		}
	}
}

const itemVariants: Variants = {
	hidden: { opacity: 0, y: 30 },
	show: {
		opacity: 1,
		y: 0,
		transition: {
			type: 'spring',
			stiffness: 60,
			damping: 12
		}
	}
}

export default function Home() {
	return (
		<>
			<motion.section
				className="relative md:pt-24 md:pb-28 py-6 lg:px-0 md:px-6 px-4 w-full min-h-full"
				variants={containerVariants}
				initial="hidden"
				whileInView="show"
				viewport={{ once: true, amount: 0.3 }}
			>
				<ThemeImage
					lightSrc="/bg_jumbotron_light.svg"
					darkSrc="/bg_jumbotron_dark.svg"
					fill
					loading="lazy"
					quality={40}
					style={{ objectFit: 'cover' }}
					alt="bg jumbotron"
				/>
				<motion.div
					className="relative flex flex-col items-center justify-center md:space-y-16 space-y-3 z-20"
					variants={itemVariants}
				>
					<motion.div className="flex flex-col text-center space-y-2" variants={itemVariants}>
						<h1 className="lg:text-6xl md:text-5xl text-3xl leading-tight text-main-black font-extrabold">
							QUICK TOKEN GENERATOR
						</h1>
						<p className="md:text-xl text-xs text-light-grey">
							Effortlessly streamline token deployment across BBA network with our adaptable
							platform, engineered for seamless integration
						</p>
					</motion.div>
					<motion.div variants={itemVariants}>
						<Link
							href="/tokens/create"
							className={cn(
								buttonVariants({ size: 'lg' }),
								'bg-main-green hover:bg-hover-green md:w-80 w-full md:h-16 h-9 rounded-3xl md:text-2xl text-base text-main-white'
							)}
						>
							Create Your Token
						</Link>
					</motion.div>
				</motion.div>
			</motion.section>
			<section className="bg-main-green w-full">
				<motion.div
					className="w-full 2xl:px-44 md:px-20 px-4 md:py-16 py-10"
					variants={containerVariants}
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, amount: 0.3 }}
				>
					<motion.div className="md:mb-9 mb-8 px-1.5 text-center" variants={itemVariants}>
						<h2 className="md:text-5xl text-3xl leading-tight text-white font-bold">
							Easy Steps to create your token
						</h2>
						<p className="md:text-lg mt-3 text-xs text-white">
							Create your token swiftly, in less than a minute. Choose the fastest, most secure{' '}
							<br /> way to bring your token to life, without any concessions
						</p>
					</motion.div>
					<motion.div variants={itemVariants}>
						<Tabs
							className="relative flex lg:flex-row flex-col w-full h-full justify-center lg:gap-6 md:gap-11 gap-5 items-center bg-transparent"
							defaultValue="connect_wallet"
						>
							<TabsList className="flex lg:w-1/2 w-full h-full text-left bg-transparent items-start flex-col md:gap-5 gap-3">
								{StepsData.map((step) => (
									<TabsTrigger
										key={step.value}
										value={step.value}
										className="bg-main-green hover:bg-hover-green flex data-[state=active]:bg-hover-green flex-col text-left whitespace-normal items-start rounded-xl drop-shadow-2xl p-3.5 "
									>
										<h3 className="text-white font-semibold md:text-2xl text-base">{step.title}</h3>
										<p className="md:text-base text-xs leading-tight md:mt-2 text-white">
											{step.description}
										</p>
									</TabsTrigger>
								))}
							</TabsList>
							<div className="relative lg:w-1/2 w-full md:h-80 h-48">
								{StepsData.map((step) => (
									<TabsContent
										key={step.value}
										value={step.value}
										className="relative w-full h-full"
									>
										<Image
											src={step.image}
											fill
											className="rounded-xl "
											style={{ objectFit: 'cover' }}
											alt={step.title + ' image'}
										/>
									</TabsContent>
								))}
							</div>
						</Tabs>
					</motion.div>
				</motion.div>
			</section>
			<motion.section
				className="bg-light-green md:pt-20 md:pb-9 py-6 px-[15px] flex flex-col items-center text-center"
				variants={containerVariants}
				initial="hidden"
				whileInView="show"
				viewport={{ once: true, amount: 0.3 }}
			>
				<motion.h2
					className="md:text-5xl text-3xl font-semibold text-[#333333]"
					variants={itemVariants}
				>
					Frequently Asked Questions
				</motion.h2>
				<motion.p
					className="md:text-2xl text-lg font-semibold text-[#676767] my-3"
					variants={itemVariants}
				>
					Ask us anything
				</motion.p>
				<motion.p className="text-[#676767] md:text-lg text-xs" variants={itemVariants}>
					Have any questions? We&apos;re here to assist you.
				</motion.p>
				<motion.a
					href="mailto:developers@bbachain.com"
					className={cn(
						buttonVariants({ size: 'lg' }),
						'md:w-56 w-36 md:h-14 h-9 bg-main-green hover:bg-hover-green md:mt-9 mt-3 md:text-2xl text-base rounded-3xl'
					)}
					variants={itemVariants}
				>
					Contact
				</motion.a>
			</motion.section>
			<motion.section
				className="grid md:grid-cols-3 content-center md:px-20 px-4 md:pb-20 pb-7 pt-6 gap-6"
				variants={containerVariants}
				initial="hidden"
				whileInView="show"
				viewport={{ once: true, amount: 0.3 }}
			>
				{FAQData.map((value) => (
					<motion.div key={value.question} variants={itemVariants}>
						<FAQItem {...value} />
					</motion.div>
				))}
			</motion.section>
		</>
	)
}
