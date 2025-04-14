'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateBBATokenPayload, CreateBBATokenValidation } from '@/lib/validation'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { useWallet } from '@bbachain/wallet-adapter-react'
import { Label, Textarea } from 'flowbite-react'
import FileInput from '@/components/ui/file-input'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, InfoIcon } from 'lucide-react'
import { SuccessDialog } from '@/components/createToken/success-dialog'
import toast from 'react-hot-toast'
import { useGetBalance, useRequestAirdrop, useTokenCreator } from '@/components/account/account-data-access'
import { CreateTokenResponse } from '@/lib/response'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { PublicKey } from '@bbachain/web3.js'
import { WalletButton } from '@/components/contexts/bbachain-provider'

const LIMIT_OF_SIXTH_DECIMALS = 18_000_000

function NoBalanceAlert({ address }: { address: PublicKey }) {
	const { cluster } = useCluster()
	const requestAirdropMutation = useRequestAirdrop({ address: address })
	return (
		<Alert className="flex items-center justify-between dark:border-yellow-300 border-yellow-400">
			<InfoIcon />
			<AlertTitle className="ml-3 text-md">
				{' '}
				You are connected to <strong>{cluster.name}</strong> but your account is not found on this cluster.
			</AlertTitle>
			<Button
				className="bg-main-green hover:bg-hover-green"
				type="button"
				disabled={requestAirdropMutation.isPending}
				onClick={() =>
					requestAirdropMutation
						.mutateAsync(1)
						.then((value) => toast.success('Successfully sent 1 BBA to your account'))
						.catch((err) => console.log(err))
				}
			>
				{requestAirdropMutation.isPending && <Loader2 className="animate-spin" />}
				Request Airdrop
			</Button>
		</Alert>
	)
}

function NoAdressAlert() {
	return (
		<Alert className="flex items-center justify-between dark:border-yellow-300 border-yellow-400">
			<InfoIcon />
			<AlertTitle className="ml-3 text-md">You need to connect to your wallet first before continue</AlertTitle>
			<WalletButton />
		</Alert>
	)
}

