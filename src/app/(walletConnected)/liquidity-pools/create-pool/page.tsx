'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ArrowLeft, ArrowRight, Info, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FaChartArea } from 'react-icons/fa'
import { FaPlus } from 'react-icons/fa6'
import { IoSettings } from 'react-icons/io5'

import { NoBalanceAlert } from '@/components/layout/Alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import LPSuccessDialog from '@/features/liquidityPool/components/LPSuccessDialog'
import { useCreatePool } from '@/features/liquidityPool/services'
import { TCreatePoolPayload, MintInfo } from '@/features/liquidityPool/types'
import { createPoolValidation } from '@/features/liquidityPool/validation'
import { LoadingDialog } from '@/features/nfts/components/StatusDialog'
import SwapItem from '@/features/swap/components/SwapItem'
import TokenListDialog from '@/features/swap/components/TokenListDialog'
import {
	useGetTokensFromAPI,
	useGetTokenPrice,
	useGetUserBalanceByMint,
	useGetCoinGeckoTokenPrice
} from '@/features/swap/services'
import { TTokenProps } from '@/features/swap/types'
import { getCoinGeckoId } from '@/features/swap/utils'
import FormProgressLine from '@/features/tokens/components/form/FormProgressLine'
import { cn, formatTokenBalance } from '@/lib/utils'
import { useGetBalance } from '@/services/wallet'
import { isBBAPool, getBBAPositionInPool, requiresBBAWrapping } from '@/staticData/tokens'
import { useErrorDialog } from '@/stores/errorDialog'

// Enhanced step configuration
const createPoolSteps = [
	{
		id: 1,
		name: 'Token Selection',
		description: 'Choose the token pair for your liquidity pool',
		fields: ['baseToken', 'quoteToken', 'feeTier']
	},
	{
		id: 2,
		name: 'Price Configuration',
		description: 'Set the initial price and range for your pool',
		fields: ['initialPrice', 'minInitialPrice', 'maxInitialPrice']
	},
	{
		id: 3,
		name: 'Deposit Amounts',
		description: 'Enter the amount of tokens to deposit',
		fields: ['baseTokenAmount', 'quoteTokenAmount']
	},
	{
		id: 4,
		name: 'Review & Create',
		description: 'Review your pool configuration and create',
		fields: []
	}
]

// Enhanced fee tier options with descriptions
const feeTierOptions = [
	{ value: 0.01, label: '0.01%', description: 'Best for very stable pairs' },
	{ value: 0.05, label: '0.05%', description: 'Good for stable pairs' },
	{ value: 0.1, label: '0.1%', description: 'Most common fee tier' },
	{ value: 0.25, label: '0.25%', description: 'Good for most pairs' },
	{ value: 0.3, label: '0.3%', description: 'Standard fee tier' },
	{ value: 1, label: '1%', description: 'For exotic pairs' }
]

type FieldName = keyof TCreatePoolPayload

// Enhanced Token Selection Card
function TokenSelectionCard({
	label,
	token,
	onSelect,
	error
}: {
	label: string
	token?: MintInfo
	onSelect: () => void
	error?: string
}) {
	return (
		<div className="space-y-2">
			<label className={cn('text-sm md:text-lg', error ? 'text-error' : 'text-main-black')}>{label}</label>
			<Button
				type="button"
				variant="outline"
				className={cn(
					'w-full justify-between h-14 p-4 rounded-xl border-2 transition-all duration-200',
					error ? 'border-error' : 'border-strokes hover:border-hover-green'
				)}
				onClick={onSelect}
			>
				<div className="flex items-center space-x-3">
					{token ? (
						<>
							<Image
								src={token.logoURI || '/icon-placeholder.svg'}
								width={24}
								height={24}
								className="rounded-full"
								alt={`${token.symbol} icon`}
								onError={(e) => {
									e.currentTarget.src = '/icon-placeholder.svg'
								}}
							/>
							<div className="text-left">
								<p className="font-medium text-main-black">{token.symbol}</p>
								<p className="text-xs text-gray-500">{token.name}</p>
							</div>
						</>
					) : (
						<div className="flex items-center space-x-3">
							<div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
							<span className="text-gray-500">Select Token</span>
						</div>
					)}
				</div>
				<ChevronDown className="h-4 w-4 opacity-50" />
			</Button>
			{error && <p className="text-sm font-medium text-error">{error}</p>}
		</div>
	)
}

