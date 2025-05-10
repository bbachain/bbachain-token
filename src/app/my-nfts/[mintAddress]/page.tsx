'use client'
import { useGetNFTDataDetail } from '@/components/account/account-data-access'
import { PublicKey } from '@bbachain/web3.js'
import { CopyTooltip } from '@/components/common/copy'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { FiExternalLink } from 'react-icons/fi'
import moment from 'moment'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { Button, buttonVariants } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { TokenDetailCard } from '@/components/tokens/token-detail'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { ShowImageDialog } from '@/components/nft/dialog'
import { cn } from '@/lib/utils'

export default function NFTDetail({ params }: { params: { mintAddress: string } }) {
	const mintKey = new PublicKey(params.mintAddress)
	const { getExplorerUrl } = useCluster()
	const router = useRouter()

	const getNFTDetailData = useGetNFTDataDetail({ mintAddress: mintKey })
	const NFTDetailData = getNFTDetailData.data
	const [isImageOpen, setIsImageOpen] = useState<boolean>(false)

	const downloadImage = async (url: string, filename: string) => {
		const response = await fetch(url, { mode: 'cors' })
		const blob = await response.blob()
		const blobUrl = window.URL.createObjectURL(blob)

		const a = document.createElement('a')
		a.href = blobUrl
		a.download = filename
		a.click()

		window.URL.revokeObjectURL(blobUrl)
	}

	const NFTAboutData = [
		{
			label: 'Name',
			value: NFTDetailData?.metadataURI.name ?? ''
		},
		{
			label: 'Symbol',
			value: NFTDetailData?.metadataURI.symbol ?? ''
		},
		{
			label: 'Collection',
			value: '-'
		},
		{
			label: 'Family',
			value: NFTDetailData?.metadataURI.collection?.family ?? '-'
		},
		{
			label: 'Mint Date',
			value: moment.unix(NFTDetailData?.date ?? 0).format('D MMM, YYYY')
		}
	]

	const NFTBlockchainInfo = [
		{
			label: 'Address',
			component: (
				<div className="flex items-center">
					<p className="text-main-black w-full md:max-w-[101px] max-w-[90px] !truncate">{NFTDetailData?.mintAddress}</p>
					<CopyTooltip secretValue={NFTDetailData?.mintAddress ?? ''} />
				</div>
			)
		},
		{
			label: 'Explorer Link',
			component: (
				<a
					className="flex items-center text-main-green hover:text-hover-green "
					href={getExplorerUrl(`address/${NFTDetailData?.mintAddress}`)}
					target="_blank"
					rel="noopener noreferrer"
				>
					View on BBA Explorer
					<Button type="button" className="text-main-black" size="icon" variant="ghost">
						<FiExternalLink className="text-lg" />
					</Button>
				</a>
			)
		}
	]

	const metaDataInfo = [
		{
			label: 'Description',
			component: <p className="truncate text-main-black text-base">{NFTDetailData?.metadataURI.description}</p>
		},
		{
			label: 'Attributes',
			component: (
				<div className="flex flex-wrap gap-2">
					{NFTDetailData?.metadataURI.attributes?.map((attribute) => (
						<div
							key={attribute.trait_type}
							className="bg-box w-auto text-sm px-3 h-8 py-1.5 rounded-[8px] flex items-center space-x-1.5"
						>
							<h4 className="font-semibold  text-sm text-main-black">{attribute.trait_type}</h4>
							<span className="text-light-grey  text-base">:</span>
							<p className="text-light-grey text-xs">{attribute.value}</p>
						</div>
					))}
				</div>
			)
		},
		{
			label: 'Minted On',
			component: (
				<p className="truncate text-main-black text-base">
					{moment.unix(NFTDetailData?.date ?? 0).format('D MMM, YYYY')}
				</p>
			)
		},
		{
			label: 'Creator Wallet',
			component: (
				<div className="flex items-center">
					<p className="text-main-black w-full md:max-w-[101px] max-w-[90px] !truncate">
						{NFTDetailData?.creators ? NFTDetailData.creators[0].address.toBase58() : '-'}
					</p>
					<CopyTooltip secretValue={NFTDetailData?.creators ? NFTDetailData.creators[0].address.toBase58() : '-'} />
				</div>
			)
		},
		{
			label: 'Royalty Info',
			component: (
				<p className="truncate text-main-black text-base">{(NFTDetailData?.sellerFeeBasisPoints ?? 0) / 100}%</p>
			)
		},
		{
			label: 'IPFS Link',
			component: (
				<div className="flex items-center">
					<a
						className="text-main-green hover:text-hover-green w-full md:max-w-[101px] max-w-[90px] !truncate"
						href={NFTDetailData?.metadataLink ?? ''}
						target="_blank"
						rel="noopener noreferrer"
					>
						{NFTDetailData?.metadataLink}
					</a>
					<CopyTooltip secretValue={NFTDetailData?.metadataLink ?? ''} />
				</div>
			)
		}
	]

	if (getNFTDetailData.isLoading) {
		return (
			<div className="xl:px-[90px] md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col md:space-y-6 space-y-3">
				<section className="w-full flex justify-center">
					<Skeleton className="h-5 w-72 rounded-[16px]" />
				</section>
				<section className="flex xl:flex-row flex-col xl:space-x-6 md:space-y-6 space-y-3 xl:space-y-0 justify-between">
					<Skeleton className="w-full rounded-[16px] xl:h-72 h-48 " />
					<Skeleton className="w-full rounded-[16px] xl:h-72 h-48 " />
				</section>
				<Skeleton className="h-48 w-full rounded-[16px]" />
			</div>
		)
	}

	return (
		<div className="2xl:px-[90px] xl:px-[80px] md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5">
			<ShowImageDialog
				isOpen={isImageOpen}
				onOpenChange={setIsImageOpen}
				title={NFTDetailData?.metadataURI.name ?? '-'}
				image={NFTDetailData?.metadataURI.image ?? ''}
				description={''}
			/>
			<div className="flex flex-col md:space-y-6 space-y-3">
				<section>
					<Button
						variant="ghost"
						onClick={() => router.push('/my-nfts')}
						className={'md:flex hidden w-32 mb-3 text-main-black items-center space-x-2.5 text-xl'}
					>
						<HiOutlineArrowNarrowLeft />
						<h4>My NFTs</h4>
					</Button>
					<h2 className="text-main-black text-center md:text-[32px] text-xl  font-medium">
						{NFTDetailData?.metadataURI.name ?? ''}
					</h2>
				</section>
				<section className="flex xl:flex-row flex-col xl:space-x-6 md:space-y-6 space-y-3 xl:space-y-0 justify-between">
					<TokenDetailCard className="min-h-[346px]" title="About">
						<section className="flex md:flex-row md:space-y-0 space-y-6 space-y-reverse flex-col justify-between">
							<div className="flex md:order-1 order-2 flex-col space-y-[18px]">
								{NFTAboutData.map((about) => (
									<div className="flex items-center space-x-3 md:text-base text-sm text-main-black" key={about.label}>
										<p className="lg:w-[160px] w-[112px]">{about.label}</p>
										<span>:</span>
										<p className="truncate text-main-black text-base">{about.value}</p>
									</div>
								))}
							</div>
							<div className="group w-[169px] h-[169px] relative flex md:flex-col md:order-2 order-1 justify-center flex-row items-center  md:space-x-0 space-x-2.5">
								<Image
									src={NFTDetailData?.metadataURI.image ?? '/icon-placeholder.svg'}
									fill
									style={{ objectFit: 'cover' }}
									alt={NFTDetailData?.metadataURI.name + '-' + 'icon'}
									className="rounded-[10px]"
								/>
								<div className="absolute rounded-[10px] h-full w-full inset-0 bg-black/50 hidden group-hover:flex items-center justify-center gap-4">
									<Button
										size="icon"
										onClick={() => setIsImageOpen(true)}
										variant="outline"
										className="rounded-full text-white bg-transparent border-white"
									>
										<Maximize2 />
									</Button>
									<Button
										size="icon"
										variant="outline"
										className={'rounded-full text-white bg-transparent border-white'}
										onClick={() =>
											downloadImage(NFTDetailData?.metadataURI.image ?? '', NFTDetailData?.metadataURI.name ?? '')
										}
									>
										<Download />
									</Button>
								</div>
							</div>
						</section>
					</TokenDetailCard>
					<TokenDetailCard className="min-h-[346px]" title=" Blockchain Info">
						<section className="flex flex-col space-y-[18px]">
							{NFTBlockchainInfo.map((info) => (
								<div className="flex items-center space-x-3 md:text-base text-sm text-main-black" key={info.label}>
									<p className="lg:w-[160px] w-[112px]">{info.label}</p>
									<span>:</span>
									{info.component}
								</div>
							))}
						</section>
					</TokenDetailCard>
				</section>
				<TokenDetailCard title="Metadata">
					<section className="flex flex-col space-y-[18px]">
						{metaDataInfo.map((info) => (
							<div className="flex items-center space-x-3 md:text-base text-sm text-main-black" key={info.label}>
								<p className="lg:w-[160px] w-[112px]">{info.label}</p>
								<span>:</span>
								{info.component}
							</div>
						))}
					</section>
				</TokenDetailCard>
			</div>
		</div>
	)
}