export default function CreateToken() {
	const { publicKey } = useWallet()

	const address = useMemo(() => {
		if (!publicKey) return
		return publicKey
	}, [publicKey])

	const form = useForm<CreateBBATokenPayload>({
		mode: 'all',
		resolver: zodResolver(CreateBBATokenValidation),
		defaultValues: {
			token_name: '',
			token_symbol: '',
			custom_decimals: '',
			token_supply: '',
			description: '',
			revoke_freeze: false,
			revoke_mint: false,
			immutable_metadata: false
		}
	})

	const watchTokenSupply = form.watch('token_supply')

	const getTokenBalance = useGetBalance({ address: address! })
	const createTokenMutation = useTokenCreator({ address: address! })

	const [isOpen, setIsOpen] = useState<boolean>(false)
	const [previewIcon, setPreviewIcon] = useState<string | null>(null)
	const [tokenIconError, setTokenIconError] = useState<string | undefined>(undefined)
	const [responseData, setResponseData] = useState<CreateTokenResponse | null>(null)

	const onSubmit = (payload: CreateBBATokenPayload) => createTokenMutation.mutate(payload)

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		processFile(file)
	}

	const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		const file = event.dataTransfer.files?.[0]
		processFile(file)
	}

	const processFile = (file: File | undefined) => {
		if (file) {
			setTokenIconError(undefined)
			form.setValue('token_icon', file)
			const reader = new FileReader()
			reader.onload = () => {
				setPreviewIcon(reader.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	useEffect(() => {
		if (!address) {
			toast.error('Please select your wallet first')
		}
	}, [address])

	useEffect(() => {
		if (createTokenMutation.isSuccess && createTokenMutation.data) {
			setIsOpen(true)
			setResponseData(createTokenMutation.data)
			console.log(createTokenMutation.data)
		}
	}, [createTokenMutation.data, createTokenMutation.isSuccess])

	useEffect(() => {
		if (createTokenMutation.isError && createTokenMutation.error) {
			toast.error(`Transaction Failed ${createTokenMutation.error.message}`)
		}
	}, [createTokenMutation.error, createTokenMutation.isError])

	useEffect(() => {
		if (form.formState.errors.token_icon?.message) {
			setTokenIconError(form.formState.errors.token_icon.message)
		} else {
			setTokenIconError(undefined)
		}

		return () => {
			setTokenIconError(undefined)
		}
	}, [form.formState.errors.token_icon])

	useEffect(() => {
		const supply = parseFloat(watchTokenSupply)
		if (supply > LIMIT_OF_SIXTH_DECIMALS) form.setValue('custom_decimals', '6')
	}, [form, watchTokenSupply])

	if (address && getTokenBalance.isLoading)
		return (
			<div className="h-full w-full  mt-60 flex flex-col space-y-3 items-center justify-center">
				<Loader2 className="animate-spin" width={40} height={40} />
				<p>Please wait...</p>
			</div>
		)

	return (
		<Form {...form}>
			{responseData && <SuccessDialog isOpen={isOpen} onOpenChange={setIsOpen} data={responseData} />}
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="lg:px-48 md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col lg:space-y-14 md:space-y-9 space-y-3"
			>
				{!address && <NoAdressAlert />}
				{getTokenBalance.isError || (!getTokenBalance.data && address && <NoBalanceAlert address={address} />)}
				<h1 className="text-center md:text-[55px] leading-tight text-[28px] font-bold text-main-black">
					QUICK TOKEN GENERATOR
				</h1>
				<Card className="w-full border-hover-green border-[1px] rounded-[16px] md:p-9 p-3 drop-shadow-lg">
					<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
						<CardTitle className="md:text-[28px] text-2xl text-main-black font-medium">Token Details</CardTitle>
						<CardDescription className="md:text-xl text-base text-light-grey">
							Basic details about your token
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col md:space-y-[25px] space-y-3 p-0">
						<div className="grid md:grid-cols-2 md:gap-[25px] gap-3">
							<FormField
								control={form.control}
								name="token_name"
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
								name="token_symbol"
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
								name="custom_decimals"
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
								name="token_supply"
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
						<div className="grid w-full  items-center gap-1.5">
							<Label className={cn(tokenIconError && '!text-destructive')}>Token Icon</Label>
							<FileInput
								preview={previewIcon}
								handleDrop={handleDrop}
								handleFileChange={handleFileChange}
								errorMessage={tokenIconError}
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
				<Card className="w-full border-hover-green border-[1px] md:p-9 p-3 rounded-[16px] drop-shadow-lg">
					<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
						<CardTitle className="md:text-[28px] text-2xl text-main-black font-medium">Features</CardTitle>
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
				<Card className="w-full border-hover-green border-[1px] rounded-[16px] drop-shadow-lg md:p-9 p-3">
					<CardHeader className="text-center space-y-0 p-0 md:pb-6 pb-3">
						<CardTitle className="md:text-[28px] text-2xl text-main-black font-medium">Deploy Token</CardTitle>
						<CardDescription className="md:text-xl text-base text-light-grey">
							Ready to create the Token
						</CardDescription>
					</CardHeader>
					<CardContent className="flex  text-center flex-col space-y-[25px] p-0">
						{/* <h4 className="text-[21px] text-main-green">230.45 BBA</h4> */}
						<Button
							type="submit"
							disabled={createTokenMutation.isPending}
							className="bg-main-green hover:bg-hover-green text-main-white w-full md:h-[62px] h-[34px] rounded-[43px] md:text-[27px] text-base"
						>
							{createTokenMutation.isPending && <Loader2 className="animate-spin" />}
							Create Your Token
						</Button>
					</CardContent>
				</Card>
			</form>
		</Form>
	)
}
