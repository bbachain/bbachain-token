'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { IoCheckmarkCircle, IoOpenOutline, IoTrendingUp } from 'react-icons/io5'

import { CopyButton } from '@/components/common/CopyButton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

import { MintInfo } from '../types'

interface DepositSuccessDialogProps {
	isOpen: boolean
	onClose: () => void
	signature: string
	pool: {
		mintA: MintInfo
		mintB: MintInfo
		address: string
	}
	amounts: {
		amountA: string
		amountB: string
		totalValue: string
	}
}

export default function DepositSuccessDialog({ isOpen, onClose, signature, pool, amounts }: DepositSuccessDialogProps) {
	const explorerUrl = `https://explorer.bbachain.com/tx/${signature}`

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md mx-auto border-0 p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
				{/* Header with celebration animation */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="relative bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 text-center"
				>
					{/* Decorative elements */}
					<div className="absolute inset-0 bg-black/5"></div>
					<div className="absolute top-2 left-4 w-2 h-2 bg-white/20 rounded-full animate-pulse"></div>
					<div className="absolute top-4 right-6 w-1 h-1 bg-white/30 rounded-full animate-ping"></div>
					<div className="absolute bottom-3 left-8 w-1.5 h-1.5 bg-white/25 rounded-full animate-bounce"></div>

					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
						className="relative flex justify-center mb-2"
					>
						<div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
							<IoCheckmarkCircle className="w-10 h-10 text-white drop-shadow-lg" />
						</div>
					</motion.div>

					<motion.h2
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4 }}
						className="text-xl font-bold mb-1"
					>
						🎉 Liquidity Added Successfully!
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.6 }}
						className="text-white/90 text-xs"
					>
						Your tokens are now earning fees in the liquidity pool
					</motion.p>
				</motion.div>

				<div className="p-4 space-y-4">
					{/* Pool Info Card */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.8 }}
						className="bg-gray-50 rounded-xl p-4 border border-gray-100"
					>
						<div className="flex items-center gap-3 mb-3">
							<div className="flex items-center -space-x-2">
								<Image
									src={pool.mintA.logoURI || '/icon-placeholder.svg'}
									width={24}
									height={24}
									className="rounded-full border-2 border-white shadow-sm"
									alt={`${pool.mintA.symbol} icon`}
								/>
								<Image
									src={pool.mintB.logoURI || '/icon-placeholder.svg'}
									width={24}
									height={24}
									className="rounded-full border-2 border-white shadow-sm"
									alt={`${pool.mintB.symbol} icon`}
								/>
							</div>
							<div className="flex-1">
								<h3 className="font-bold text-gray-900">
									{pool.mintA.symbol}-{pool.mintB.symbol}
								</h3>
								<p className="text-xs text-gray-500">Liquidity Pool</p>
							</div>
							<IoTrendingUp className="w-5 h-5 text-green-500" />
						</div>

						<div className="space-y-2">
							<div className="flex justify-between items-center p-2 bg-white rounded-lg">
								<div className="flex items-center gap-2">
									<Image
										src={pool.mintA.logoURI || '/icon-placeholder.svg'}
										width={16}
										height={16}
										className="rounded-full"
										alt={pool.mintA.symbol}
									/>
									<span className="text-sm font-medium text-gray-700">{pool.mintA.symbol} deposited</span>
								</div>
								<span className="text-sm font-bold text-gray-900">{amounts.amountA}</span>
							</div>

							<div className="flex justify-between items-center p-2 bg-white rounded-lg">
								<div className="flex items-center gap-2">
									<Image
										src={pool.mintB.logoURI || '/icon-placeholder.svg'}
										width={16}
										height={16}
										className="rounded-full"
										alt={pool.mintB.symbol}
									/>
									<span className="text-sm font-medium text-gray-700">{pool.mintB.symbol} deposited</span>
								</div>
								<span className="text-sm font-bold text-gray-900">{amounts.amountB}</span>
							</div>

							<div className="border-t border-dashed border-gray-300 pt-2 mt-2">
								<div className="flex justify-between items-center">
									<span className="font-semibold text-gray-700">Total Value</span>
									<span className="text-lg font-bold text-green-600">${amounts.totalValue}</span>
								</div>
							</div>
						</div>
					</motion.div>

					{/* Transaction Details */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1.0 }}
						className="bg-gray-50 rounded-lg p-3 border border-gray-100"
					>
						<h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
							<div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
							Transaction Hash
						</h4>
						<div
							className="flex items-center gap-2 p-2 bg-white rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
							onClick={() => window.open(explorerUrl, '_blank')}
						>
							<code className="text-xs text-blue-600 hover:text-blue-800 font-mono flex-1 underline decoration-dotted">
								{signature.slice(0, 8)}...{signature.slice(-8)}
							</code>
							<CopyButton secretValue={signature} />
							<IoOpenOutline className="h-3 w-3 text-gray-400" />
						</div>
						<p className="text-xs text-gray-500 mt-1 text-center">Click to view on Explorer</p>
					</motion.div>

					{/* Action Buttons */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1.2 }}
						className="flex flex-col gap-2"
					>
						<Link href={`/liquidity-pools/detail/${pool.address}`} className="w-full">
							<Button className="w-full h-10 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200">
								📊 View Pool Details
							</Button>
						</Link>
						<Button
							variant="outline"
							className="w-full h-10 border border-gray-300 hover:border-gray-400 font-medium rounded-lg transition-all duration-200"
							onClick={onClose}
						>
							Continue Trading
						</Button>
					</motion.div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
