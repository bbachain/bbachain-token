'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { NoBalanceAlert } from '@/components/layout/Alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import FileInput from '@/features/tokens/components/form/FileInput'
import FormProgressLine, { type CreateTokenStepProps } from '@/features/tokens/components/form/FormProgressLine'
import SuccessDialog from '@/features/tokens/components/form/SuccessDialog'
import CreateTokenOverview from '@/features/tokens/components/form/TokenOverview'
import { useCreateToken } from '@/features/tokens/services'
import { TCreateTokenDataResponse, TCreateTokenPayload } from '@/features/tokens/types'
import { CreateTokenValidation } from '@/features/tokens/validation'
import { useGetBalance } from '@/services/wallet'
import { useErrorDialog } from '@/stores/errorDialog'

type FieldName = keyof TCreateTokenPayload
const LIMIT_OF_SIXTH_DECIMALS = 18_000_000

const createTokenSteps: CreateTokenStepProps[] = [
	{
		id: 1,
		name: 'Token Details',
		fields: ['name', 'symbol', 'decimals', 'supply', 'description']
	},
	{
		id: 2,
		name: 'Token Icon',
		fields: ['icon']
	},
	{
		id: 3,
		name: 'Features',
		fields: ['revoke_freeze', 'revoke_mint', 'immutable_metadata']
	},
	{
		id: 4,
		name: 'Create Token'
	}
]

