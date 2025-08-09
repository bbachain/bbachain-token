'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { capitalCase } from 'text-case'

import { NoBalanceAlert } from '@/components/layout/Alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CreateCollectionDialog from '@/features/nfts/components/CreateCollectionDialog'
import SelectCollection, { SelectedItem } from '@/features/nfts/components/SelectCollection'
import { LoadingDialog, SuccessDialogNFT } from '@/features/nfts/components/StatusDialog'
import { useGetCollections, useCreateNFT, useValidateOffChainMetadata } from '@/features/nfts/services'
import { TCreateNFTPayload, TCreateNFTDialogProps } from '@/features/nfts/types'
import { CreateNFTValidation } from '@/features/nfts/validation'
import { useGetBalance } from '@/services/wallet'
import { useErrorDialog } from '@/stores/errorDialog'

const initialDialogContent: TCreateNFTDialogProps = {
	title: '',
	description: ''
}

export default function CreateNFT() {
	const form = useForm<TCreateNFTPayload>({
		resolver: zodResolver(CreateNFTValidation),
		defaultValues: {
			uri: '',
			collection: null
		}
	})

	const router = useRouter()
	const query = useSearchParams()
	const collectionKey = query.get('collectionKey')

	const createNFTMutation = useCreateNFT()
	const getCollectionQuery = useGetCollections()
	const validateMetadataMutation = useValidateOffChainMetadata()
	const getBalanceQuery = useGetBalance()
	const isNoBalance = getBalanceQuery.isError || !getBalanceQuery.data || getBalanceQuery.data === 0

	const [step, setStep] = useState<'upload' | 'preview'>('upload')
	const [isCreateCollection, setIsCreateCollection] = useState<boolean>(false)
	const [isSuccessDialog, setIsSuccessDialog] = useState<boolean>(false)
	const [successDialogProps, setSuccessDialogProps] = useState<TCreateNFTDialogProps>(initialDialogContent)
	const [isLoadingDialog, setIsLoadingDialog] = useState<boolean>(false)
	const [loadingDialogProps, setLoadingDialogProps] = useState<TCreateNFTDialogProps>(initialDialogContent)
	const [selectedCollection, setSelectedCollection] = useState<SelectedItem | null>(null)

	const collectionListData = useMemo(() => {
		if (getCollectionQuery.data) {
			return getCollectionQuery.data.data.map((data) => ({
				mintAddress: data.mintAddress,
				name: data.metadata.name ?? ''
			}))
		}
		return []
	}, [getCollectionQuery.data])

	const metadataOffChainData = validateMetadataMutation.data?.data
	const metadataPreview = {
		name: metadataOffChainData?.name,
		symbol: metadataOffChainData?.symbol,
		description: metadataOffChainData?.description
	}

	const { openErrorDialog } = useErrorDialog()

	useEffect(() => {
		if (collectionKey && collectionListData.length > 0) {
			const data = collectionListData.find((data) => data.mintAddress === collectionKey)
			if (data) setSelectedCollection(data)
		}
	}, [collectionKey, collectionListData])

	useEffect(() => {
		if (validateMetadataMutation.isPending) setIsLoadingDialog(true)
		setLoadingDialogProps({
			title: 'Parsing Metadata',
			description: 'We’re loading and validating your metadata. Please wait a moment.'
		})

		return () => setIsLoadingDialog(false)
	}, [validateMetadataMutation.isPending])

	useEffect(() => {
		if (validateMetadataMutation.isSuccess && validateMetadataMutation.data) {
			setIsLoadingDialog(false)
			setIsSuccessDialog(true)
			setSuccessDialogProps({
				title: validateMetadataMutation.data.message,
				description: 'Metadata loaded successfully. You can now review and mint.'
			})
			setStep('preview')
		}
	}, [validateMetadataMutation.data, validateMetadataMutation.isSuccess])

	useEffect(() => {
		if (validateMetadataMutation.isError && validateMetadataMutation.error) {
			setIsLoadingDialog(false)
			openErrorDialog({
				title: validateMetadataMutation.error.errorMessage,
				description: <p className="pre">{validateMetadataMutation.error.errorDetail}</p>
			})
		}
	}, [openErrorDialog, validateMetadataMutation.error, validateMetadataMutation.isError])

	useEffect(() => {
		if (createNFTMutation.isPending) setIsLoadingDialog(true)
		setLoadingDialogProps({
			title: 'Minting NFT',
			description: 'We’re minting your NFT. This may take a few seconds...'
		})

		return () => setIsLoadingDialog(false)
	}, [createNFTMutation.isPending])

	useEffect(() => {
		if (createNFTMutation.isSuccess && createNFTMutation.data) {
			setIsLoadingDialog(false)
			setIsSuccessDialog(true)
			setSuccessDialogProps({
				title: createNFTMutation.data.message,
				description: 'Your NFT has been minted and added to your wallet.'
			})
			form.reset()
			setStep('upload')
		}
	}, [form, createNFTMutation.data, createNFTMutation.isSuccess])

	useEffect(() => {
		if (createNFTMutation.isError && createNFTMutation.error) {
			setIsLoadingDialog(false)
			openErrorDialog({
				title: 'We can not proceed your transaction',
				description: createNFTMutation.error.message
			})
		}
	}, [createNFTMutation.error, createNFTMutation.isError, openErrorDialog])

	const onValidateMetadata = (payload: TCreateNFTPayload) => {
		if (getBalanceQuery.isError || !getBalanceQuery.data) {
			toast.error('Empty balance amount')
			return
		}
		validateMetadataMutation.mutate(payload)
	}

	const onCreateNFT = (payload: TCreateNFTPayload) => createNFTMutation.mutate(payload)

	if (getBalanceQuery.isLoading)
		return (
			<div className="h-full w-full md:mt-20 mt-40 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Please wait...</p>
			</div>
		)

	return (
		<div className="xl:px-24 md:px-16 px-[15px]">
			<LoadingDialog
				isOpen={isLoadingDialog}
				title={loadingDialogProps.title}
				description={loadingDialogProps.description}
			/>
			<SuccessDialogNFT
				isOpen={isSuccessDialog}
				onOpenChange={setIsSuccessDialog}
				title={successDialogProps.title}
				description={successDialogProps.description}
			/>
			<CreateCollectionDialog isOpen={isCreateCollection} onOpenChange={setIsCreateCollection} />
			{isNoBalance && (
				<div className="mb-7">
					<NoBalanceAlert />
				</div>
			)}
			{step === 'preview' && (
				<div>
					<Button
						variant="ghost"
						onClick={() => setStep('upload')}
						className={'md:flex hidden w-52 mb-3 text-main-black items-center space-x-2.5 text-xl'}
					>
						<HiOutlineArrowNarrowLeft />
						<h4>Upload Metadata</h4>
					</Button>
					<form
						onSubmit={form.handleSubmit(onCreateNFT)}
						className="flex md:w-[600px] mx-auto w-full flex-col md:space-y-6 space-y-3"
					>
						<h3 className="text-center text-main-black font-medium text-[32px]">Metadata Preview</h3>
						<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
							<CardContent className="flex flex-col space-y-3 p-0">
								{/* eslint-disable-next-line @next/next/no-img-element*/}
								<img
									src={metadataOffChainData?.image ?? ''}
									width={112}
									height={112}
									alt={`${metadataOffChainData?.name} image`}
									className="rounded-[6px]"
								/>
								<section className="flex flex-col space-y-6">
									{Object.entries(metadataPreview).map(([key, value]) => (
										<div key={key} className="flex items-center space-x-1.5 text-base">
											<h4 className="lg:w-[160px] text-dark-grey">{capitalCase(key)}</h4>
											<span>:</span>
											<p className="w-full truncate text-main-black">{value}</p>
										</div>
									))}
									<div className="flex items-center space-x-1.5 text-base">
										<h4 className="lg:w-[160px] text-dark-grey">Attributes</h4>
										<span>:</span>
										<div className="flex w-full flex-wrap gap-2">
											{metadataOffChainData?.attributes?.map((attribute) => (
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
									</div>
								</section>
							</CardContent>
						</Card>
						<div>
							<Label className="text-main-black text-sm font-medium">Assign to a Collection (optional)</Label>
							<SelectCollection
								selected={selectedCollection}
								setSelected={setSelectedCollection}
								isDataPending={getCollectionQuery.isPending}
								collectionList={collectionListData}
								onCreateNew={() => setIsCreateCollection(true)}
							/>
						</div>
						<div className="flex justify-center">
							<Button
								type="submit"
								className="md:w-[350px] rounded-[48px] md:h-[55px] h-[43px] text-base md:text-xl py-3 w-full text-main-white bg-main-green"
							>
								Mint NFT
							</Button>
						</div>
					</form>
				</div>
			)}
			{step === 'upload' && (
				<Form {...form}>
					<form
						className="md:w-[600px] mx-auto w-full flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
						onSubmit={form.handleSubmit(onValidateMetadata)}
					>
						<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">Mint New NFT</h1>
						<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
							<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
								<CardTitle className="md:text-[28px] text-lg text-main-black font-medium">Upload Metadata</CardTitle>
								<CardDescription className="md:text-xl pt-2.5 text-base text-light-grey">
									Upload or link to your JSON metadata files hosted on IPFS or Arweave.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col md:space-y-[25px] space-y-3 p-0">
								<FormField
									control={form.control}
									name="uri"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Metadata Folder URL</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green md:h-[55px]  focus:border-hover-green rounded-[8px] w-full"
													type="text"
													placeholder="Enter Metadata URI"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<CardFooter className="flex p-0 justify-end">
									<Button
										type="submit"
										className="bg-main-green w-[229px] text-center flex justify-center items-center hover:bg-hover-green text-main-white md:h-[48px] h-[34px] md:px-6 md:py-3 p-3 rounded-[43px] md:text-lg text-base"
									>
										Preview Metadata
										<ChevronRight className="md:min-w-[30px] min-w-[10px] min-h-[30px]" />
									</Button>
								</CardFooter>
							</CardContent>
						</Card>
					</form>
				</Form>
			)}
		</div>
	)
}
