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

export default function CreateNFT() {
	const form = useForm<UploadNFTMetadataPayload>({
		resolver: zodResolver(UploadNFTMetadataSchema),
		defaultValues: {
			name: '',
			metadata_uri: ''
		}
	})

	const [isSuccessDialog, setIsSuccessDialog] = useState<boolean>(false)

	const validateMetadataMutation = useMutation({
		mutationKey: ['validate-metadata'],
		mutationFn: async (metadata_uri: string) => {
			const response = await axios.get(metadata_uri)
			await NFTMetadataSchema.parseAsync(response.data)
			return response.data
		}
	})

	useEffect(() => {
		if (validateMetadataMutation.isSuccess && validateMetadataMutation.data) {
			setIsSuccessDialog(true)
		}
	}, [validateMetadataMutation.data, validateMetadataMutation.isSuccess])

	const onValidate = (payload: UploadNFTMetadataPayload) => validateMetadataMutation.mutate(payload.metadata_uri)

	return (
		<Form {...form}>
			<ParsingMetadataDialog isOpen={validateMetadataMutation.isPending} />
			<SuccessParsedDialog isOpen={isSuccessDialog} onOpenChange={setIsSuccessDialog} />
			<form
				onSubmit={form.handleSubmit(onValidate)}
				className="xl:px-[420px] md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
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
	)
}
