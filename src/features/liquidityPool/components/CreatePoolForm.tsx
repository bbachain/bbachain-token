'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronLeft, ChevronRight, Info, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FaPlus } from 'react-icons/fa6'
import { MdTrendingUp } from 'react-icons/md'

import { NoBalanceAlert } from '@/components/layout/Alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SwapItem from '@/features/swap/components/SwapItem'
import TokenListDialog from '@/features/swap/components/TokenListDialog'
import {
	useGetTokensFromAPI,
	useGetTokenPrice,
	useGetUserBalanceByMint,
	useGetCoinGeckoTokenPrice
} from '@/features/swap/services'
import { TTokenProps } from '@/features/swap/types'
import { cn, formatTokenBalance } from '@/lib/utils'
import { useGetBalance } from '@/services/wallet'
import StaticTokens from '@/staticData/tokens'
import { useErrorDialog } from '@/stores/errorDialog'

import { useCreatePool } from '../services'
import { TCreatePoolPayload, MintInfo } from '../types'
import { createPoolValidation } from '../validation'

// Enhanced step configuration
const createPoolSteps = [
	{
		id: 1,
		name: 'Token Selection',
		description: 'Choose the token pair for your liquidity pool',
		fields: ['baseToken', 'quoteToken', 'feeTier'],
		icon: '🪙'
	},
	{
		id: 2,
		name: 'Price Configuration',
		description: 'Set initial price and range for the pool',
		fields: ['initialPrice', 'minInitialPrice', 'maxInitialPrice'],
		icon: '📊'
	},
	{
		id: 3,
		name: 'Deposit Amounts',
		description: 'Enter the amount of tokens to deposit',
		fields: ['baseTokenAmount', 'quoteTokenAmount'],
		icon: '💰'
	},
	{
		id: 4,
		name: 'Review & Create',
		description: 'Review your pool configuration and create',
		fields: [],
		icon: '✅'
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

// Enhanced Progress Line Component
function EnhancedProgressLine({ currentStep, steps }: { currentStep: number; steps: typeof createPoolSteps }) {
	return (
		<div className="w-full mb-8">
			<div className="flex items-center justify-between mb-4">
				{steps.map((step, index) => (
					<div key={step.id} className="flex flex-col items-center flex-1">
						<div className="flex items-center w-full">
							<div
								className={cn(
									'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
									index <= currentStep
										? 'bg-main-green border-main-green text-white'
										: 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
								)}
							>
								{index < currentStep ? (
									<CheckCircle className="w-5 h-5" />
								) : (
									<span className="text-sm font-medium">{step.id}</span>
								)}
							</div>
							{index < steps.length - 1 && (
								<div
									className={cn(
										'flex-1 h-0.5 mx-2 transition-all duration-300',
										index < currentStep ? 'bg-main-green' : 'bg-gray-300 dark:bg-gray-600'
									)}
								/>
							)}
						</div>
						<div className="mt-2 text-center">
							<p
								className={cn(
									'text-xs font-medium',
									index <= currentStep ? 'text-main-green' : 'text-gray-400 dark:text-gray-500'
								)}
							>
								{step.name}
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">{step.description}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

// Success Dialog Component
function SuccessDialog({ isOpen, onClose, poolData }: { isOpen: boolean; onClose: () => void; poolData: any }) {
	const handleViewPool = () => {
		// Navigate to the created pool
		onClose()
		// TODO: Add navigation to pool detail page
	}

	const handleCreateAnother = () => {
		onClose()
		// Form will be reset in the onClose handler
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px] rounded-[16px] p-0 overflow-hidden">
				{/* Success Header with Animation */}
				<div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 text-center">
					<div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
						<CheckCircle className="w-8 h-8" />
					</div>
					<DialogTitle className="text-xl font-semibold mb-2">🎉 Pool Created Successfully!</DialogTitle>
					<DialogDescription className="text-green-100">
						Your liquidity pool is now live and trading on BBAChain
					</DialogDescription>
				</div>

				<div className="p-6 space-y-6">
					{/* Pool Information */}
					<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
						<h4 className="font-semibold text-main-black mb-3 flex items-center">
							<span className="text-lg mr-2">💰</span>
							Pool Information
						</h4>
						<div className="space-y-3">
							<div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
								<span className="text-gray-600 dark:text-gray-400">Pool Address:</span>
								<div className="flex items-center space-x-2">
									<span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
										{poolData?.tokenSwap?.slice(0, 8)}...{poolData?.tokenSwap?.slice(-8)}
									</span>
									<Button
										size="sm"
										variant="ghost"
										className="h-6 w-6 p-0"
										onClick={() => navigator.clipboard.writeText(poolData?.tokenSwap || '')}
									>
										📋
									</Button>
								</div>
							</div>
							<div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
								<span className="text-gray-600 dark:text-gray-400">LP Token:</span>
								<div className="flex items-center space-x-2">
									<span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
										{poolData?.poolMint?.slice(0, 8)}...{poolData?.poolMint?.slice(-8)}
									</span>
									<Button
										size="sm"
										variant="ghost"
										className="h-6 w-6 p-0"
										onClick={() => navigator.clipboard.writeText(poolData?.poolMint || '')}
									>
										📋
									</Button>
								</div>
							</div>
							<div className="flex justify-between items-center py-2">
								<span className="text-gray-600 dark:text-gray-400">Status:</span>
								<span className="flex items-center space-x-2 text-green-600 dark:text-green-400">
									<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
									<span className="font-medium">Active</span>
								</span>
							</div>
						</div>
					</div>

					{/* Next Steps */}
					<div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
						<h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
							<span className="text-lg mr-2">🚀</span>
							What&apos;s Next?
						</h4>
						<ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
							<li className="flex items-center space-x-2">
								<span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
								<span>Your pool is now discoverable by traders</span>
							</li>
							<li className="flex items-center space-x-2">
								<span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
								<span>You&apos;ll earn fees from trades automatically</span>
							</li>
							<li className="flex items-center space-x-2">
								<span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
								<span>Monitor your position in the Pools dashboard</span>
							</li>
						</ul>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-3">
						<Button onClick={handleViewPool} variant="outline" className="flex-1">
							View Pool
						</Button>
						<Button onClick={handleCreateAnother} className="flex-1 bg-main-green hover:bg-hover-green">
							Create Another Pool
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

// Loading Overlay Component
function LoadingOverlay({ isVisible, message }: { isVisible: boolean; message: string }) {
	if (!isVisible) return null

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
			<div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-sm mx-4">
				<div className="text-center space-y-4">
					<div className="w-16 h-16 mx-auto bg-main-green/10 rounded-full flex items-center justify-center">
						<Loader2 className="w-8 h-8 text-main-green animate-spin" />
					</div>
					<div>
						<h3 className="font-semibold text-lg text-main-black">Creating Pool...</h3>
						<p className="text-gray-600 dark:text-gray-400 mt-1">{message}</p>
					</div>
					<div className="flex justify-center space-x-1">
						<div className="w-2 h-2 bg-main-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
						<div
							className="w-2 h-2 bg-main-green rounded-full animate-bounce"
							style={{ animationDelay: '150ms' }}
						></div>
						<div
							className="w-2 h-2 bg-main-green rounded-full animate-bounce"
							style={{ animationDelay: '300ms' }}
						></div>
					</div>
				</div>
			</div>
		</div>
	)
}

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
			<label className="text-sm font-medium text-main-black">{label}</label>
			<Button
				type="button"
				variant="outline"
				className={cn(
					'w-full justify-between h-14 p-4 rounded-xl border-2 transition-all duration-200',
					error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-main-green'
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
			{error && <p className="text-sm text-red-500">{error}</p>}
		</div>
	)
}

export default function CreatePoolForm() {
	// Hooks
	const getTokensQuery = useGetTokensFromAPI()
	const createPoolMutation = useCreatePool()
	const getBalanceQuery = useGetBalance()
	const { openErrorDialog } = useErrorDialog()

	// Token data from API with fallback to static data
	const tokenData = getTokensQuery.data?.data || StaticTokens

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
	const [poolCreationData, setPoolCreationData] = useState<any>(null)

	// Computed values
	const selectedBaseToken = form.watch('baseToken')
	const selectedQuoteToken = form.watch('quoteToken')
	const priceSetting = form.watch('priceSetting')
	const isNoBalance = getBalanceQuery.isError || !getBalanceQuery.data || getBalanceQuery.data === 0

	// Balance queries
	const getMintABalance = useGetUserBalanceByMint({
		mintAddress: selectedBaseToken?.address || ''
	})
	const getMintBBalance = useGetUserBalanceByMint({
		mintAddress: selectedQuoteToken?.address || ''
	})
	const getMintATokenPrice = useGetCoinGeckoTokenPrice({
		symbol: selectedBaseToken?.symbol || ''
	})
	const getMintBTokenPrice = useGetCoinGeckoTokenPrice({
		symbol: selectedQuoteToken?.symbol || ''
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
			setPoolCreationData(createPoolMutation.data)
			setIsSuccessDialogOpen(true)
			form.reset()
			setCurrentStep(0)
			toast.success('Pool created successfully!')
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
	}, [currentStep, form])

	const onPrev = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep((step) => step - 1)
		}
	}, [currentStep])

	const onSubmit = useCallback(
		(payload: TCreatePoolPayload) => {
			createPoolMutation.mutate(payload)
		},
		[createPoolMutation]
	)

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
	if (isLoadingTokens) {
		return (
			<div className="max-w-2xl mx-auto px-4 py-6">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-main-black mb-2">Create Liquidity Pool</h1>
					<p className="text-gray-600 dark:text-gray-400">Create a new liquidity pool for token trading on BBAChain</p>
				</div>

				<div className="space-y-6">
					<div className="flex items-center justify-center py-12">
						<div className="text-center space-y-4">
							<Loader2 className="w-8 h-8 animate-spin mx-auto text-main-green" />
							<p className="text-gray-600 dark:text-gray-400">Loading available tokens...</p>
							<p className="text-sm text-gray-500 dark:text-gray-500">Fetching token list from BBAChain registry</p>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="max-w-2xl mx-auto px-4 py-6">
			<div className="text-center mb-8">
				<h1 className="text-2xl md:text-3xl font-bold text-main-black mb-2">Create Liquidity Pool</h1>
				<p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
					Create a new liquidity pool for token trading on BBAChain
				</p>
			</div>

			{/* Show balance alert if needed */}
			{isNoBalance && <NoBalanceAlert />}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
					{/* Progress Line */}
					<EnhancedProgressLine currentStep={currentStep} steps={createPoolSteps} />

					{/* Step 1: Token Selection */}
					{currentStep === 0 && (
						<Card className="border-2 border-gray-200 dark:border-gray-700 rounded-xl md:rounded-2xl shadow-lg">
							<CardHeader className="text-center pb-4 px-4 md:px-6">
								<div className="flex items-center justify-center space-x-2 mb-2">
									<span className="text-xl md:text-2xl">🪙</span>
									<CardTitle className="text-lg md:text-xl">Token Selection</CardTitle>
								</div>
								<p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
									Choose the token pair for your liquidity pool
								</p>
							</CardHeader>
							<CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
								{/* Token Selection */}
								<div className="grid gap-4 md:gap-6">
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
								</div>

								{/* Fee Tier Selection */}
								<FormField
									control={form.control}
									name="feeTier"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-sm md:text-base font-medium">Fee Tier</FormLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<FormControl>
													<SelectTrigger className="h-12 md:h-14 rounded-lg md:rounded-xl border-2 border-gray-200 dark:border-gray-700">
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
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Pool Preview */}
								{selectedBaseToken && selectedQuoteToken && (
									<div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg md:rounded-xl p-3 md:p-4">
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
												</h3>
												<p className="text-xs md:text-sm text-gray-600">Fee: {form.watch('feeTier')}%</p>
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Step 2: Price Configuration */}
					{currentStep === 1 && (
						<Card className="border-2 border-gray-200 dark:border-gray-700 rounded-xl md:rounded-2xl shadow-lg">
							<CardHeader className="text-center pb-4 px-4 md:px-6">
								<div className="flex items-center justify-center space-x-2 mb-2">
									<span className="text-xl md:text-2xl">📊</span>
									<CardTitle className="text-lg md:text-xl">Price Configuration</CardTitle>
								</div>
								<p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
									Set the initial price and range for your pool
								</p>
							</CardHeader>
							<CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
								{/* Initial Price */}
								<FormField
									control={form.control}
									name="initialPrice"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="flex items-center space-x-2 text-sm md:text-base">
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
														className="h-12 md:h-14 text-base md:text-lg rounded-lg md:rounded-xl border-2 border-gray-200 dark:border-gray-700 pr-20 md:pr-24"
													/>
													<div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 max-w-[80px] md:max-w-none truncate">
														{exchangeRate}
													</div>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Price Range */}
								<div className="space-y-3 md:space-y-4">
									<label className="text-sm md:text-base font-medium">Price Range</label>
									<Tabs
										defaultValue="full-range"
										onValueChange={(value) => form.setValue('rangeType', value as 'full-range' | 'custom-range')}
									>
										<TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 h-9 md:h-10">
											<TabsTrigger value="full-range" className="text-sm">
												Full Range
											</TabsTrigger>
											<TabsTrigger value="custom-range" className="text-sm">
												Custom Range
											</TabsTrigger>
										</TabsList>
										<TabsContent value="full-range" className="mt-3 md:mt-4">
											<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg md:rounded-xl p-3 md:p-4">
												<div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
													<Info className="w-4 h-4 md:w-5 md:h-5" />
													<span className="text-sm md:text-base font-medium">Full Range Selected</span>
												</div>
												<p className="text-xs md:text-sm text-blue-600 dark:text-blue-400 mt-1">
													Your liquidity will be active across all price ranges (0 to ∞)
												</p>
											</div>
										</TabsContent>
										<TabsContent value="custom-range" className="mt-3 md:mt-4">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
												<FormField
													control={form.control}
													name="minInitialPrice"
													render={({ field }) => (
														<FormItem>
															<FormLabel className="text-sm md:text-base">Min Price</FormLabel>
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
															<FormLabel className="text-sm md:text-base">Max Price</FormLabel>
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
						</Card>
					)}

					{/* Step 3: Deposit Amounts */}
					{currentStep === 2 && (
						<Card className="border-2 border-gray-200 dark:border-gray-700 rounded-xl md:rounded-2xl shadow-lg">
							<CardHeader className="text-center pb-4 px-4 md:px-6">
								<div className="flex items-center justify-center space-x-2 mb-2">
									<span className="text-xl md:text-2xl">💰</span>
									<CardTitle className="text-lg md:text-xl">Deposit Amounts</CardTitle>
								</div>
								<p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
									Enter the amount of tokens you want to deposit
								</p>
							</CardHeader>
							<CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
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
										<div className="bg-main-green text-white rounded-full p-2 md:p-3 shadow-lg">
											<FaPlus className="w-3 h-3 md:w-4 md:h-4" />
										</div>
									</div>
								</div>

								{/* Deposit Summary */}
								<div className="bg-gray-50 dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
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
						</Card>
					)}

					{/* Step 4: Review & Create */}
					{currentStep === 3 && (
						<Card className="border-2 border-gray-200 dark:border-gray-700 rounded-xl md:rounded-2xl shadow-lg">
							<CardHeader className="text-center pb-4 px-4 md:px-6">
								<div className="flex items-center justify-center space-x-2 mb-2">
									<span className="text-xl md:text-2xl">✅</span>
									<CardTitle className="text-lg md:text-xl">Review & Create</CardTitle>
								</div>
								<p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
									Review your pool configuration before creating
								</p>
							</CardHeader>
							<CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
								{/* Pool Overview */}
								<div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg md:rounded-xl p-4 md:p-6">
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
												<p className="text-xs md:text-sm text-gray-600">Fee: {form.watch('feeTier')}%</p>
											</div>
										</div>
										<div className="text-left md:text-right">
											<p className="text-xs md:text-sm text-gray-600">Total Deposit</p>
											<p className="text-base md:text-lg font-semibold text-main-black">
												${totalDepositValue.toFixed(2)}
											</p>
										</div>
									</div>

									{/* Pool Stats Preview */}
									<div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-4">
										<div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
											<p className="text-xs text-gray-600 dark:text-gray-400">Initial TVL</p>
											<p className="text-sm md:text-base font-semibold text-main-black">
												${totalDepositValue.toFixed(2)}
											</p>
										</div>
										<div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
											<p className="text-xs text-gray-600 dark:text-gray-400">Your Share</p>
											<p className="text-sm md:text-base font-semibold text-main-black">100%</p>
										</div>
										<div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center col-span-2 md:col-span-1">
											<p className="text-xs text-gray-600 dark:text-gray-400">Swap Fee</p>
											<p className="text-sm md:text-base font-semibold text-main-black">{form.watch('feeTier')}%</p>
										</div>
									</div>
								</div>

								{/* Detailed Information */}
								<div className="grid gap-3 md:gap-4">
									{/* Pool Configuration */}
									<div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
										<h4 className="text-sm md:text-base font-medium text-main-black mb-2 md:mb-3 flex items-center">
											<span className="mr-2">⚙️</span>
											Pool Configuration
										</h4>
										<div className="space-y-2 md:space-y-3">
											<div className="flex justify-between items-center py-1">
												<span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Initial Price:</span>
												<span className="text-xs md:text-sm font-medium text-right max-w-[60%] break-words">
													{form.watch('initialPrice')} {exchangeRate}
												</span>
											</div>
											<div className="flex justify-between items-center py-1">
												<span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Price Range:</span>
												<span className="text-xs md:text-sm font-medium">
													{form.watch('rangeType') === 'custom-range'
														? `${form.watch('minInitialPrice')} - ${form.watch('maxInitialPrice')}`
														: 'Full Range (0 to ∞)'}
												</span>
											</div>
											<div className="flex justify-between items-center py-1">
												<span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Trading Fee:</span>
												<span className="text-xs md:text-sm font-medium">{form.watch('feeTier')}% per trade</span>
											</div>
											<div className="flex justify-between items-center py-1">
												<span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Pool Type:</span>
												<span className="text-xs md:text-sm font-medium">Constant Product (x*y=k)</span>
											</div>
										</div>
									</div>

									{/* Token Deposits */}
									<div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
										<h4 className="text-sm md:text-base font-medium text-main-black mb-2 md:mb-3 flex items-center">
											<span className="mr-2">💰</span>
											Token Deposits
										</h4>
										<div className="space-y-3">
											<div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
											<div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
									<div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg md:rounded-xl p-3 md:p-4 border border-green-200 dark:border-green-800">
										<h4 className="text-sm md:text-base font-medium text-green-900 dark:text-green-100 mb-2 md:mb-3 flex items-center">
											<span className="mr-2">📈</span>
											Expected Returns
										</h4>
										<div className="space-y-2">
											<div className="flex justify-between items-center">
												<span className="text-xs md:text-sm text-green-700 dark:text-green-300">
													Trading Fee Revenue:
												</span>
												<span className="text-xs md:text-sm font-medium text-green-900 dark:text-green-100">
													{form.watch('feeTier')}% per trade
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-xs md:text-sm text-green-700 dark:text-green-300">
													Est. Daily Volume (1% of TVL):
												</span>
												<span className="text-xs md:text-sm font-medium text-green-900 dark:text-green-100">
													${(totalDepositValue * 0.01).toFixed(2)}
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-xs md:text-sm text-green-700 dark:text-green-300">Est. Daily Fees:</span>
												<span className="text-xs md:text-sm font-medium text-green-900 dark:text-green-100">
													${((totalDepositValue * 0.01 * parseFloat(form.watch('feeTier'))) / 100).toFixed(4)}
												</span>
											</div>
											<div className="pt-2 border-t border-green-200 dark:border-green-700">
												<div className="flex justify-between items-center">
													<span className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300">
														Est. Annual APR:
													</span>
													<span className="text-sm md:text-base font-bold text-green-900 dark:text-green-100">
														{(
															((((totalDepositValue * 0.01 * parseFloat(form.watch('feeTier'))) / 100) * 365) /
																totalDepositValue) *
															100
														).toFixed(2)}
														%
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Risk Warning */}
								<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg md:rounded-xl p-3 md:p-4">
									<div className="flex items-start space-x-2 md:space-x-3">
										<AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
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
						</Card>
					)}

					{/* Navigation Buttons */}
					<div className="flex justify-between items-center pt-4 md:pt-6">
						<Button
							type="button"
							variant="outline"
							onClick={onPrev}
							disabled={currentStep === 0 || createPoolMutation.isPending}
							className="flex items-center space-x-1 md:space-x-2 px-3 md:px-6 h-10 md:h-12 text-sm md:text-base"
						>
							<ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
							<span className="hidden sm:inline">Previous</span>
							<span className="sm:hidden">Prev</span>
						</Button>

						<div className="flex space-x-1 md:space-x-2">
							{createPoolSteps.map((_, index) => (
								<div
									key={index}
									className={cn(
										'w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300',
										index === currentStep ? 'bg-main-green w-6 md:w-8' : 'bg-gray-300 dark:bg-gray-600'
									)}
								/>
							))}
						</div>

						<Button
							type="button"
							onClick={onNext}
							disabled={createPoolMutation.isPending || (currentStep === 3 && !form.formState.isValid)}
							className="flex items-center space-x-1 md:space-x-2 px-3 md:px-6 h-10 md:h-12 text-sm md:text-base bg-main-green hover:bg-hover-green disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{createPoolMutation.isPending ? (
								<>
									<Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
									<span className="hidden sm:inline">Creating Pool...</span>
									<span className="sm:hidden">Creating...</span>
								</>
							) : currentStep === createPoolSteps.length - 1 ? (
								<>
									<span className="hidden sm:inline">🚀 Create Liquidity Pool</span>
									<span className="sm:hidden">🚀 Create</span>
									<CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
								</>
							) : (
								<>
									<span className="hidden sm:inline">Next</span>
									<span className="sm:hidden">Next</span>
									<ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
								</>
							)}
						</Button>
					</div>
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
			<SuccessDialog
				isOpen={isSuccessDialogOpen}
				onClose={() => {
					setIsSuccessDialogOpen(false)
					setPoolCreationData(null)
				}}
				poolData={poolCreationData}
			/>

			{/* Loading Overlay */}
			<LoadingOverlay
				isVisible={createPoolMutation.isPending}
				message="Your liquidity pool is being created on BBAChain."
			/>

			{/* Token Loading Status */}
			{isLoadingTokens && (
				<div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-3">
						<Loader2 className="w-4 h-4 animate-spin text-main-green" />
						<span className="text-sm text-gray-600 dark:text-gray-400">Loading tokens from API...</span>
					</div>
				</div>
			)}

			{/* Token Error Status */}
			{isTokensError && (
				<div className="fixed bottom-4 right-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-lg p-4 border border-yellow-200 dark:border-yellow-800">
					<div className="flex items-center space-x-3">
						<AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
						<span className="text-sm text-yellow-700 dark:text-yellow-300">API unavailable, using static tokens</span>
					</div>
				</div>
			)}
		</div>
	)
}
