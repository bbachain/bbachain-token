'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FaPlus } from 'react-icons/fa6'
import { PiPencilLight } from 'react-icons/pi'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import SwapItem from '@/features/swap/components/SwapItem'
import TokenListDialog from '@/features/swap/components/TokenListDialog'
import { useGetSwappableTokens, useGetTokenPrice, useGetUserBalanceByMint } from '@/features/swap/services'
import { TTokenProps } from '@/features/swap/types'
import FormProgressLine from '@/features/tokens/components/form/FormProgressLine'
import { cn } from '@/lib/utils'

import { TCreatePoolPayload } from '../types'
import { createPoolValidation } from '../validation'

const createPoolSteps = [
	{
		id: 1,
		name: 'Select token & fee tier',
		fields: ['baseToken', 'quoteToken', 'feeTier']
	},
	{
		id: 2,
		name: 'Set initial price & range',
		fields: ['initialPrice', 'minInitialPrice', 'maxInitialPrice']
	},
	{
		id: 3,
		name: 'Enter deposit amount'
	}
]

const feeTierOptions = [0.01, 0.02, 0.03, 0.04, 0.05, 0.1, 0.15, 0.16, 0.18, 0.2, 0.25, 0.4, 0.6, 0.8, 1, 2, 3, 4]

type FieldName = keyof TCreatePoolPayload

const tokenStaticData = [
	{
		address: 'efgh',
		name: 'BBA Coin',
		symbol: 'BBA',
		icon: '/bba-swap-icon.svg',
		balance: 3.9899
	},
	{
		address: 'abcd',
		name: 'Binance Coin',
		symbol: 'BNB',
		icon: '/bnb-swap-icon.svg',
		balance: 2.8989
	}
]

