'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import WrapBalanceItem from '@/features/wrapping/components/WrapBalanceItem'
import WrapContent from '@/features/wrapping/components/WrapContentCard'
import { useUnwrapBBA, useWrapBBA } from '@/features/wrapping/services'
import { getBBAFromDaltons } from '@/lib/token'
import { useGetBBABalance, useGetWBBABalance } from '@/services/wallet'
import { useErrorDialog } from '@/stores/errorDialog'

export default function Wrapping() {
	const wrapBBAMutation = useWrapBBA()
	const unwrapWBBAMutation = useUnwrapBBA()
	const getBBABalance = useGetBBABalance()
	const getWBBABalance = useGetWBBABalance()
	const BBABalance = getBBAFromDaltons(getBBABalance.data ?? 0)
	const WBBABalance = getBBAFromDaltons(getBBABalance.data ?? 0)
	const [inputAmount, setInputAmount] = useState<string>('')

	const isAmountPositive = Number(inputAmount) >= 0

	const generalInvalid = inputAmount === '' || Number(inputAmount) <= 0 || !isAmountPositive
	const isWrapInvalid = generalInvalid || Number(inputAmount) > BBABalance
	const isUnwrapInvalid = generalInvalid || Number(inputAmount) > WBBABalance
	const { openErrorDialog } = useErrorDialog()

	const onWrapBBA = () => wrapBBAMutation.mutate({ amount: Number(inputAmount) })
	const onUnwrapWBBA = () => unwrapWBBAMutation.mutate({ amount: Number(inputAmount) })

	useEffect(() => {
		if (wrapBBAMutation.isSuccess && wrapBBAMutation.data) {
			setInputAmount('')
			toast.success(wrapBBAMutation.data.message)
		}
	}, [wrapBBAMutation.data, wrapBBAMutation.isSuccess])

	useEffect(() => {
		if (unwrapWBBAMutation.isSuccess && unwrapWBBAMutation.data) {
			setInputAmount('')
			toast.success(unwrapWBBAMutation.data.message)
		}
	}, [unwrapWBBAMutation.data, unwrapWBBAMutation.isSuccess])

	useEffect(() => {
		if (wrapBBAMutation.isError && wrapBBAMutation.error) {
			openErrorDialog({
				title: 'Failed to wrap BBA',
				description: wrapBBAMutation.error.message
			})
			console.error('Failed to wrap BBA ', wrapBBAMutation.error.message)
		}
	}, [wrapBBAMutation.isError, wrapBBAMutation.error, openErrorDialog])

	useEffect(() => {
		if (unwrapWBBAMutation.isError && unwrapWBBAMutation.error) {
			openErrorDialog({
				title: 'Failed to unwrap WBBA',
				description: unwrapWBBAMutation.error.message
			})
			console.error('Failed to unwrap WBBA ', unwrapWBBAMutation.error.message)
		}
	}, [unwrapWBBAMutation.isError, unwrapWBBAMutation.error, openErrorDialog])

	return (
		<div className="xl:w-5/6 md:w-11/12 mx-auto md:px-0 px-[15px] flex flex-col md:space-y-14 space-y-6">
			<section className="flex flex-col text-center space-y-2">
				<h2 className="font-bold lg:text-[45px] md:text-3xl text-xl text-main-black">
					BBA Wrapping
				</h2>
				<p className="font-normal lg:text-lg md:text-sm text-xs text-dark-grey">
					Easily convert between BBA and WBBA. Use WBBA for swaps and liquidity pools.
				</p>
			</section>
			<section className="flex justify-between md:flex-row md:space-x-6 flex-col md:space-y-0 space-y-3 w-full items-center">
				<WrapBalanceItem
					type="BBA"
					balance={BBABalance ?? 0}
					isLoading={getBBABalance.isLoading || getBBABalance.isRefetching}
				/>
				<WrapBalanceItem
					type="WBBA"
					balance={WBBABalance ?? 0}
					isLoading={getWBBABalance.isLoading || getWBBABalance.isRefetching}
				/>
			</section>
			<section className="border border-main-green rounded-[12px] md:py-8 md:px-6 px-3 py-3">
				<Tabs defaultValue="wrap" onValueChange={() => setInputAmount('')}>
					<TabsList className="flex md:w-80 w-full mb-[18px] rounded-md bg-light-green p-0">
						<TabsTrigger
							value="wrap"
							className="flex-1 w-full rounded-md px-6 py-2 text-sm font-normal 
               data-[state=active]:bg-main-green
			   hover:bg-main-green 
               data-[state=active]:text-main-white
			   data-[state=inactive]:text-light-grey
			   hover:!text-main-white"
						>
							Wrap
						</TabsTrigger>
						<TabsTrigger
							value="unwrap"
							className="flex-1 w-full rounded-md px-6 py-2 text-sm font-normal 
               data-[state=active]:bg-main-green
			   hover:bg-main-green 
               data-[state=active]:text-main-white
			   data-[state=inactive]:text-light-grey
			   hover:!text-main-white"
						>
							Unwrap
						</TabsTrigger>
					</TabsList>
					<TabsContent value="wrap">
						<WrapContent
							base="BBA"
							target="WBBA"
							baseBalance={BBABalance ?? 0}
							targetBalance={WBBABalance ?? 0}
							inputAmount={inputAmount}
							setInputAmount={setInputAmount}
							isInvalid={isWrapInvalid}
							isLoading={wrapBBAMutation.isPending}
							onAction={onWrapBBA}
						/>
					</TabsContent>
					<TabsContent value="unwrap">
						<WrapContent
							base="WBBA"
							target="BBA"
							baseBalance={WBBABalance ?? 0}
							targetBalance={BBABalance ?? 0}
							inputAmount={inputAmount}
							setInputAmount={setInputAmount}
							isInvalid={isUnwrapInvalid}
							isLoading={unwrapWBBAMutation.isPending}
							onAction={onUnwrapWBBA}
						/>
					</TabsContent>
				</Tabs>
			</section>
		</div>
	)
}