export default function CreateToken() {
	const form = useForm<TCreateTokenPayload>({
		mode: 'all',
		resolver: zodResolver(CreateTokenValidation),
		defaultValues: {
			name: '',
			symbol: '',
			decimals: '',
			supply: '',
			description: '',
			revoke_freeze: false,
			revoke_mint: false,
			immutable_metadata: false
		}
	})

	const watchTokenSupply = form.watch('supply')
	const createTokenMutation = useCreateToken()
	const getBalanceQuery = useGetBalance()
	const isNoBalance = getBalanceQuery.isError || !getBalanceQuery.data || getBalanceQuery.data === 0

	const [currentStep, setCurrentStep] = useState<number>(0)
	const [isSuccessOpen, setIsSuccessOpen] = useState<boolean>(false)
	const [previewIcon, setPreviewIcon] = useState<string | null>(null)
	const [tokenIconError, setTokenIconError] = useState<string | undefined>(undefined)
	const [responseData, setResponseData] = useState<TCreateTokenDataResponse | null>(null)

	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const { openErrorDialog } = useErrorDialog()

	const onNext = async () => {
		const fields = createTokenSteps[currentStep].fields
		const isValid = await form.trigger(fields as FieldName[], { shouldFocus: true })

		if (!isValid) return

		if (currentStep < createTokenSteps.length - 1) {
			setCurrentStep((step) => step + 1)
		} else if (currentStep === createTokenSteps.length - 1) {
			await form.handleSubmit(onSubmit)()
		}
	}

	const onPrev = () => {
		if (currentStep > 0) {
			setCurrentStep((step) => step - 1)
		}
	}

	const onSubmit = (payload: TCreateTokenPayload) => createTokenMutation.mutate(payload)

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		await processFile(file)
	}

	const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		const file = event.dataTransfer.files?.[0]
		await processFile(file)
	}

	const processFile = async (file: File | undefined) => {
		if (file) {
			setTokenIconError(undefined)
			form.setValue('icon', file)
			const reader = new FileReader()
			const fields = createTokenSteps[currentStep].fields
			const isValid = await form.trigger(fields as FieldName[], { shouldFocus: true })

			if (!isValid) {
				openErrorDialog({
					title: `We couldn't upload your image`,
					description: form.formState?.errors?.icon?.message ?? ''
				})
				form.setValue('icon', undefined as unknown as File)
				form.clearErrors('icon')
				setPreviewIcon(null)
				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
				return
			}

			reader.onload = () => {
				setPreviewIcon(reader.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	useEffect(() => {
		if (createTokenMutation.isSuccess && createTokenMutation.data) {
			setIsSuccessOpen(true)
			setResponseData(createTokenMutation.data.data)
			form.reset()
			setPreviewIcon(null)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}
			setCurrentStep(0)
			console.log(createTokenMutation.data)
		}
	}, [createTokenMutation.data, createTokenMutation.isSuccess, form])

	useEffect(() => {
		if (createTokenMutation.isError && createTokenMutation.error) {
			openErrorDialog({
				title: `Something went wrong while creating your token.`,
				description: createTokenMutation.error.message ?? ''
			})
			console.error(createTokenMutation.error)
		}
	}, [createTokenMutation.error, createTokenMutation.isError, openErrorDialog])

	useEffect(() => {
		if (form.formState.errors.icon?.message) {
			setTokenIconError(form.formState.errors.icon.message)
		} else {
			setTokenIconError(undefined)
		}

		return () => {
			setTokenIconError(undefined)
		}
	}, [form.formState.errors.icon?.message])

	useEffect(() => {
		const supply = parseFloat(watchTokenSupply)
		if (supply > LIMIT_OF_SIXTH_DECIMALS) form.setValue('decimals', '6')
	}, [form, watchTokenSupply])

	if (getBalanceQuery.isLoading || createTokenMutation.isPending)
		return (
			<div className="h-full w-full md:mt-20 mt-40 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Creating your token...</p>
			</div>
		)

	return (
		<Form {...form}>
			{responseData && <SuccessDialog isOpen={isSuccessOpen} onOpenChange={setIsSuccessOpen} data={responseData} />}
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="xl:px-48 md:px-16 px-[15px] w-full flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
			>
				{isNoBalance && <NoBalanceAlert />}
				<h1 className="text-center md:text-[55px] leading-tight text-xl font-bold text-main-black">
					QUICK TOKEN GENERATOR
				</h1>
				<div className="w-full max-w-5xl mx-auto relative">
					<FormProgressLine steps={createTokenSteps} currentStep={currentStep} />
				</div>
				{currentStep === 0 && (
					<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
						<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
							<CardTitle className="md:text-[28px] text-lg text-main-black font-medium">Token Details</CardTitle>
							<CardDescription className="md:text-xl text-base text-light-grey">
								Basic details about your token
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col md:space-y-[25px] space-y-3 p-0">
							<div className="grid md:grid-cols-2 md:gap-[25px] gap-3">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Token Name</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green focus:border-hover-green rounded-[8px] w-full"
													type="text"
													placeholder="Enter Token Name"
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
											<FormLabel>Token Symbol</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green focus:border-hover-green rounded-[8px] w-full"
													type="text"
													placeholder="Enter Token Symbol"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="decimals"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Custom Decimals</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green focus:border-hover-green rounded-[8px] w-full"
													type="number"
													placeholder="Enter Custom Decimals"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="supply"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Token Supply</FormLabel>
											<FormControl>
												<Input
													className="focus-visible:ring-hover-green focus:border-hover-green rounded-[8px] w-full"
													type="number"
													placeholder="Enter Token Supply"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												className="h-[255px] !bg-box dark:border-input dark:focus-visible:ring-hover-green dark:focus:border-hover-green focus-visible:ring-hover-green focus:border-hover-green"
												placeholder="Add the token description"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>
				)}
				{currentStep === 1 && (
					<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
						<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
							<CardTitle className="md:text-[28px] text-lg text-main-black font-medium">Token Icon</CardTitle>
							<CardDescription className="md:text-xl text-base text-light-grey">
								Enhance your token with a stunning icon!
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col md:space-y-[25px] space-y-3 p-0">
							<div className="grid w-full  items-center gap-1.5">
								<FileInput
									fileInputRef={fileInputRef}
									preview={previewIcon}
									handleDrop={handleDrop}
									handleFileChange={handleFileChange}
									errorMessage={tokenIconError}
								/>
							</div>
						</CardContent>
					</Card>
				)}
				{currentStep === 2 && (
					<Card className="w-full border-hover-green border-[1px] md:p-9 p-3 rounded-[16px] drop-shadow-lg">
						<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
							<CardTitle className="md:text-[28px] text-lg text-main-black font-medium">Features</CardTitle>
							<CardDescription className="md:text-xl text-base text-light-grey">
								Extra feature for your token
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col space-y-[25px] p-0">
							<FormField
								control={form.control}
								name="revoke_freeze"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between">
										<div className="w-full">
											<FormLabel className="text-lg font-normal text-main-black">Revoke Freeze</FormLabel>
											<FormDescription className="text-[15px] text-light-grey">
												To create a liquidity pool, it&apos;s necessary to Revoke Freeze Authority of the Token.
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												classNames={{ root: 'h-7 w-14', thumb: 'h-6 w-8' }}
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="revoke_mint"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between">
										<div className="w-full">
											<FormLabel className="text-lg font-normal text-main-black">Revoke Mint</FormLabel>
											<FormDescription className="text-[15px] text-light-grey">
												Another essential step to ensure reliability among users is revoking the mint authority.
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												classNames={{ root: 'h-7 w-14', thumb: 'h-6 w-8' }}
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="immutable_metadata"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between">
										<div className="w-full">
											<FormLabel className="text-lg font-normal text-main-black">Immutable Metadata</FormLabel>
											<FormDescription className="text-[15px] text-light-grey">
												Enhance security and trust by locking token metadata.
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												classNames={{ root: 'h-7 w-14', thumb: 'h-6 w-8' }}
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>
				)}
				{currentStep === 3 && (
					<div className="flex flex-col md:space-y-14 space-y-6">
						<div className="w-full text-center border-hover-green border-[1px] rounded-[16px] drop-shadow-lg md:p-9 p-3">
							<h2 className="md:text-[28px] text-lg text-main-black font-medium">Deploy Token</h2>
							<p className="md:text-xl text-base text-light-grey mt-2">Ready to create the Token</p>
						</div>
						<CreateTokenOverview {...form.getValues()} image_link={previewIcon ?? ''} />
					</div>
				)}

				<section className="flex w-full justify-end space-x-2.5">
					{currentStep > 0 && (
						<Button
							type="button"
							onClick={onPrev}
							className="dark:bg-white bg-[#67676759] flex justify-center items-center text-center text-main-white md:h-[62px] h-[34px] md:px-6 md:py-3 p-3 rounded-[43px] md:text-[27px] text-base"
						>
							<ChevronLeft className="md:min-w-[30px] min-w-[10px] min-h-[30px]" />
							<p className="md:min-w-[72px] min-w-[46px]">Back</p>
						</Button>
					)}
					<Button
						type="button"
						onClick={onNext}
						className="bg-main-green text-center flex justify-center items-center hover:bg-hover-green text-main-white md:h-[62px] h-[34px] md:px-6 md:py-3 p-3 rounded-[43px] md:text-[27px] text-base"
					>
						<p className="md:min-w-[72px] min-w-[46px]">
							{currentStep === createTokenSteps.length - 1 ? 'Create Your Token' : 'Next'}
						</p>
						<ChevronRight className="md:min-w-[30px] min-w-[10px] min-h-[30px]" />
					</Button>
				</section>
			</form>
		</Form>
	)
}
