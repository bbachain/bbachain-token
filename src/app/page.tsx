'use client'

import FAQItem from '@/components/common/faq-item'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FAQData } from '@/lib/static'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export default function Home() {
	const router = useRouter()
	return (
		<>
			<section className="dark:bg-[url('/bg_jumbotron_dark.svg')] bg-[url('/bg_jumbotron_light.svg')] lg:px-0 md:px-10 px-[15px] md:pt-[195px] pt-28 md:pb-[152px]  pb-6 flex flex-col md:space-y-14 space-y-3 text-center h-full bg-cover items-center justify-center">
				<div>
					<h1 className="lg:text-[70px] md:text-5xl leading-tight text-[32px] text-main-black font-extrabold">
						QUICK TOKEN GENERATOR
					</h1>
					<p className="md:text-xl mt-[6px] text-xs text-light-grey">
						Effortlessly streamline token deployment across BBA network with our adaptable platform, engineered for
						seamless integration
					</p>
				</div>
				<Button
					type="button"
					onClick={() => router.push('/create-token')}
					className="bg-main-green hover:bg-hover-green md:w-80 w-full md:h-16 h-[34px] rounded-[30px] md:text-2xl text-base text-main-white"
					size="lg"
				>
					Create Your Token
				</Button>
			</section>
			<section className="bg-main-green lg:py-16 md:pt-16 md:pb-24 xl:px-44 pt-6 pb-10 md:px-20 px-[15px]">
				<div className="lg:mb-[35px] md:mb-32 mb-8">
					<h2 className="text-center lg:text-[55px] leading-tight md:text-5xl text-[28px] text-white font-bold">
						Easy Steps to create your token
					</h2>
					<p className="md:text-lg mt-3 text-xs text-white text-center">
						Create your token swiftly, in less than a minute. Choose the fastest, most secure <br /> way to bring your
						token to life, without any concessions
					</p>
				</div>
				<Tabs
					className="lg:h-[467px] md:h-[673px] h-[603px] flex lg:flex-row flex-col w-full justify-center lg:space-x-6 md:space-y-11 space-y-[18px] lg:space-y-0 items-center  bg-transparent"
					defaultValue="connect_wallet"
				>
					<TabsList className="flex md:w-[600px] lg:h-[467px] h-[392px] text-left bg-transparent items-start flex-col md:space-y-5 space-y-3">
						<TabsTrigger
							className="bg-main-green hover:bg-hover-green flex data-[state=active]:bg-hover-green flex-col text-left whitespace-normal items-start rounded-[10px] drop-shadow-2xl p-3.5 "
							value="connect_wallet"
						>
							<h4 className="text-white font-semibold md:text-[26px] text-base">Connect Wallet</h4>
							<p className="md:text-base text-xs leading-tight md:mt-2 text-white">
								Link your wallet to the platform for seamless management of funds during the token creation process.
							</p>
						</TabsTrigger>
						<TabsTrigger
							className="bg-main-green hover:bg-hover-green flex data-[state=active]:bg-hover-green flex-col text-left whitespace-normal items-start rounded-[10px] drop-shadow-2xl p-3.5 "
							value="token_details"
						>
							<h4 className="text-white font-semibold md:text-[26px] text-base">Add Token Details</h4>
							<p className="md:text-base text-xs leading-tight md:mt-2 text-white">
								Customize your token by providing essential information such as its name, symbol, and total supply.
							</p>
						</TabsTrigger>
						<TabsTrigger
							className="bg-main-green hover:bg-hover-green flex data-[state=active]:bg-hover-green flex-col text-left whitespace-normal items-start rounded-[10px] drop-shadow-2xl p-3.5 "
							value="add_features"
						>
							<h4 className="text-white font-semibold md:text-[26px] text-base">Add Features</h4>
							<p className="md:text-base text-xs leading-tight md:mt-2 text-white">
								Tailor your token&apos;s functionality by choosing from a variety of features such as smart contract
								conditions and governance structures.
							</p>
						</TabsTrigger>
						<TabsTrigger
							className="bg-main-green hover:bg-hover-green flex data-[state=active]:bg-hover-green flex-col text-left whitespace-normal items-start rounded-[10px] drop-shadow-2xl p-3.5 "
							value="deploy_token"
						>
							<h4 className="text-white font-semibold md:text-[26px] text-base">Deploy Token</h4>
							<p className="md:text-base text-xs leading-tight md:mt-2 text-white">
								Finalize and launch your token onto the blockchain network, making it accessible for users within your
								ecosystem.
							</p>
						</TabsTrigger>
					</TabsList>
					<div className="lg:w-5/12">
						<TabsContent value="connect_wallet">
							<Image
								src="/connect_wallet.svg"
								width={550}
								height={330}
								className="rounded-[10px]"
								alt="connect wallet image"
							/>
						</TabsContent>
						<TabsContent value="token_details">
							<Image
								src="/token_details.svg"
								width={550}
								height={330}
								className="rounded-[10px]"
								alt="connect wallet image"
							/>
						</TabsContent>
						<TabsContent value="add_features">
							<Image
								src="/add_features.svg"
								width={550}
								height={330}
								className="rounded-[10px]"
								alt="connect wallet image"
							/>
						</TabsContent>
						<TabsContent className="h-full" value="deploy_token">
							<Image
								src="/deploy_token.svg"
								width={550}
								height={330}
								className="rounded-[10px]"
								alt="connect wallet image"
							/>
						</TabsContent>
					</div>
				</Tabs>
			</section>
			<section className="bg-light-green md:pt-20 md:pb-9 py-6 px-[15px] flex flex-col items-center ">
				<h2 className="md:text-[55px] text-center text-[28px] font-semibold text-[#333333]">
					Frequently Asked Questions
				</h2>
				<h5 className="md:text-[22px]  text-lg text-center font-semibold text-[#676767] my-3">Ask us anything</h5>
				<p className="text-[#676767] md:text-lg text-xs text-center">
					Have any questions? We&apos;re here to assist you.
				</p>
				<a
					href="mailto:developers@bbachain.com"
					className={cn(
						buttonVariants({ size: 'lg' }),
						'md:w-[230px] hover:bg-hover-green w-[140px] md:mt-9 mt-3 md:text-2xl text-base md:h-[54px] h-[34px] rounded-[30px] bg-main-green'
					)}
				>
					Contact
				</a>
			</section>
			<section className="grid md:grid-cols-3 content-center md:px-20 px-[15px] md:pb-20 pb-7 pt-6 gap-6">
				{FAQData.map((value) => (
					<FAQItem key={value.question} {...value} />
				))}
			</section>
		</>
	)
}
