'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
	NFTMetadataSchema,
	UploadCollectionPayload,
	UploadCollectionSchema,
	UploadNFTMetadataPayload,
	UploadNFTMetadataSchema
} from '@/lib/validation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { LoadingDialog, SuccessDialogCollection, SuccessDialogNFT } from '@/components/nft/dialog'
import { useEffect, useMemo, useState } from 'react'
import { capitalCase } from 'text-case'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { ZodError } from 'zod'
import { useErrorDialog } from '@/lib/hooks'
import { useGetBalance, useMintCollectionCreator } from '@/components/account/account-data-access'
import { useWallet } from '@bbachain/wallet-adapter-react'
import { NoBalanceAlert } from '@/components/common/alert'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function CreateCollection() {
	const { publicKey } = useWallet()

	const address = useMemo(() => {
		if (!publicKey) return
		return publicKey
	}, [publicKey])

	const formUpload = useForm<UploadNFTMetadataPayload>({
		resolver: zodResolver(UploadNFTMetadataSchema),
		defaultValues: {
			name: '',
			metadata_uri: ''
		}
	})

	const formCollection = useForm<UploadCollectionPayload>({
		resolver: zodResolver(UploadCollectionSchema),
		defaultValues: {
			name: '',
			symbol: '',
			royalities: '',
			metadata_uri: ''
		}
	})

	const [step, setStep] = useState<'upload' | 'preview'>('upload')
	const [isSuccessDialogMetadata, setIsSuccessDialogMetadata] = useState<boolean>(false)
	const [isSuccessDialogCollection, setIsSuccessDialogCollection] = useState<boolean>(false)

	const getTokenBalance = useGetBalance({ address: address! })

	const validateMetadataMutation = useMutation({
		mutationKey: ['validate-metadata'],
		mutationFn: async (metadata_uri: string) => {
			const response = await axios.get(metadata_uri)
			const result = await NFTMetadataSchema.parseAsync(response.data)
			return result
		}
	})

	const mintCollectionMutation = useMintCollectionCreator()

	const onMintCollection = (payload: UploadCollectionPayload) => {
		console.log('hahhaha')
		mintCollectionMutation.mutate(payload)
	}

	const onErrorMintCollection = (error: any) => {
		console.log(error)
	}

	const { openErrorDialog } = useErrorDialog()

	useEffect(() => {
		if (validateMetadataMutation.isSuccess && validateMetadataMutation.data) {
			setIsSuccessDialogMetadata(true)
			const nameOnChain = formUpload.getValues('name')
			const metadataUri = formUpload.getValues('metadata_uri')
			formCollection.setValue('name', nameOnChain)
			formCollection.setValue('symbol', validateMetadataMutation.data.symbol)
			formCollection.setValue('metadata_uri', metadataUri)
			formCollection.setValue('royalities', validateMetadataMutation.data.seller_fee_basis_points.toString())
			setStep('preview')
		}
	}, [formCollection, formUpload, validateMetadataMutation.data, validateMetadataMutation.isSuccess])

	useEffect(() => {
		if (validateMetadataMutation.isError && validateMetadataMutation.error) {
			if (axios.isAxiosError(validateMetadataMutation.error)) {
				openErrorDialog({ title: 'Invalid Metadata URL', description: validateMetadataMutation.error.message })
				return
			}

			if (validateMetadataMutation.error instanceof ZodError) {
				const groupedErrors: Record<string, string[]> = {}

				// Group all paths by their error message
				for (const err of validateMetadataMutation.error.errors) {
					const path = err.path.join('.')
					if (!groupedErrors[err.message]) {
						groupedErrors[err.message] = []
					}
					groupedErrors[err.message].push(path || '(root)')
				}

				const readableErrorsJSX = Object.entries(groupedErrors).map(([message, paths], idx) => (
					<p key={idx}>
						<strong>{paths.join(', ')}</strong>: {message}
					</p>
				))

				openErrorDialog({ title: 'Invalid Metadata Format', description: <div>{readableErrorsJSX}</div> })
				return
			}

			// Catch-all for other error types
			openErrorDialog({
				title: 'Unknown Error',
				description: 'An unknown error occurred while validating metadata.'
			})
		}
	}, [openErrorDialog, validateMetadataMutation.error, validateMetadataMutation.isError])

	useEffect(() => {
		if (mintCollectionMutation.isSuccess && mintCollectionMutation.data) {
			setIsSuccessDialogCollection(true)
			formUpload.reset()
			setStep('upload')
		}
	}, [formUpload, mintCollectionMutation.data, mintCollectionMutation.isSuccess])

	useEffect(() => {
		if (mintCollectionMutation.isError && mintCollectionMutation.error) {
			openErrorDialog({
				title: 'We can not proceed your transaction',
				description: mintCollectionMutation.error.message
			})
		}
	}, [mintCollectionMutation.error, mintCollectionMutation.isError, openErrorDialog])

	const onValidate = (payload: UploadNFTMetadataPayload) => {
		if (getTokenBalance.isError || (!getTokenBalance.data && address)) {
			toast.error('Empty balance amount')
			return
		}
		validateMetadataMutation.mutate(payload.metadata_uri)
	}

	if (address && getTokenBalance.isLoading)
		return (
			<div className="h-full w-full  mt-60 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Please wait...</p>
			</div>
		)

	return (
		<div className="md:mt-40 mt-20 md:mb-20 mb-5">
			<LoadingDialog
				title={mintCollectionMutation.isPending ? 'Creating Your Collection NFT…' : 'Parsing Metadata'}
				description={
					mintCollectionMutation.isPending
						? 'Please wait while your metadata is uploaded and the transaction is confirmed.'
						: 'We’re loading and validating your metadata. Please wait a moment.'
				}
				isOpen={mintCollectionMutation.isPending || validateMetadataMutation.isPending}
			/>
			<SuccessDialogNFT
				isOpen={isSuccessDialogMetadata}
				onOpenChange={setIsSuccessDialogMetadata}
				title={'Metadata Preview Loaded Successfully'}
				description={'Metadata loaded successfully. You can now review and mint.'}
			/>
			<SuccessDialogCollection
				isOpen={isSuccessDialogCollection}
				onOpenChange={setIsSuccessDialogCollection}
				data={{
					name: mintCollectionMutation.data?.data.name ?? '',
					image: validateMetadataMutation.data?.image ?? '',
					mintAddress: mintCollectionMutation.data?.mintAddress ?? ''
				}}
			/>
			{getTokenBalance.isError ||
				(!getTokenBalance.data && address && (
					<div className="xl:px-48 md:px-16 px-[15px] md:mb-9 mb-3">
						{' '}
						<NoBalanceAlert address={address} />{' '}
					</div>
				))}
			<h1 className="text-center md:text-[55px] md:mb-9 md-3 leading-tight text-xl font-bold text-main-black">
				Create NFT Collection
			</h1>
			{step === 'preview' && (
				<Form {...formCollection}>
					<form
						className="xl:px-[420px] md:px-16 px-[15px] flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
						onSubmit={formCollection.handleSubmit(onMintCollection, onErrorMintCollection)}
					>
						<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
							<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
								<CardTitle className="md:text-[28px] text-lg text-main-black font-medium">Upload Metadata</CardTitle>
								<CardDescription className="md:text-xl pt-2.5 text-base text-light-grey">
									<Image
										src={validateMetadataMutation.data?.image ?? ''}
										width={112}
										height={112}
										alt={`${validateMetadataMutation.data?.name} image`}
										className="rounded-[8px]"
									/>
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col space-y-3 p-0">
								<FormField
									control={formCollection.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Collection Name</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green md:h-[55px] focus:border-hover-green rounded-[8px] w-full"
													type="text"
													placeholder="Enter Collection Name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={formCollection.control}
									name="symbol"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Symbol</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green md:h-[55px]  focus:border-hover-green rounded-[8px] w-full"
													type="text"
													placeholder="Enter your symbol"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={formCollection.control}
									name="royalities"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Royalities (optional)</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green md:h-[55px]  focus:border-hover-green rounded-[8px] w-full"
													type="number"
													placeholder="Enter your royalitites"
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
										className="bg-main-green w-[261px] text-center flex justify-center items-center hover:bg-hover-green text-main-white md:h-[48px] h-[34px] md:px-6 md:py-3 p-3 rounded-[43px] md:text-lg text-base"
									>
										Create Collection NFT
										<ChevronRight className="md:min-w-[30px] min-w-[10px] min-h-[30px]" />
									</Button>
								</CardFooter>
							</CardContent>
						</Card>
					</form>
				</Form>
			)}
			{step === 'upload' && (
				<Form {...formUpload}>
					<form
						className="xl:px-[420px] md:px-16 px-[15px] flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
						onSubmit={formUpload.handleSubmit(onValidate)}
					>
						<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
							<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
								<CardTitle className="md:text-[28px] text-lg text-main-black font-medium">Upload Metadata</CardTitle>
								<CardDescription className="md:text-xl pt-2.5 text-base text-light-grey">
									Upload or link to your JSON metadata files hosted on IPFS or Arweave.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col md:space-y-[25px] space-y-3 p-0">
								<FormField
									control={formUpload.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Collection Name</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green md:h-[55px] focus:border-hover-green rounded-[8px] w-full"
													type="text"
													placeholder="Enter Collection Name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={formUpload.control}
									name="metadata_uri"
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
										className="bg-main-green w-[122px] text-center flex justify-center items-center hover:bg-hover-green text-main-white md:h-[48px] h-[34px] md:px-6 md:py-3 p-3 rounded-[43px] md:text-lg text-base"
									>
										Next
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