export default function CreatePoolForm() {
	const getSwappableTokensQuery = useGetSwappableTokens()
	const swappableTokenData = getSwappableTokensQuery.data ? getSwappableTokensQuery.data.data : []

	const form = useForm<TCreatePoolPayload>({
		mode: 'all',
		resolver: zodResolver(createPoolValidation),
		defaultValues: {
			baseToken: undefined,
			quoteToken: undefined,
			baseTokenBalance: 0,
			quoteTokenBalance: 0,
			feeTier: feeTierOptions[0].toString(),
			priceSetting: 'wbnb',
			rangeType: 'full-range',
			initialPrice: '',
			baseTokenAmount: '',
			quoteTokenAmount: ''
		}
	})

	const [currentStep, setCurrentStep] = useState<number>(0)
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useState<boolean>(false)
	const [typeItem, setTypeItem] = useState<'from' | 'to'>('from')
	const exchangeRate = form.watch('priceSetting') === 'wbnb' ? 'WBNB per USDT' : 'USDT per WBNB'

	const getMintABalance = useGetUserBalanceByMint({
		mintAddress: form.getValues('baseToken') ? form.getValues('baseToken').address : ''
	})
	const getMintBBalance = useGetUserBalanceByMint({
		mintAddress: form.getValues('quoteToken') ? form.getValues('quoteToken').address : ''
	})
	const getMintATokenPrice = useGetTokenPrice({
		mintAddress: form.getValues('baseToken') ? form.getValues('baseToken').address : ''
	})
	const getMintBTokenPrice = useGetTokenPrice({
		mintAddress: form.getValues('quoteToken') ? form.getValues('quoteToken').address : ''
	})

	const mintABalance = getMintABalance.data ? getMintABalance.data.balance : 0
	const mintBBalance = getMintBBalance.data ? getMintBBalance.data.balance : 0
	const mintAInitialPrice = getMintATokenPrice.data ? getMintATokenPrice.data.usdRate : 0
	const mintBInitialPrice = getMintBTokenPrice.data ? getMintBTokenPrice.data.usdRate : 0

	const baseTokenPrice =
		Number(form.getValues('baseTokenAmount')) > 0 ? Number(form.getValues('baseTokenAmount')) * mintAInitialPrice : 0
	const quoteTokenPrice =
		Number(form.getValues('quoteTokenAmount')) > 0 ? Number(form.getValues('quoteTokenAmount')) * mintBInitialPrice : 0

	useEffect(() => {
		form.setValue('baseTokenBalance', mintABalance)
	}, [form, mintABalance])

	useEffect(() => {
		form.setValue('quoteTokenBalance', mintBBalance)
	}, [form, mintBBalance])

	const onNext = async () => {
		const fields = createPoolSteps[currentStep].fields
		const isValid = await form.trigger(fields as FieldName[], { shouldFocus: true })

		if (!isValid) return

		if (currentStep < createPoolSteps.length - 1) {
			setCurrentStep((step) => step + 1)
		} else if (currentStep === createPoolSteps.length - 1) {
			await form.handleSubmit(onSubmit)()
		}
	}

	const onSubmit = (payload: TCreatePoolPayload) => console.log(payload)

	const onOpenBaseTokenList = () => {
		setTypeItem('from')
		setIsTokenDialogOpen(true)
	}

	const onOpenQuoteTokenList = () => {
		setTypeItem('to')
		setIsTokenDialogOpen(true)
	}

	const onSelectBaseToken = (value: TTokenProps) => form.setValue('baseToken', value, { shouldValidate: true })
	const onSelectQuoteToken = (value: TTokenProps) => form.setValue('quoteToken', value, { shouldValidate: true })
	const onInputBaseTokenAmount = (value: string) => form.setValue('baseTokenAmount', value, { shouldValidate: true })
	const onInputQuoteTokenAmount = (value: string) => form.setValue('quoteTokenAmount', value, { shouldValidate: true })
	const onSelectRangeType = (value: string) => {
		form.setValue('rangeType', value, { shouldValidate: true })
		if (value === 'custom-range') {
			form.setValue('minInitialPrice', '')
			form.setValue('maxInitialPrice', '')
		} else {
			form.resetField('minInitialPrice')
			form.resetField('maxInitialPrice')
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col justify-center items-center space-y-6">
				<div className="md:w-[763px] w-full">
					<FormProgressLine currentStep={currentStep} steps={createPoolSteps} />
				</div>
				{currentStep === 0 && (
					<Card className="md:w-[500px] w-full border-hover-green border-[1px] rounded-[12px] md:p-6 p-3 drop-shadow-lg">
						<CardContent className="p-0 flex flex-col space-y-[18px]">
							<section className="flex flex-col space-y-6">
								<div className="flex w-full flex-col space-y-2">
									<h4 className="text-main-black font-normal text-bas	e">Base Token</h4>
									<Button
										type="button"
										variant="outline"
										className="w-full justify-between items-center p-3 rounded-[6px] border-2 border-strokes"
										onClick={onOpenBaseTokenList}
									>
										<section>
											{form.getValues('baseToken') ? (
												<div className="flex space-x-2 items-center">
													<Image
														width={20}
														height={20}
														src={form.getValues('baseToken').logoURI}
														alt="base token icon"
													/>
													<p>{form.getValues('baseToken').symbol}</p>
												</div>
											) : (
												<p className="text-light-grey text-sm">Select Token</p>
											)}
										</section>
										<ChevronDown className="h-4 w-4 opacity-50" />
									</Button>
									<p className="text-error text-sm">{form.formState.errors.baseToken?.message}</p>
								</div>
								<div className="flex w-full flex-col space-y-2">
									<h4 className="text-main-black font-normal text-base">Quote Token</h4>
									<Button
										type="button"
										variant="outline"
										className="w-full justify-between items-center p-3 rounded-[6px] border-2 border-strokes"
										onClick={onOpenQuoteTokenList}
									>
										<section>
											{form.getValues('quoteToken') ? (
												<div className="flex space-x-2 items-center">
													<Image
														width={20}
														height={20}
														src={form.getValues('quoteToken').logoURI}
														alt="quote token icon"
													/>
													<p>{form.getValues('quoteToken').symbol}</p>
												</div>
											) : (
												<p className="text-light-grey text-sm">Select Token</p>
											)}
										</section>
										<ChevronDown className="h-4 w-4 opacity-50" />
									</Button>
									<p className="text-error text-sm">{form.formState.errors.quoteToken?.message}</p>
								</div>
								<FormField
									control={form.control}
									name="feeTier"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-main-black font-normal text-base">Fee Tier</FormLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<FormControl>
													<SelectTrigger className="w-full p-3 rounded-[6px] border-2 border-strokes">
														<SelectValue placeholder="Select a verified email to display" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{feeTierOptions.map((value) => (
														<SelectItem key={value} value={value.toString()}>
															{`${value}%`}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage className="text-sm" />
										</FormItem>
									)}
								/>
							</section>
						</CardContent>
						<CardFooter className="pt-[18px] !px-0 !pb-0">
							<Button
								onClick={onNext}
								type="button"
								className="rounded-[48px] md:h-[55px] h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green"
							>
								Continue
							</Button>
						</CardFooter>
					</Card>
				)}
				{currentStep === 1 && (
					<Card className="md:w-[500px] w-full border-hover-green border-[1px] rounded-[12px] md:p-6 p-3 drop-shadow-lg">
						<CardContent className="p-0 flex flex-col space-y-[18px]">
							<section className="flex justify-between items-center">
								<h3 className="text-base font-medium text-main-black">Price Settings</h3>
								<ToggleGroup
									type="single"
									value={form.watch('priceSetting')}
									onValueChange={(val) => {
										if (val) form.setValue('priceSetting', val)
									}}
									className="bg-light-green gap-0 rounded-[4px] text-light-grey"
								>
									<ToggleGroupItem
										value="wbnb"
										className={cn(
											'text-sm px-2.5 py-1 rounded-[4px] hover:bg-main-green hover:text-white',
											form.getValues('priceSetting') === 'wbnb' && '!bg-main-green  !text-white '
										)}
									>
										WBNB Price
									</ToggleGroupItem>
									<ToggleGroupItem
										value="usdt"
										className={cn(
											'text-sm px-2.5 py-1 rounded-[4px] hover:bg-main-green hover:text-white',
											form.getValues('priceSetting') === 'usdt' && '!bg-main-green  !text-white'
										)}
									>
										USDT Price
									</ToggleGroupItem>
								</ToggleGroup>
							</section>
							<FormField
								control={form.control}
								name="initialPrice"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-main-black font-normal text-base">Initial Price</FormLabel>
										<FormControl>
											<section className="relative w-full">
												<Input
													className="focus-visible:ring-hover-green focus:border-hover-green rounded-[8px] w-full"
													type="text"
													placeholder="Enter your initial price"
													{...field}
												/>
												<p className="absolute right-3 text-light-grey text-sm top-1/2 -translate-y-1/2">
													{exchangeRate}
												</p>
											</section>
										</FormControl>
										<FormMessage className="text-sm" />
									</FormItem>
								)}
							/>
							<section className="flex flex-col space-y-2">
								<h4 className="text-main-black font-normal text-base">Initial Price</h4>
								<Tabs defaultValue="full-range" onValueChange={(value) => onSelectRangeType(value)}>
									<TabsList className="bg-light-green p-0 w-full h-8 mb-[7px]">
										<TabsTrigger
											className="w-full h-full bg-transparent text-sm text-light-grey font-normal pt-1 hover:bg-main-green hover:text-main-white  focus-visible:bg-main-green focus-visible:text-main-white data-[state=active]:bg-main-green data-[state=active]:text-main-white data-[state=active]:rounded-[4px]"
											value="full-range"
										>
											Full Range
										</TabsTrigger>
										<TabsTrigger
											className="w-full h-full bg-transparent text-sm text-light-grey font-normal pt-1 hover:bg-main-green hover:text-main-white  focus-visible:bg-main-green focus-visible:text-main-white data-[state=active]:bg-main-green data-[state=active]:text-main-white data-[state=active]:rounded-[4px]"
											value="custom-range"
										>
											Custom Range
										</TabsTrigger>
									</TabsList>
									<TabsContent value="full-range"></TabsContent>
									<TabsContent value="custom-range">
										<div className="flex w-full p-2.5 space-x-2.5 justify-between items-center">
											<FormField
												control={form.control}
												name="minInitialPrice"
												render={({ field }) => (
													<FormItem className="w-full">
														<FormLabel className="text-base text-main-black font-normal">Min</FormLabel>
														<FormControl className="w-full">
															<section className="w-full relative">
																<Input
																	className="focus-visible:ring-hover-green focus:border-hover-green rounded-[8px] w-full"
																	type="text"
																	{...field}
																/>
																<p className="absolute right-3 text-light-grey text-[10px] top-1/2 -translate-y-1/2">
																	{exchangeRate}
																</p>
															</section>
														</FormControl>
														<FormMessage className="text-sm" />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="maxInitialPrice"
												render={({ field }) => (
													<FormItem className="w-full">
														<FormLabel className="text-base text-main-black font-normal">Max</FormLabel>
														<FormControl className="w-full">
															<section className="w-full relative">
																<Input
																	className="focus-visible:ring-hover-green focus:border-hover-green rounded-[8px] w-full"
																	type="text"
																	{...field}
																/>
																<p className="absolute right-3 text-light-grey text-[10px] top-1/2 -translate-y-1/2">
																	{exchangeRate}
																</p>
															</section>
														</FormControl>
														<FormMessage className="text-sm" />
													</FormItem>
												)}
											/>
										</div>
									</TabsContent>
								</Tabs>
							</section>
						</CardContent>
						<CardFooter className="pt-[18px] !px-0 !pb-0">
							<Button
								onClick={onNext}
								type="button"
								className="rounded-[48px] md:h-[55px] h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green"
							>
								Continue
							</Button>
						</CardFooter>
					</Card>
				)}
				{currentStep === 2 && (
					<div className="flex flex-col space-y-6">
						<Card className="md:w-[500px] w-full border-hover-green border-[1px] rounded-[12px] md:p-6 p-3 drop-shadow-lg">
							<CardContent className="p-0 flex flex-col space-y-[18px]">
								<div className="flex items-center justify-between">
									<div className="flex flex-col space-y-3">
										<section className="text-sm text-main-black font-normal flex items-center space-x-2.5">
											<h4 className="w-[75px]">Initial Price</h4>
											<span>:</span>
											<p>{form.getValues('initialPrice') + ' ' + exchangeRate}</p>
										</section>
										<section className="text-sm text-main-black font-normal flex items-center space-x-2.5">
											<h4 className="w-[75px]">Price Range</h4>
											<span>:</span>
											<p>
												{form.getValues('rangeType') === 'custom-range'
													? form.getValues('minInitialPrice') +
														' - ' +
														form.getValues('maxInitialPrice') +
														' ' +
														exchangeRate
													: '-'}
											</p>
										</section>
									</div>
									<Button
										type="button"
										onClick={() => setCurrentStep(1)}
										size="icon"
										variant="ghost"
										className="[&_svg]:size-5"
									>
										<PiPencilLight />
									</Button>
								</div>
							</CardContent>
						</Card>
						<Card className="md:w-[500px] w-full border-hover-green border-[1px] rounded-[12px] md:p-6 p-3 drop-shadow-lg">
							<CardContent className="p-0 flex flex-col space-y-[18px]">
								<section className="relative">
									<div className="flex flex-col space-y-3">
										<SwapItem
											noTitle
											type="from"
											tokenProps={form.getValues('baseToken')}
											price={baseTokenPrice}
											balance={mintABalance}
											inputAmount={form.getValues('baseTokenAmount')}
											setInputAmount={onInputBaseTokenAmount}
										/>
										<SwapItem
											noTitle
											type="to"
											tokenProps={form.getValues('quoteToken')}
											price={quoteTokenPrice}
											balance={mintBBalance}
											inputAmount={form.getValues('quoteTokenAmount')}
											setInputAmount={onInputQuoteTokenAmount}
										/>
									</div>
									<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="rounded-full [&_svg]:size-8 bg-main-green text-white w-14 h-14"
										>
											<FaPlus width={24} height={24} />
										</Button>
									</div>
								</section>
								<div className="flex flex-col space-y-2.5 border-2 border-dark-grey rounded-[10px] p-2.5">
									<section className="flex text-xs justify-between">
										<p className="text-dark-grey">Total Deposit</p>
										<p className="text-main-black">$0.00</p>
									</section>
									<section className="flex text-xs justify-between">
										<p className="text-dark-grey">Deposit Ratio</p>
										<div className="flex space-x-[5px] items-center">
											<section className="flex space-x-[5px] items-center">
												<Image src={form.getValues('baseToken').logoURI} width={13} height={13} alt="base token icon" />
												<p className="text-xs text-main-black font-normal">0%</p>
											</section>
											<span className="text-xs text-main-black font-normal">/</span>
											<section className="flex space-x-[5px] items-center">
												<Image
													src={form.getValues('quoteToken').logoURI}
													width={13}
													height={13}
													alt="quote token icon"
												/>
												<p className="text-xs text-main-black font-normal">0%</p>
											</section>
										</div>
									</section>
								</div>
							</CardContent>
							<CardFooter className="pt-[18px] !px-0 !pb-0">
								<Button
									disabled={!form.formState.isValid}
									type="submit"
									className="rounded-[48px] md:h-[55px]  h-12 text-base md:text-xl py-3 w-full text-main-white bg-main-green hover:bg-hover-green"
								>
									Submit
								</Button>
							</CardFooter>
						</Card>
					</div>
				)}
				<TokenListDialog
					data={swappableTokenData}
					isDataLoading={getSwappableTokensQuery.isLoading}
					isOpen={isTokenDialogOpen}
					setIsOpen={setIsTokenDialogOpen}
					type={typeItem}
					selectedFrom={form.getValues('baseToken')}
					setSelectedFrom={onSelectBaseToken}
					selectedTo={form.getValues('quoteToken')}
					setSelectedTo={onSelectQuoteToken}
				/>
			</form>
		</Form>
	)
}
