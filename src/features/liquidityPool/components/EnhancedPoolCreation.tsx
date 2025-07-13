/**
 * Enhanced Pool Creation Component
 * Demonstrates usage of enhanced pool creation services with native BBA support
 */

'use client'

import { PublicKey } from '@bbachain/web3.js'
import { AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isNativeBBA, getDefaultTradingPairs } from '@/staticData/tokens'

import {
	useEnhancedCreatePool,
	useEnhancedBBABalance,
	useEnhancedPoolAvailability,
	useEnhancedTradingPairs,
	EnhancedCreatePoolPayload
} from '../enhancedServices'
import { MintInfo } from '../types'

const FEE_TIERS = [
	{ label: '0.01%', value: '0.01', description: 'Best for very stable pairs' },
	{ label: '0.05%', value: '0.05', description: 'Good for stable pairs' },
	{ label: '0.25%', value: '0.25', description: 'Standard for most pairs' },
	{ label: '0.30%', value: '0.30', description: 'Common for volatile pairs' },
	{ label: '1.00%', value: '1.00', description: 'Best for very volatile pairs' }
]

export default function EnhancedPoolCreation() {
	// State management
	const [selectedBaseToken, setSelectedBaseToken] = useState<MintInfo | null>(null)
	const [selectedQuoteToken, setSelectedQuoteToken] = useState<MintInfo | null>(null)
	const [baseTokenAmount, setBaseTokenAmount] = useState('')
	const [quoteTokenAmount, setQuoteTokenAmount] = useState('')
	const [feeTier, setFeeTier] = useState('0.25')
	const [initialPrice, setInitialPrice] = useState('')
	const [enableNativeBBA, setEnableNativeBBA] = useState(true)

	// Enhanced hooks
	const createPoolMutation = useEnhancedCreatePool()
	const bbaBalanceQuery = useEnhancedBBABalance()
	const poolAvailabilityQuery = useEnhancedPoolAvailability(selectedBaseToken!, selectedQuoteToken!)
	const tradingPairsQuery = useEnhancedTradingPairs()

	// Computed values
	const isNativeBBAPool =
		selectedBaseToken && selectedQuoteToken
			? isNativeBBA(selectedBaseToken.address) || isNativeBBA(selectedQuoteToken.address)
			: false
	const canCreatePool = poolAvailabilityQuery.data?.canCreate || false
	const availability = poolAvailabilityQuery.data

	// Default trading pairs
	const defaultPairs = getDefaultTradingPairs()

	// Handle form submission
	const handleCreatePool = async () => {
		if (!selectedBaseToken || !selectedQuoteToken) {
			toast.error('Please select both base and quote tokens')
			return
		}

		if (!baseTokenAmount || !quoteTokenAmount) {
			toast.error('Please enter token amounts')
			return
		}

		if (!initialPrice) {
			toast.error('Please enter initial price')
			return
		}

		const payload: EnhancedCreatePoolPayload = {
			baseToken: selectedBaseToken,
			quoteToken: selectedQuoteToken,
			baseTokenAmount,
			quoteTokenAmount,
			feeTier,
			initialPrice,
			enableNativeBBA
		}

		try {
			await createPoolMutation.mutateAsync(payload)
			toast.success('Pool created successfully!')

			// Reset form
			setSelectedBaseToken(null)
			setSelectedQuoteToken(null)
			setBaseTokenAmount('')
			setQuoteTokenAmount('')
			setInitialPrice('')
		} catch (error) {
			toast.error(`Pool creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	// Auto-select recommended pairs
	const selectRecommendedPair = (base: MintInfo, quote: MintInfo) => {
		setSelectedBaseToken(base)
		setSelectedQuoteToken(quote)
		setEnableNativeBBA(true)
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						🚀 Enhanced Pool Creation
						{isNativeBBAPool && (
							<Badge variant="secondary" className="bg-green-100 text-green-800">
								Native BBA
							</Badge>
						)}
					</CardTitle>
					<CardDescription>Create liquidity pools with enhanced native BBA support and optimized flow</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="create" className="w-full">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="create">Create Pool</TabsTrigger>
							<TabsTrigger value="examples">Quick Examples</TabsTrigger>
						</TabsList>

						<TabsContent value="create" className="space-y-4">
							{/* Native BBA Balance Display */}
							{bbaBalanceQuery.data && (
								<Alert>
									<Info className="h-4 w-4" />
									<AlertDescription>BBA Balance: {bbaBalanceQuery.data.humanBalance.toFixed(6)} BBA</AlertDescription>
								</Alert>
							)}

							{/* Token Selection */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="baseToken">Base Token</Label>
									<Select
										onValueChange={(value) => {
											const token = JSON.parse(value) as MintInfo
											setSelectedBaseToken(token)
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select base token" />
										</SelectTrigger>
										<SelectContent>
											{defaultPairs.map((pair, index) => (
												<SelectItem key={index} value={JSON.stringify(pair.base)}>
													<div className="flex items-center gap-2">
														<span>{pair.base.symbol}</span>
														{isNativeBBA(pair.base.address) && (
															<Badge variant="outline" className="text-xs">
																Native
															</Badge>
														)}
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="quoteToken">Quote Token</Label>
									<Select
										onValueChange={(value) => {
											const token = JSON.parse(value) as MintInfo
											setSelectedQuoteToken(token)
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select quote token" />
										</SelectTrigger>
										<SelectContent>
											{defaultPairs.map((pair, index) => (
												<SelectItem key={index} value={JSON.stringify(pair.quote)}>
													<div className="flex items-center gap-2">
														<span>{pair.quote.symbol}</span>
														{isNativeBBA(pair.quote.address) && (
															<Badge variant="outline" className="text-xs">
																Native
															</Badge>
														)}
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Pool Availability Check */}
							{availability && (
								<Alert variant={availability.canCreate ? 'default' : 'destructive'}>
									{availability.canCreate ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
									<AlertDescription>
										{availability.canCreate ? (
											<div>
												<p>✅ Pool can be created</p>
												{availability.isNativeBBAPool && (
													<div className="mt-2 space-y-1">
														<p className="font-medium">Native BBA Pool Benefits:</p>
														<ul className="text-sm text-gray-600 space-y-1">
															{availability.recommendations?.map((rec, index) => <li key={index}>• {rec}</li>)}
														</ul>
													</div>
												)}
											</div>
										) : (
											<p>❌ {availability.reason}</p>
										)}
									</AlertDescription>
								</Alert>
							)}

							{/* Token Amounts */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="baseAmount">
										{selectedBaseToken ? `${selectedBaseToken.symbol} Amount` : 'Base Amount'}
									</Label>
									<Input
										id="baseAmount"
										type="number"
										placeholder="0.0"
										value={baseTokenAmount}
										onChange={(e) => setBaseTokenAmount(e.target.value)}
									/>
								</div>

								<div>
									<Label htmlFor="quoteAmount">
										{selectedQuoteToken ? `${selectedQuoteToken.symbol} Amount` : 'Quote Amount'}
									</Label>
									<Input
										id="quoteAmount"
										type="number"
										placeholder="0.0"
										value={quoteTokenAmount}
										onChange={(e) => setQuoteTokenAmount(e.target.value)}
									/>
								</div>
							</div>

							{/* Initial Price */}
							<div>
								<Label htmlFor="initialPrice">
									Initial Price ({selectedBaseToken?.symbol || 'Base'} per {selectedQuoteToken?.symbol || 'Quote'})
								</Label>
								<Input
									id="initialPrice"
									type="number"
									placeholder="0.0"
									value={initialPrice}
									onChange={(e) => setInitialPrice(e.target.value)}
								/>
							</div>

							{/* Fee Tier */}
							<div>
								<Label htmlFor="feeTier">Fee Tier</Label>
								<Select value={feeTier} onValueChange={setFeeTier}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{FEE_TIERS.map((tier) => (
											<SelectItem key={tier.value} value={tier.value}>
												<div className="flex flex-col">
													<span className="font-medium">{tier.label}</span>
													<span className="text-sm text-gray-500">{tier.description}</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Native BBA Options */}
							{isNativeBBAPool && (
								<Alert>
									<Info className="h-4 w-4" />
									<AlertDescription>
										<div className="space-y-2">
											<p className="font-medium">Native BBA Pool Detected</p>
											<p className="text-sm">
												This pool involves native BBA tokens. The system will automatically handle BBA
												wrapping/unwrapping for optimal performance.
											</p>
											<label className="flex items-center gap-2 text-sm">
												<input
													type="checkbox"
													checked={enableNativeBBA}
													onChange={(e) => setEnableNativeBBA(e.target.checked)}
												/>
												Enable enhanced native BBA support
											</label>
										</div>
									</AlertDescription>
								</Alert>
							)}

							{/* Create Button */}
							<Button
								onClick={handleCreatePool}
								disabled={!canCreatePool || createPoolMutation.isPending}
								className="w-full"
							>
								{createPoolMutation.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating Pool...
									</>
								) : (
									'Create Enhanced Pool'
								)}
							</Button>
						</TabsContent>

						<TabsContent value="examples" className="space-y-4">
							<div className="space-y-4">
								<h3 className="text-lg font-semibold">Quick Start Examples</h3>

								{tradingPairsQuery.data?.map((pair, index) => (
									<Card key={index} className="border-l-4 border-l-green-500">
										<CardHeader className="pb-3">
											<CardTitle className="text-base flex items-center gap-2">
												{pair.base.symbol} / {pair.quote.symbol}
												{pair.recommended && (
													<Badge variant="secondary" className="bg-green-100 text-green-800">
														Recommended
													</Badge>
												)}
											</CardTitle>
											<CardDescription>{pair.isNativeBBAPool ? 'Native BBA Pool' : 'Standard Pool'}</CardDescription>
										</CardHeader>
										<CardContent className="pt-0">
											<Button variant="outline" size="sm" onClick={() => selectRecommendedPair(pair.base, pair.quote)}>
												Use This Pair
											</Button>
										</CardContent>
									</Card>
								))}

								<Alert>
									<Info className="h-4 w-4" />
									<AlertDescription>
										<div className="space-y-2">
											<p className="font-medium">Pool Creation Tips:</p>
											<ul className="text-sm space-y-1">
												<li>• Native BBA pools automatically handle wrapping/unwrapping</li>
												<li>• Use lower fee tiers (0.01-0.05%) for stable pairs</li>
												<li>• Higher fee tiers (0.25-1.00%) work better for volatile pairs</li>
												<li>• Ensure sufficient balance for both tokens</li>
											</ul>
										</div>
									</AlertDescription>
								</Alert>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Creation Result */}
			{createPoolMutation.isSuccess && createPoolMutation.data && (
				<Card className="border-green-200 bg-green-50">
					<CardHeader>
						<CardTitle className="text-green-800">Pool Created Successfully! 🎉</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="font-medium">Pool Address:</p>
								<p className="font-mono text-xs">{createPoolMutation.data.poolAddress}</p>
							</div>
							<div>
								<p className="font-medium">Transaction:</p>
								<p className="font-mono text-xs">{createPoolMutation.data.signature}</p>
							</div>
						</div>
						{createPoolMutation.data.isNativeBBAPool && (
							<Alert>
								<Info className="h-4 w-4" />
								<AlertDescription>
									This is a native BBA pool. Your BBA tokens have been automatically wrapped for optimal performance.
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