export default function CreatePool() {
	// Hooks
	const getTokensQuery = useGetTokensFromAPI()
	const createPoolMutation = useCreatePool()
	const getBalanceQuery = useGetBalance()
	const { openErrorDialog } = useErrorDialog()

	// Form setup
	const form = useForm<TCreatePoolPayload>({
		mode: 'all',
		resolver: zodResolver(createPoolValidation),
		defaultValues: {
			baseToken: undefined,
			quoteToken: undefined,
			baseTokenBalance: 0,
			quoteTokenBalance: 0,
			feeTier: feeTierOptions[2].value.toString(), // Default to 0.1%
			priceSetting: 'auto',
			rangeType: 'full-range',
			initialPrice: '',
			baseTokenAmount: '',
			quoteTokenAmount: ''
		}
	})

	// States
	const [currentStep, setCurrentStep] = useState<number>(0)
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useState<boolean>(false)
	const [typeItem, setTypeItem] = useState<'from' | 'to'>('from')
	const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState<boolean>(false)

	// Computed values
	const selectedBaseToken = form.watch('baseToken')
	const selectedQuoteToken = form.watch('quoteToken')
	const isNoBalance = getBalanceQuery.isError || !getBalanceQuery.data || getBalanceQuery.data === 0

	// BBA Pool Detection
	const isBBAPoolPair =
		selectedBaseToken && selectedQuoteToken ? isBBAPool(selectedBaseToken.address, selectedQuoteToken.address) : false
	const bbaPosition =
		selectedBaseToken && selectedQuoteToken
			? getBBAPositionInPool(selectedBaseToken.address, selectedQuoteToken.address)
			: null
	const requiresWrapping =
		selectedBaseToken && selectedQuoteToken
			? requiresBBAWrapping(selectedBaseToken.address, selectedQuoteToken.address)
			: false
	const bbaToken = bbaPosition === 'base' ? selectedBaseToken : bbaPosition === 'quote' ? selectedQuoteToken : null
	const nonBBAToken = bbaPosition === 'base' ? selectedQuoteToken : bbaPosition === 'quote' ? selectedBaseToken : null

	// Balance queries
	const getMintABalance = useGetUserBalanceByMint({
		mintAddress: selectedBaseToken?.address || ''
	})
	const getMintBBalance = useGetUserBalanceByMint({
		mintAddress: selectedQuoteToken?.address || ''
	})
	const getMintATokenPrice = useGetCoinGeckoTokenPrice({
		coinGeckoId: getCoinGeckoId(selectedBaseToken?.address)
	})
	const getMintBTokenPrice = useGetCoinGeckoTokenPrice({
		coinGeckoId: getCoinGeckoId(selectedQuoteToken?.address)
	})

	const mintABalance = getMintABalance.data?.balance || 0
	const mintBBalance = getMintBBalance.data?.balance || 0
	const mintAInitialPrice = getMintATokenPrice.data || 0
	const mintBInitialPrice = getMintBTokenPrice.data || 0

	// Format balances with proper decimals for display
	const formattedMintABalance = selectedBaseToken ? formatTokenBalance(mintABalance, selectedBaseToken.decimals) : 0
	const formattedMintBBalance = selectedQuoteToken ? formatTokenBalance(mintBBalance, selectedQuoteToken.decimals) : 0

	// Calculated values
	const baseTokenAmount = form.watch('baseTokenAmount')
	const quoteTokenAmount = form.watch('quoteTokenAmount')
	const baseTokenPrice = Number(baseTokenAmount) * mintAInitialPrice
	const quoteTokenPrice = Number(quoteTokenAmount) * mintBInitialPrice
	const totalDepositValue = baseTokenPrice + quoteTokenPrice

	// Exchange rate display
	const exchangeRate =
		selectedBaseToken && selectedQuoteToken
			? `${selectedBaseToken.symbol} per ${selectedQuoteToken.symbol}`
			: 'Token per Token'

	// Loading states
	const isLoadingTokens = getTokensQuery.isPending
	const isTokensError = getTokensQuery.isError

	// Effects
	useEffect(() => {
		form.setValue('baseTokenBalance', formattedMintABalance)
	}, [form, formattedMintABalance])

	useEffect(() => {
		form.setValue('quoteTokenBalance', formattedMintBBalance)
	}, [form, formattedMintBBalance])

	// Handle successful pool creation
	useEffect(() => {
		if (createPoolMutation.isSuccess && createPoolMutation.data) {
			setIsSuccessDialogOpen(true)
			form.reset()
			setCurrentStep(0)
		}
	}, [createPoolMutation.isSuccess, createPoolMutation.data, form])

	// Handle pool creation errors
	useEffect(() => {
		if (createPoolMutation.isError && createPoolMutation.error) {
			openErrorDialog({
				title: 'Failed to create pool',
				description: createPoolMutation.error.message
			})
		}
	}, [createPoolMutation.isError, createPoolMutation.error, openErrorDialog])

	// Handle token loading errors
	useEffect(() => {
		if (isTokensError) {
			toast.error('Failed to load onchain tokens. Using fallback data.')
		}
	}, [isTokensError])

	// Auto-adjust fee tier for BBA pools
	useEffect(() => {
		if (isBBAPoolPair && form.watch('feeTier') !== '0.3') {
			form.setValue('feeTier', '0.3', { shouldValidate: true })
			toast.success(`Fee tier automatically set to 0.3% for BBA/${nonBBAToken?.symbol} pool`)
		}
	}, [isBBAPoolPair, form, nonBBAToken?.symbol])

	const onSubmit = useCallback(
		(payload: TCreatePoolPayload) => {
			createPoolMutation.mutate(payload)
		},
		[createPoolMutation]
	)

	// Handlers
	const onNext = useCallback(async () => {
		const fields = createPoolSteps[currentStep].fields
		const isValid = await form.trigger(fields as FieldName[], { shouldFocus: true })

		if (!isValid) return

		if (currentStep < createPoolSteps.length - 1) {
			setCurrentStep((step) => step + 1)
		} else {
			await form.handleSubmit(onSubmit)()
		}
	}, [currentStep, form, onSubmit])

	const onPrev = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep((step) => step - 1)
		}
	}, [currentStep])

	const onSelectBaseToken = useCallback(
		(token: MintInfo) => {
			form.setValue('baseToken', token, { shouldValidate: true })
		},
		[form]
	)

	const onSelectQuoteToken = useCallback(
		(token: MintInfo) => {
			form.setValue('quoteToken', token, { shouldValidate: true })
		},
		[form]
	)

	// Default token props for TokenListDialog fallback
	const defaultTokenProps: TTokenProps = {
		address: '',
		logoURI: '',
		symbol: '',
		name: '',
		decimals: 0,
		tags: []
	}

	// Type conversion functions for TokenListDialog compatibility
	const convertTTokenPropsToMintInfo = (token: TTokenProps): MintInfo => ({
		chainId: token.chainId,
		address: token.address,
		programId: token.programId,
		logoURI: token.logoURI,
		symbol: token.symbol,
		name: token.name,
		decimals: token.decimals,
		tags: token.tags,
		extensions: token.extensions
	})

	const convertMintInfoToTTokenProps = (token: MintInfo): TTokenProps => ({
		chainId: token.chainId,
		address: token.address,
		programId: token.programId,
		logoURI: token.logoURI,
		symbol: token.symbol,
		name: token.name,
		decimals: token.decimals,
		tags: token.tags,
		extensions: token.extensions
	})

	// Wrapper functions for TokenListDialog compatibility
	const onSelectBaseTokenWrapper = useCallback(
		(token: TTokenProps) => {
			const mintInfo = convertTTokenPropsToMintInfo(token)
			onSelectBaseToken(mintInfo)
		},
		[onSelectBaseToken]
	)

	const onSelectQuoteTokenWrapper = useCallback(
		(token: TTokenProps) => {
			const mintInfo = convertTTokenPropsToMintInfo(token)
			onSelectQuoteToken(mintInfo)
		},
		[onSelectQuoteToken]
	)

	const onOpenTokenDialog = useCallback((type: 'from' | 'to') => {
		setTypeItem(type)
		setIsTokenDialogOpen(true)
	}, [])

	// Auto-calculate quote amount based on price ratio
	// Initial Price format: "X BaseToken per QuoteToken"
	// Example: "1000 SHIB per USDT" means 1 USDT = 1000 SHIB, so 1 SHIB = 1/1000 USDT
	const handleBaseAmountChange = useCallback(
		(value: string) => {
			form.setValue('baseTokenAmount', value, { shouldValidate: true })

			// Auto-calculate quote amount if both tokens and initial price are set
			const initialPrice = parseFloat(form.getValues('initialPrice'))
			if (initialPrice && value && selectedBaseToken && selectedQuoteToken) {
				const baseAmount = parseFloat(value)
				// If price is "X BaseToken per QuoteToken", then QuoteAmount = BaseAmount / X
				const quoteAmount = baseAmount / initialPrice
				form.setValue('quoteTokenAmount', quoteAmount.toString(), { shouldValidate: true })
			}
		},
		[form, selectedBaseToken, selectedQuoteToken]
	)

	const handleQuoteAmountChange = useCallback(
		(value: string) => {
			form.setValue('quoteTokenAmount', value, { shouldValidate: true })

			// Auto-calculate base amount if both tokens and initial price are set
			const initialPrice = parseFloat(form.getValues('initialPrice'))
			if (initialPrice && value && selectedBaseToken && selectedQuoteToken) {
				const quoteAmount = parseFloat(value)
				// If price is "X BaseToken per QuoteToken", then BaseAmount = QuoteAmount * X
				const baseAmount = quoteAmount * initialPrice
				form.setValue('baseTokenAmount', baseAmount.toString(), { shouldValidate: true })
			}
		},
		[form, selectedBaseToken, selectedQuoteToken]
	)

	// Show loading state for tokens

	return (
		<div className="max-w-4xl mx-auto md:px-0 px-[15px] flex flex-col space-y-14">
			{/* Show balance alert if needed */}
			{isNoBalance && <NoBalanceAlert />}

			<div className="text-center flex flex-col space-y-3 ">
				<h1 className="md:text-[45px] text-xl font-bold text-main-black">Create Liquidity Pool</h1>
				<p className="text-xs md:text-lg text-dark-grey">Create a new liquidity pool for token trading on BBAChain</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
					{/* Progress Line */}
					<FormProgressLine steps={createPoolSteps} currentStep={currentStep} />
					<section className="md:px-36">
						<Card className="md:p-6 p-3 flex flex-col space-y-[18px] border-main-green rounded-[12px] shadow-lg">
							<CardHeader className="text-center p-0">
								<CardTitle className="text-lg md:text-[28px] font-bold text-main-black">
									{createPoolSteps[currentStep].name}
								</CardTitle>
								<CardDescription className="text-xs md:text-sm text-dark-grey">
									{createPoolSteps[currentStep].description}
								</CardDescription>
							</CardHeader>
							{/* Step 1: Token Selection */}
							{currentStep === 0 && (
								<CardContent className="space-y-3 md:space-y-6 p-0">
									{/* Token Selection */}
									<TokenSelectionCard
										label="Base Token"
										token={selectedBaseToken}
										onSelect={() => onOpenTokenDialog('from')}
										error={form.formState.errors.baseToken?.message}
									/>
									<TokenSelectionCard
										label="Quote Token"
										token={selectedQuoteToken}
										onSelect={() => onOpenTokenDialog('to')}
										error={form.formState.errors.quoteToken?.message}
									/>

									{/* Fee Tier Selection */}
									<FormField
										control={form.control}
										name="feeTier"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-sm md:text-lg text-main-black font-normal">Fee Tier</FormLabel>
												<Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
													<FormControl>
														<SelectTrigger className="h-12 md:h-14 hover:border-hover-green rounded-lg md:rounded-xl border-2 border-strokes">
															<SelectValue placeholder="Select fee tier" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{feeTierOptions.map((option) => (
															<SelectItem key={option.value} value={option.value.toString()}>
																<div className="flex items-center justify-between w-full">
																	<span className="font-medium">{option.label}</span>
																	<span className="text-xs text-gray-500 ml-2 hidden sm:inline">
																		{option.description}
																	</span>
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage className="text-sm" />
											</FormItem>
										)}
									/>

									{/* BBA Pool Warning/Info */}
									{isBBAPoolPair && (
										<div className="bg-light-yellow rounded-lg md:rounded-xl p-3 md:p-4 border-2 border-warning">
											<div className="flex items-start space-x-2 md:space-x-3">
												<div className="flex-shrink-0 w-6 h-6 bg-warning text-white rounded-full flex items-center justify-center text-sm font-bold">
													!
												</div>
												<div className="flex-1 text-main-black">
													<h4 className="text-sm md:text-base font-semibold mb-1">BBA Native Token Pool</h4>
													<p className="text-xs md:text-sm  mb-2">
														You&apos;re creating a pool with BBA (native token). This requires special handling:
													</p>
													<ul className="text-xs md:text-sm  space-y-1">
														<li className="flex items-center space-x-2">
															<span className="w-1.5 h-1.5 bg-main-black rounded-full"></span>
															<span>BBA will be automatically wrapped to WBBA for the pool</span>
														</li>
														<li className="flex items-center space-x-2">
															<span className="w-1.5 h-1.5 bg-main-black rounded-full"></span>
															<span>Recommended fee tier: 0.3% for BBA/{nonBBAToken?.symbol} pairs</span>
														</li>
														<li className="flex items-center space-x-2">
															<span className="w-1.5 h-1.5 bg-main-black rounded-full"></span>
															<span>Pool will use NATIVE_MINT for WBBA representation</span>
														</li>
													</ul>
												</div>
											</div>
										</div>
									)}

									{/* Pool Preview */}
									{selectedBaseToken && selectedQuoteToken && (
										<div className="bg-box-3 rounded-lg md:rounded-xl p-3 md:p-4">
											<div className="flex items-center space-x-2 md:space-x-3">
												<div className="flex -space-x-1 md:-space-x-2">
													<Image
														src={selectedBaseToken.logoURI || '/icon-placeholder.svg'}
														width={24}
														height={24}
														className="md:w-8 md:h-8 rounded-full border-2 border-white"
														alt={selectedBaseToken.symbol}
													/>
													<Image
														src={selectedQuoteToken.logoURI || '/icon-placeholder.svg'}
														width={24}
														height={24}
														className="md:w-8 md:h-8 rounded-full border-2 border-white"
														alt={selectedQuoteToken.symbol}
													/>
												</div>
												<div>
													<h3 className="text-sm md:text-base font-semibold text-main-black">
														{selectedBaseToken.symbol}/{selectedQuoteToken.symbol}
														{isBBAPoolPair && <span className="ml-1 text-orange-600 text-xs">(Native)</span>}
													</h3>
													<p className="text-xs md:text-sm text-gray-600">
														Fee: {form.watch('feeTier')}%
														{isBBAPoolPair && <span className="ml-1 text-orange-600">(BBA Pool)</span>}
													</p>
												</div>
											</div>
										</div>
									)}
								</CardContent>
							)}

							{/* Step 2: Price Configuration */}
							{currentStep === 1 && (
								<CardContent className="space-y-4 md:space-y-6 p-0">
									{/* Initial Price */}
									<FormField
										control={form.control}
										name="initialPrice"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-sm md:text-lg font-normal flex items-center space-x-2">
													<span>Initial Price</span>
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger>
																<Info className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
															</TooltipTrigger>
															<TooltipContent>
																<p>The starting price ratio between the two tokens</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												</FormLabel>
												<FormControl>
													<div className="relative">
														<Input
															{...field}
															type="number"
															step="0.000001"
															placeholder="0.0"
															className="h-12 md:h-14 remove-arrow-input hover:border-hover-green rounded-lg md:rounded-xl border-2 border-strokes"
														/>
														<div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 max-w-[80px] md:max-w-none truncate">
															{exchangeRate}
														</div>
													</div>
												</FormControl>
												<FormMessage className="text-sm" />
											</FormItem>
										)}
									/>

									{/* Price Range */}
									<div className="flex flex-col space-y-2">
										<label className="text-sm md:text-lg font-normal">Price Range</label>
										<Tabs
											defaultValue="full-range"
											onValueChange={(value) => form.setValue('rangeType', value as 'full-range' | 'custom-range')}
										>
											<TabsList className="bg-light-green px-3 py-1.5 w-full h-10 mb-[18px]">
												<TabsTrigger
													value="full-range"
													className="w-full h-full bg-transparent text-sm text-light-grey font-normal hover:bg-main-green hover:text-main-white focus-visible:bg-main-green focus-visible:text-main-white data-[state=active]:bg-main-green data-[state=active]:text-main-white data-[state=active]:rounded-[4px]"
												>
													Full Range
												</TabsTrigger>
												<TabsTrigger
													value="custom-range"
													className="w-full h-full bg-transparent text-sm text-light-grey font-normal hover:bg-main-green hover:text-main-white focus-visible:bg-main-green focus-visible:text-main-white data-[state=active]:bg-main-green data-[state=active]:text-main-white data-[state=active]:rounded-[4px]"
												>
													Custom Range
												</TabsTrigger>
											</TabsList>
											<TabsContent value="full-range" className="p-2.5">
												<div className="bg-light-blue border-2 border-main-blue rounded-lg md:rounded-xl p-3 md:p-4">
													<div className="flex items-center space-x-2 text-main-black">
														<Info className="w-4 h-4 text-main-blue md:w-5 md:h-5 " />
														<span className="text-sm md:text-base font-medium">Full Range Selected</span>
													</div>
													<p className="text-xs md:text-sm text-main-black mt-1">
														Your liquidity will be active across all price ranges (0 to ∞)
													</p>
												</div>
											</TabsContent>
											<TabsContent value="custom-range" className="p-2.5">
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
													<FormField
														control={form.control}
														name="minInitialPrice"
														render={({ field }) => (
															<FormItem>
																<FormLabel className="text-sm md:text-base font-normal">Min Price</FormLabel>
																<FormControl>
																	<Input
																		{...field}
																		type="number"
																		step="0.000001"
																		placeholder="0.0"
																		className="h-10 md:h-12 rounded-lg md:rounded-xl"
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
													<FormField
														control={form.control}
														name="maxInitialPrice"
														render={({ field }) => (
															<FormItem>
																<FormLabel className="text-sm md:text-base font-normal">Max Price</FormLabel>
																<FormControl>
																	<Input
																		{...field}
																		type="number"
																		step="0.000001"
																		placeholder="0.0"
																		className="h-10 md:h-12 rounded-lg md:rounded-xl"
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</div>
											</TabsContent>
										</Tabs>
									</div>
								</CardContent>
							)}

							{/* Step 3: Deposit Amounts */}
							{currentStep === 2 && (
								<CardContent className="space-y-4 md:space-y-6 p-0">
									<div className="relative">
										<div className="space-y-3 md:space-y-4">
											{selectedBaseToken && (
												<SwapItem
													noTitle
													type="from"
													tokenProps={selectedBaseToken}
													price={baseTokenPrice}
													balance={formattedMintABalance}
													inputAmount={baseTokenAmount}
													setInputAmount={handleBaseAmountChange}
												/>
											)}
											{selectedQuoteToken && (
												<SwapItem
													noTitle
													type="to"
													tokenProps={selectedQuoteToken}
													price={quoteTokenPrice}
													balance={formattedMintBBalance}
													inputAmount={quoteTokenAmount}
													setInputAmount={handleQuoteAmountChange}
												/>
											)}
										</div>
										<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
											<Button
												onClick={() => {}}
												type="button"
												size="icon"
												className="rounded-full md:[&_svg]:size-6 	border-none bg-main-green text-main-white md:w-14 md:h-14 w-8 h-8"
											>
												<FaPlus />
											</Button>
										</div>
									</div>

									{/* Deposit Summary */}
									<div className="border-2 border-dark-grey rounded-lg md:rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
										<h4 className="text-sm md:text-base font-medium text-main-black">Deposit Summary</h4>
										<div className="space-y-1 md:space-y-2 text-xs md:text-sm">
											<div className="flex justify-between">
												<span className="text-gray-600 dark:text-gray-400">Total Value:</span>
												<span className="font-medium">${totalDepositValue.toFixed(2)}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-gray-600 dark:text-gray-400">Pool Share:</span>
												<span className="font-medium">100% (New Pool)</span>
											</div>
										</div>
									</div>
								</CardContent>
							)}

							{/* Step 4: Review & Create */}
							{currentStep === 3 && (
								<CardContent className="space-y-4 md:space-y-6 p-0">
									{/* Pool Overview */}
									<div className="bg-opacity-30 bg-[#D9D9D9] rounded-lg md:rounded-xl p-4 md:p-6">
										<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-4 space-y-3 md:space-y-0">
											<div className="flex items-center space-x-2 md:space-x-3">
												<div className="flex -space-x-1 md:-space-x-2">
													<Image
														src={selectedBaseToken?.logoURI || '/icon-placeholder.svg'}
														width={32}
														height={32}
														className="md:w-10 md:h-10 rounded-full border-2 border-white"
														alt={selectedBaseToken?.symbol}
													/>
													<Image
														src={selectedQuoteToken?.logoURI || '/icon-placeholder.svg'}
														width={32}
														height={32}
														className="md:w-10 md:h-10 rounded-full border-2 border-white"
														alt={selectedQuoteToken?.symbol}
													/>
												</div>
												<div>
													<h3 className="text-base md:text-lg font-semibold text-main-black">
														{selectedBaseToken?.symbol}/{selectedQuoteToken?.symbol}
													</h3>
													<p className="text-xs md:text-sm text-light-grey">Fee: {form.watch('feeTier')}%</p>
												</div>
											</div>
											<div className="text-left md:text-right">
												<p className="text-xs md:text-sm text-light-grey">Total Deposit</p>
												<p className="text-base md:text-lg font-semibold text-main-black">
													${totalDepositValue.toFixed(2)}
												</p>
											</div>
										</div>

										{/* Pool Stats Preview */}
										<div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-4">
											<div className="bg-box-3 border border-box-2 rounded-lg p-3 text-center">
												<p className="text-main-black md:text-sm text-xs font-normal">Initial TVL</p>
												<p className="text-sm md:text-base font-semibold text-main-black">
													${totalDepositValue.toFixed(2)}
												</p>
											</div>
											<div className="bg-box-3 border border-box-2 rounded-lg p-3 text-center">
												<p className="text-main-black md:text-sm text-xs font-normal">Your Share</p>
												<p className="text-sm md:text-base font-semibold text-main-black">100%</p>
											</div>
											<div className="bg-box-3 border border-box-2 rounded-lg p-3 text-center col-span-2 md:col-span-1">
												<p className="text-main-black md:text-sm text-xs font-normal">Swap Fee</p>
												<p className="text-sm md:text-base font-semibold text-main-black">{form.watch('feeTier')}%</p>
											</div>
										</div>
									</div>

									{/* Detailed Information */}
									<div className="grid gap-3 md:gap-4">
										{/* Pool Configuration */}
										<div className="bg-opacity-30 bg-[#D9D9D9] rounded-lg md:rounded-xl p-3 md:p-4">
											<h4 className="text-sm md:text-base font-medium text-main-black mb-2 md:mb-3 flex items-center">
												<IoSettings className="text-main-green mr-1.5" />
												Pool Configuration
											</h4>
											<div className="space-y-2 md:space-y-3">
												<div className="flex justify-between items-center">
													<h5 className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Initial Price:</h5>
													<p className="text-xs text-main-black md:text-sm font-medium text-right max-w-[60%] break-words">
														{form.watch('initialPrice')} {exchangeRate}
													</p>
												</div>
												<div className="flex justify-between items-center">
													<h5 className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Price Range:</h5>
													<p className="text-xs text-main-black md:text-sm font-medium">
														{form.watch('rangeType') === 'custom-range'
															? `${form.watch('minInitialPrice')} - ${form.watch('maxInitialPrice')}`
															: 'Full Range (0 to ∞)'}
													</p>
												</div>
												<div className="flex justify-between items-center">
													<h5 className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Trading Fee:</h5>
													<p className="text-xs text-main-black md:text-sm font-medium">
														{form.watch('feeTier')}% per trade
													</p>
												</div>
												<div className="flex justify-between items-center">
													<h5 className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Pool Type:</h5>
													<p className="text-xs text-main-black md:text-sm font-medium">Constant Product (x*y=k)</p>
												</div>
											</div>
										</div>

										{/* Token Deposits */}
										<div className="bg-opacity-30 bg-[#D9D9D9] rounded-lg md:rounded-xl p-3 md:p-4">
											<h4 className="text-sm md:text-base font-medium text-main-black mb-2 md:mb-3 flex items-center">
												<Image
													src="/money-bag-icon.svg"
													width={15}
													height={15}
													alt="money-bag-icon"
													className="inline mr-1.5"
												/>
												Token Deposits
											</h4>
											<div className="space-y-3">
												<div className="flex items-center justify-between p-2 bg-main-white rounded-lg">
													<div className="flex items-center space-x-2">
														<Image
															src={selectedBaseToken?.logoURI || '/icon-placeholder.svg'}
															width={24}
															height={24}
															className="rounded-full"
															alt={selectedBaseToken?.symbol}
														/>
														<div>
															<p className="text-xs md:text-sm font-medium">{selectedBaseToken?.symbol}</p>
															<p className="text-xs text-gray-500">{selectedBaseToken?.name}</p>
														</div>
													</div>
													<div className="text-right">
														<p className="text-xs md:text-sm font-semibold">{baseTokenAmount} tokens</p>
														<p className="text-xs text-gray-500">${baseTokenPrice.toFixed(2)}</p>
													</div>
												</div>
												<div className="flex items-center justify-between p-2 bg-main-white rounded-lg">
													<div className="flex items-center space-x-2">
														<Image
															src={selectedQuoteToken?.logoURI || '/icon-placeholder.svg'}
															width={24}
															height={24}
															className="rounded-full"
															alt={selectedQuoteToken?.symbol}
														/>
														<div>
															<p className="text-xs md:text-sm font-medium">{selectedQuoteToken?.symbol}</p>
															<p className="text-xs text-gray-500">{selectedQuoteToken?.name}</p>
														</div>
													</div>
													<div className="text-right">
														<p className="text-xs md:text-sm font-semibold">{quoteTokenAmount} tokens</p>
														<p className="text-xs text-gray-500">${quoteTokenPrice.toFixed(2)}</p>
													</div>
												</div>
											</div>
										</div>

										{/* Expected Returns */}
										<div className="bg-transparent-green rounded-lg md:rounded-xl p-3 md:p-4 border border-main-green">
											<h4 className="text-sm md:text-base font-medium text-main-black mb-2 md:mb-3 flex items-center">
												<FaChartArea className="text-main-green mr-1.5" />
												Expected Returns
											</h4>
											<div className="space-y-2">
												<div className="flex justify-between items-center">
													<h5 className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Trading Fee Revenue:</h5>
													<p className="text-xs text-main-black md:text-sm font-medium">
														{form.watch('feeTier')}% per trade
													</p>
												</div>
												<div className="flex justify-between items-center">
													<h5 className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
														Est. Daily Volume (1% of TVL):
													</h5>
													<p className="text-xs text-main-black md:text-sm font-medium">
														${(totalDepositValue * 0.01).toFixed(2)}
													</p>
												</div>
												<div className="flex justify-between items-center">
													<h5 className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Est. Daily Fees:</h5>
													<p className="text-xs text-main-black md:text-sm font-medium">
														${((totalDepositValue * 0.01 * parseFloat(form.watch('feeTier'))) / 100).toFixed(4)}
													</p>
												</div>
												<div className="pt-2 border-t border-green-200 dark:border-green-700">
													<div className="flex justify-between items-center">
														<h5 className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Est. Annual APR:</h5>
														<p className="text-xs text-main-black md:text-sm font-medium">
															{(
																((((totalDepositValue * 0.01 * parseFloat(form.watch('feeTier'))) / 100) * 365) /
																	totalDepositValue) *
																100
															).toFixed(2)}
															%
														</p>
													</div>
												</div>
											</div>
										</div>
									</div>

									{/* Risk Warning */}
									<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg md:rounded-xl p-3 md:p-4">
										<div className="flex items-start space-x-1.5">
											<AlertCircle className="text-yellow-600 dark:text-yellow-400" />
											<div>
												<h4 className="text-sm md:text-base font-medium text-yellow-800 dark:text-yellow-200">
													Important Notice
												</h4>
												<p className="text-xs md:text-sm text-yellow-700 dark:text-yellow-300 mt-1">
													Creating a liquidity pool involves risk. Token prices can fluctuate, and you may experience
													impermanent loss. Please ensure you understand the risks before proceeding.
												</p>
											</div>
										</div>
									</div>
								</CardContent>
							)}

							{/* Navigation Buttons */}
							<CardFooter className="flex justify-between items-center w-full py-0 md:px-3 px-0">
								<Button
									type="button"
									variant="ghost"
									onClick={onPrev}
									disabled={currentStep === 0 || createPoolMutation.isPending}
									className="flex items-center space-x-2 py-1 px-3 h-10 max-w-28 w-full text-sm md:text-base"
								>
									<ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
									<span className="hidden sm:inline">Previous</span>
									<span className="sm:hidden">Prev</span>
								</Button>
								<Button
									type="button"
									onClick={onNext}
									disabled={createPoolMutation.isPending || (currentStep === 3 && !form.formState.isValid)}
									className="flex items-center rounded-[26px] space-x-2 py-1 px-3 h-10 max-w-36 w-full text-sm md:text-base bg-main-green hover:bg-hover-green disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{createPoolMutation.isPending ? (
										<>
											<Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
											<span className="hidden sm:inline">Creating Pool...</span>
											<span className="sm:hidden">Creating...</span>
										</>
									) : currentStep === createPoolSteps.length - 1 ? (
										<>
											<span>Create Pool</span>
											<ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
										</>
									) : (
										<>
											<span className="hidden sm:inline">Next</span>
											<span className="sm:hidden">Next</span>
											<ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
										</>
									)}
								</Button>
							</CardFooter>
						</Card>
					</section>
				</form>
			</Form>

			{/* Token Selection Dialog */}
			<TokenListDialog
				isOpen={isTokenDialogOpen}
				setIsOpen={setIsTokenDialogOpen}
				type={typeItem}
				selectedFrom={selectedBaseToken ? convertMintInfoToTTokenProps(selectedBaseToken) : defaultTokenProps}
				setSelectedFrom={onSelectBaseTokenWrapper}
				selectedTo={selectedQuoteToken ? convertMintInfoToTTokenProps(selectedQuoteToken) : defaultTokenProps}
				setSelectedTo={onSelectQuoteTokenWrapper}
			/>

			{/* Success Dialog */}
			<LPSuccessDialog
				isOpen={isSuccessDialogOpen}
				onOpenChange={setIsSuccessDialogOpen}
				title="Liquidity Pool Created Successfully"
				contents={[
					'🎉 Your new liquidity pool has been created!',
					`Pair: ${createPoolMutation.data?.baseToken.symbol} / ${createPoolMutation.data?.quoteToken.symbol}`,
					`Initial Liquidity: ${createPoolMutation.data?.baseToken.symbol}: ${createPoolMutation.data?.baseTokenAmount}, ${createPoolMutation.data?.quoteToken.symbol}: ${createPoolMutation.data?.quoteTokenAmount}`,
					'You can now add more liquidity or begin trading this pair.'
				]}
				linkText="View Pool"
				link={`/liquidity-pools/detail/${createPoolMutation.data?.poolMint}`}
			/>

			{/* Loading Overlay */}
			<LoadingDialog
				isOpen={createPoolMutation.isPending}
				title="Creating Pool..."
				description="Your liquidity pool is being created on BBAChain."
			/>
		</div>
	)
}
