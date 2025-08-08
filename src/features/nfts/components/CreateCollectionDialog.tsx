'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { NoBalanceAlert } from '@/components/layout/Alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Dialog,
	DialogTitle,
	DialogDescription,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingDialog, SuccessDialogCollection, SuccessDialogNFT } from '@/features/nfts/components/StatusDialog'
import { useCreateCollection, useValidateOffChainMetadata } from '@/features/nfts/services'
import { TCreateCollectionPayload, TCreateNFTDialogProps } from '@/features/nfts/types'
import { CreateCollectionValidation } from '@/features/nfts/validation'
import { useErrorDialog } from '@/stores/errorDialog'

type FieldName = keyof TCreateCollectionPayload

export default function CreateCollectionDialog() {
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
			<Dialog>
				<DialogContent className="w-full md:max-w-[565px]">
					<DialogHeader className="p-0">
						<DialogTitle>Create New Collection</DialogTitle>
						<DialogDescription>
							Group your NFTs under a shared name for better visibility and verification.
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form
							className="flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
							onSubmit={form.handleSubmit(onCreateCollection)}
						>
							{isLoadingDialog && (
								<div className="w-full h-full flex flex-col space-y-3 items-center justify-between">
									<Loader2 className="animate-spin" width={40} height={40} />
									<h3>{loadingDialogProps.title}</h3>
									<p>{loadingDialogProps.description}</p>
								</div>
							)}
							{step === 1 && (
								<div>
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
								</div>
							)}
							{step === 0 && (
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
							)}
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	)
}
