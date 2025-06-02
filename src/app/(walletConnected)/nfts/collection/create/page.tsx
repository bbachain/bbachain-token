'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingDialog, SuccessDialogCollection, SuccessDialogNFT } from '@/features/nfts/components/StatusDialog'
import { useCreateCollection, useValidateOffChainMetadata } from '@/features/nfts/services'
import { TCreateCollectionPayload, TCreateNFTDialogProps } from '@/features/nfts/types'
import { CreateCollectionValidation } from '@/features/nfts/validation'
import { useGetBalance } from '@/services/wallet'
import { useErrorDialog } from '@/stores/errorDialog'

type FieldName = keyof TCreateCollectionPayload

const createCollectionSteps = [
	{
		id: 1,
		name: 'Upload Metadata',
		fields: ['uri']
	},
	{
		id: 2,
		name: 'Collection Details',
		fields: ['name', 'symbol', 'sellerFeeBasisPoints']
	}
]

export default function CreateCollection() {
	const form = useForm<TCreateCollectionPayload>({
		resolver: zodResolver(CreateCollectionValidation),
		defaultValues: {
			uri: '',
			name: '',
			symbol: '',
			sellerFeeBasisPoints: '500'
		}
	})

	const createCollectionMutation = useCreateCollection()
	const validateMetadataMutation = useValidateOffChainMetadata()
	const getBalanceQuery = useGetBalance()

	const [step, setStep] = useState<number>(0)
	const [isSuccessDialogMetadata, setIsSuccessDialogMetadata] = useState<boolean>(false)
	const [isSuccessDialogCollection, setIsSuccessDialogCollection] = useState<boolean>(false)
	const [isLoadingDialog, setIsLoadingDialog] = useState<boolean>(false)
	const [loadingDialogProps, setLoadingDialogProps] = useState<TCreateNFTDialogProps>({
		title: '',
		description: ''
	})

	const onValidateMetata = async () => {
		const fields = ['uri']
		const isValid = await form.trigger(fields as FieldName[], { shouldFocus: true })

		if (!isValid) return

		validateMetadataMutation.mutate({ uri: form.getValues('uri') })
	}

	const onCreateCollection = async (payload: TCreateCollectionPayload) => createCollectionMutation.mutate(payload)

	const { openErrorDialog } = useErrorDialog()

	useEffect(() => {
		if (validateMetadataMutation.isPending) {
			setIsLoadingDialog(true)
			setLoadingDialogProps({
				title: 'Parsing Metadata',
				description: 'We’re loading and validating your metadata. Please wait a moment.'
			})
			return () => setIsLoadingDialog(false)
		}
	}, [validateMetadataMutation.isPending])

	useEffect(() => {
		if (validateMetadataMutation.isSuccess && validateMetadataMutation.data) {
			setIsLoadingDialog(false)
			setIsSuccessDialogMetadata(true)
			form.setValue('name', validateMetadataMutation.data.data.name)
			form.setValue('symbol', validateMetadataMutation.data.data.symbol)
			form.setValue('sellerFeeBasisPoints', validateMetadataMutation.data.data.seller_fee_basis_points.toString())
			setStep(1)
		}
	}, [form, validateMetadataMutation.data, validateMetadataMutation.isSuccess])

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
		if (createCollectionMutation.isPending) {
			setIsLoadingDialog(true)
			setLoadingDialogProps({
				title: 'Creating Your Collection NFT…',
				description: 'Please wait while your metadata is uploaded and the transaction is confirmed.'
			})
			return () => setIsLoadingDialog(false)
		}
	}, [createCollectionMutation.isPending])

	useEffect(() => {
		if (createCollectionMutation.isSuccess && createCollectionMutation.data) {
			setIsLoadingDialog(false)
			setIsSuccessDialogCollection(true)
			form.reset()
			setStep(0)
		}
	}, [createCollectionMutation.data, createCollectionMutation.isSuccess, form])

	useEffect(() => {
		if (createCollectionMutation.isError && createCollectionMutation.error) {
			setIsLoadingDialog(false)
			openErrorDialog({
				title: 'We can not proceed your transaction',
				description: createCollectionMutation.error.message
			})
		}
	}, [createCollectionMutation.error, createCollectionMutation.isError, openErrorDialog])

	return (
		<>
			<LoadingDialog
				title={loadingDialogProps.title}
				description={loadingDialogProps.description}
				isOpen={isLoadingDialog}
			/>
			<SuccessDialogNFT
				isOpen={isSuccessDialogMetadata}
				onOpenChange={setIsSuccessDialogMetadata}
				title={validateMetadataMutation.data?.message ?? ''}
				description={'Metadata loaded successfully. You can now review and mint.'}
			/>
			<SuccessDialogCollection
				isOpen={isSuccessDialogCollection}
				onOpenChange={setIsSuccessDialogCollection}
				message={createCollectionMutation.data?.message ?? ''}
				data={{
					image: validateMetadataMutation.data?.data.image ?? '',
					mintAddress: createCollectionMutation.data?.data.mintAddress ?? ''
				}}
			/>
			<h1 className="text-center md:text-[55px] md:mb-9 md-3 leading-tight text-xl font-bold text-main-black">
				Create NFT Collection
			</h1>
			<Form {...form}>
				<form
					className="xl:px-[420px] md:px-16 px-[15px] flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
					onSubmit={form.handleSubmit(onCreateCollection)}
				>
					{step === 1 && (
						<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
							<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
								<CardTitle className="md:text-[28px] text-lg text-main-black font-medium">Upload Metadata</CardTitle>
								<CardDescription className="md:text-xl pt-2.5 text-base text-light-grey">
									<Image
										src={validateMetadataMutation.data?.data.image ?? ''}
										width={112}
										height={112}
										alt={`${validateMetadataMutation.data?.data.name} image`}
										className="rounded-[8px]"
									/>
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col space-y-3 p-0">
								<FormField
									control={form.control}
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
									control={form.control}
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
									control={form.control}
									name="sellerFeeBasisPoints"
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
					)}
					{step === 0 && (
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
										type="button"
										onClick={onValidateMetata}
										className="bg-main-green w-[122px] text-center flex justify-center items-center hover:bg-hover-green text-main-white md:h-[48px] h-[34px] md:px-6 md:py-3 p-3 rounded-[43px] md:text-lg text-base"
									>
										Next
										<ChevronRight className="md:min-w-[30px] min-w-[10px] min-h-[30px]" />
									</Button>
								</CardFooter>
							</CardContent>
						</Card>
					)}
				</form>
			</Form>
		</>
	)
}
