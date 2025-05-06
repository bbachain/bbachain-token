'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NFTMetadataSchema, UploadNFTMetadataPayload, UploadNFTMetadataSchema } from '@/lib/validation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { ParsingMetadataDialog, SuccessParsedDialog } from '@/components/nft/dialog'
import { useEffect, useState } from 'react'
import { capitalCase } from 'text-case'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { ZodError } from 'zod'
import { useErrorDialog } from '@/lib/hooks'

export default function CreateNFT() {
	const form = useForm<UploadNFTMetadataPayload>({
		resolver: zodResolver(UploadNFTMetadataSchema),
		defaultValues: {
			name: '',
			metadata_uri: ''
		}
	})

	const [step, setStep] = useState<'upload' | 'preview'>('upload')
	const [isSuccessDialog, setIsSuccessDialog] = useState<boolean>(false)

	const validateMetadataMutation = useMutation({
		mutationKey: ['validate-metadata'],
		mutationFn: async (metadata_uri: string) => {
			const response = await axios.get(metadata_uri)
			const result = await NFTMetadataSchema.parseAsync(response.data)
			return result
		}
	})

	const metadataPreview = validateMetadataMutation.data
	const mappedObject = {
		name: metadataPreview?.name,
		symbol: metadataPreview?.symbol,
		description: metadataPreview?.description
	}
	const { openErrorDialog } = useErrorDialog()

	useEffect(() => {
		if (validateMetadataMutation.isSuccess && validateMetadataMutation.data) {
			setIsSuccessDialog(true)
			setStep('preview')
		}
	}, [validateMetadataMutation.data, validateMetadataMutation.isSuccess])

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

	const onValidate = (payload: UploadNFTMetadataPayload) => validateMetadataMutation.mutate(payload.metadata_uri)

	return (
		<div className="md:mt-40 mt-20 md:mb-20 mb-5">
			<ParsingMetadataDialog isOpen={validateMetadataMutation.isPending} />
			<SuccessParsedDialog isOpen={isSuccessDialog} onOpenChange={setIsSuccessDialog} />
			{step === 'preview' && (
				<div className="xl:px-24 md:px-16 px-[15px]">
					<Button
						variant="ghost"
						onClick={() => setStep('upload')}
						className={'md:flex hidden w-52 mb-3 text-main-black items-center space-x-2.5 text-xl'}
					>
						<HiOutlineArrowNarrowLeft />
						<h4>Upload Metadata</h4>
					</Button>
					<form className="flex flex-col md:px-[330px] md:space-y-6 space-y-3">
						<h3 className="text-center text-main-black font-medium text-[32px]">Metadata Preview</h3>
						<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
							<CardContent className="flex flex-col space-y-3 p-0">
								{/* eslint-disable-next-line @next/next/no-img-element*/}
								<img
									src={metadataPreview?.image ?? ''}
									width={112}
									height={112}
									alt={`${metadataPreview?.name} image`}
									className="rounded-[6px]"
								/>
								<section className="flex flex-col space-y-6">
									{Object.entries(mappedObject).map(([key, value]) => (
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
											{metadataPreview?.attributes?.map((attribute) => (
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
					</form>
				</div>
			)}
			{step === 'upload' && (
				<Form {...form}>
					<form
						className="xl:px-[420px] md:px-16 px-[15px] flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
						onSubmit={form.handleSubmit(onValidate)}
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
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>NFT Name</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green md:h-[55px]  focus:border-hover-green rounded-[8px] w-full"
													type="text"
													placeholder="Enter NFT Name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
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
