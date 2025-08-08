'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogTitle,
	DialogDescription,
	DialogClose,
	DialogContent,
	DialogHeader
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCreateCollection, useValidateOffChainMetadata } from '@/features/nfts/services'
import { TCreateCollectionPayload } from '@/features/nfts/types'
import { CreateCollectionValidation } from '@/features/nfts/validation'
import { useErrorDialog } from '@/stores/errorDialog'

type FieldName = keyof TCreateCollectionPayload

const createCollectionSteps = [
	{
		id: 1,
		fields: ['uri']
	},
	{
		id: 2,
		fields: ['name', 'symbol', 'sellerFeeBasisPoints']
	}
]

export default function CreateCollectionDialog({
	isOpen,
	onOpenChange
}: {
	isOpen: boolean
	onOpenChange: Dispatch<SetStateAction<boolean>>
}) {
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

	const onNext = async () => {
		const fields = createCollectionSteps[step].fields
		const isValid = await form.trigger(fields as FieldName[], { shouldFocus: true })

		if (!isValid) return

		if (step === 0) {
			validateMetadataMutation.mutate({ uri: form.getValues('uri') })
		} else if (step === createCollectionSteps.length - 1) {
			await form.handleSubmit(onCreateCollection)()
		}
	}

	const onCreateCollection = async (payload: TCreateCollectionPayload) => createCollectionMutation.mutate(payload)
	const { openErrorDialog } = useErrorDialog()
	const isLoading = validateMetadataMutation.isPending || createCollectionMutation.isPending
	const isCreateCollectionSuccess = createCollectionMutation.isSuccess && createCollectionMutation.data

	const handleDialogOpenChange = (open: boolean) => {
		if (!open) {
			form.reset()
			setStep(0)
			createCollectionMutation.reset?.()
			validateMetadataMutation.reset?.()
		}

		// Call parent onOpenChange
		onOpenChange(open)
	}

	useEffect(() => {
		if (validateMetadataMutation.isSuccess && validateMetadataMutation.data) {
			form.setValue('name', validateMetadataMutation.data.data.name)
			form.setValue('symbol', validateMetadataMutation.data.data.symbol)
			form.setValue('sellerFeeBasisPoints', validateMetadataMutation.data.data.seller_fee_basis_points.toString())
			setStep(1)
		}
	}, [form, validateMetadataMutation.data, validateMetadataMutation.isSuccess])

	useEffect(() => {
		if (validateMetadataMutation.isError && validateMetadataMutation.error) {
			openErrorDialog({
				title: validateMetadataMutation.error.errorMessage,
				description: <p className="pre">{validateMetadataMutation.error.errorDetail}</p>
			})
		}
	}, [openErrorDialog, validateMetadataMutation.error, validateMetadataMutation.isError])

	useEffect(() => {
		if (isCreateCollectionSuccess) {
			form.reset()
		}
	}, [isCreateCollectionSuccess, form])

	useEffect(() => {
		if (createCollectionMutation.isError && createCollectionMutation.error) {
			openErrorDialog({
				title: 'We can not proceed your transaction',
				description: createCollectionMutation.error.message
			})
		}
	}, [createCollectionMutation.error, createCollectionMutation.isError, openErrorDialog])

	return (
		<Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
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
						{isCreateCollectionSuccess && (
							<div>
								<Image src="/success-parsed.svg" width={64} height={64} alt="success parsed" />
								<h4 className="mt-8 text-center font-semibold text-lg mb-6">Successfully Created Collection</h4>
								<p className="md:text-lg text-sm mb-12 text-light-grey">
									{createCollectionMutation.data?.message ?? ''}
								</p>
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

						{isCreateCollectionSuccess ? (
							<div className="flex justify-end">
								<DialogClose asChild>
									<Button>Close</Button>
								</DialogClose>
							</div>
						) : (
							<div className="flex justify-end space-x-2.5">
								<DialogClose asChild>
									<Button variant="outline">Cancel</Button>
								</DialogClose>
								<Button type="button" disabled={isLoading} onClick={onNext}>
									{isLoading && <Loader2 className="animate-spin" />}
									{step === 0 ? 'Next' : 'Create Collection'}
								</Button>
							</div>
						)}
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
