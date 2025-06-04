'use client'

import { FileInput as FlowbiteFileInput } from 'flowbite-react'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import toast, { Toast } from 'react-hot-toast'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import { HiArrowPath } from 'react-icons/hi2'

import { NoBalanceAlert } from '@/components/layout/Alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
	CustomToastOnBack,
	TokenDetailCard,
	TokenValue,
	TooltipComponent
} from '@/features/tokens/components/TokenDetail'
import {
	useBurnTokenSupply,
	useGetTokenDetail,
	useLockMetadata,
	useMintTokenSupply,
	useRevokeFreezeAuthority,
	useRevokeMintAuthority,
	useUpdateTokenMetadata
} from '@/features/tokens/services'
import { type TUpdateTokenMetadataPayload } from '@/features/tokens/types'
import { CreateIconTokenValidation } from '@/features/tokens/validation'
import { useIsMobile } from '@/hooks/isMobile'
import { useGetBalance } from '@/services/wallet'
import { useErrorDialog } from '@/stores/errorDialog'

type BasicTokenProps = {
	label: string
	name: string
	value: string
	type: 'view text' | 'editable text' | 'link'
}

const initialUpdatedPayload: TUpdateTokenMetadataPayload = {
	name: '',
	symbol: '',
	icon: null,
	description: ''
}

export default function TokenDetail({ params }: { params: { address: string } }) {
	const mintAddress = params.address
	const router = useRouter()

	const getTokenDetailQuery = useGetTokenDetail({ mintAddress })
	const updateTokenMetadataMutation = useUpdateTokenMetadata({ mintAddress })
	const lockMetadataMutation = useLockMetadata({ mintAddress })
	const revokeMintAuthorityMutation = useRevokeMintAuthority({ mintAddress })
	const revokeFreezeAuthoritiMutation = useRevokeFreezeAuthority({ mintAddress })
	const burnTokensMutation = useBurnTokenSupply({ mintAddress })
	const mintTokensMutation = useMintTokenSupply({ mintAddress })
	const getBalanceQuery = useGetBalance()

	const isNoBalance = getBalanceQuery.isError || !getBalanceQuery.data || getBalanceQuery.data === 0
	const tokenDetailData = getTokenDetailQuery.data?.data
	const isMintRevoked = tokenDetailData?.authoritiesState?.revokeMint ?? false
	const isFreezeRevoked = tokenDetailData?.authoritiesState?.revokeFreeze ?? false
	const isMetadataLocked = !!tokenDetailData?.metadata && !tokenDetailData.metadata.isMutable
	const isMobile = useIsMobile()
	const isDisabled =
		updateTokenMetadataMutation.isPending ||
		revokeMintAuthorityMutation.isPending ||
		revokeFreezeAuthoritiMutation.isPending ||
		lockMetadataMutation.isPending ||
		burnTokensMutation.isPending ||
		mintTokensMutation.isPending

	const pageTitle = tokenDetailData?.metadata.name ?? `${tokenDetailData?.mintAddress.slice(0, 8)}...`

	const [initialData, setInitialData] = useState(initialUpdatedPayload)
	const [updatePayload, setUpdatePayload] = useState(initialUpdatedPayload)
	const [isChanged, setIsChanged] = useState<boolean>(false)
	const [tokenPreview, setTokenPreview] = useState<string | null>(null)
	const [burnTokenAmount, setBurnTokenAmount] = useState<string>('')
	const [mintTokenAmount, setMintTokenAmount] = useState<string>('')

	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const { openErrorDialog } = useErrorDialog()

	const onUpdateInputPayload = <K extends keyof TUpdateTokenMetadataPayload>(
		key: K,
		value: TUpdateTokenMetadataPayload[K]
	) => {
		setUpdatePayload((prev) => ({
			...prev,
			[key]: value
		}))
	}

	const triggerFileInput = () => {
		fileInputRef.current?.click()
	}

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		await processFile(file)
	}

	const processFile = async (file: File | undefined) => {
		if (file) {
			const reader = new FileReader()
			const result = CreateIconTokenValidation.safeParse({ icon: file })

			console.log(result)

			if (!result.success) {
				const errorMessage = result.error.flatten().fieldErrors.icon?.[0]
				openErrorDialog({
					title: `We couldn't upload your image`,
					description: errorMessage ?? ''
				})
				onUpdateInputPayload('icon', null)
				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
				return
			}

			onUpdateInputPayload('icon', file)

			reader.onload = () => {
				setTokenPreview(reader.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	const onNavigateBack = () => {
		if (isChanged) {
			const onClose = (t: Toast) => {
				router.push('/tokens')
				toast.dismiss(t.id)
			}
			const onSave = (t: Toast) => {
				updateTokenMetadataMutation.mutate(updatePayload)
				toast.dismiss(t.id)
			}
			toast.custom((t) => <CustomToastOnBack t={t} onClose={onClose} onSave={onSave} />)
			return
		}
		router.push('/tokens')
	}

	const tokenOverviewData: BasicTokenProps[] = [
		{
			label: 'Token Name',
			name: 'name',
			value: updatePayload.name,
			type: isMetadataLocked ? 'view text' : 'editable text'
		},
		{
			label: 'Symbol',
			name: 'symbol',
			value: updatePayload.symbol,
			type: isMetadataLocked ? 'view text' : 'editable text'
		},
		{
			label: 'Total Supply',
			name: 'supply',
			value: tokenDetailData?.supply.toLocaleString() ?? '0',
			type: 'view text'
		},
		{
			label: 'Decimals',
			name: 'decimals',
			value: tokenDetailData?.decimals.toString() ?? '0',
			type: 'view text'
		},
		{
			label: 'Network',
			name: 'network',
			value: 'BBA Network',
			type: 'view text'
		},
		{
			label: 'Mint Address',
			name: 'mint_address',
			value: tokenDetailData?.mintAddress ?? '-',
			type: 'link'
		}
	]

	const tokenOptionsData = [
		{
			label: 'Mint Authority',
			state: isMintRevoked,
			value: isMintRevoked ? 'Active' : 'Inactive',
			type: 'button',
			tip: 'Controls who can mint (create) new tokens. Revoking this adds trust and prevents further minting.',
			pending: revokeMintAuthorityMutation.isPending,
			action: () => revokeMintAuthorityMutation.mutate()
		},
		{
			label: 'Freeze Authority',
			state: isFreezeRevoked,
			value: isFreezeRevoked ? 'Active' : 'Inactive',
			type: 'button',
			tip: 'Allows freezing user wallets holding this token. Revoke to make the token fully decentralized and ready for liquidity pools.',
			pending: revokeFreezeAuthoritiMutation.isPending,
			action: () => revokeFreezeAuthoritiMutation.mutate()
		},
		{
			label: 'Lock Metadata',
			state: isMetadataLocked,
			value: isMetadataLocked ? 'Locked' : 'Unlocked',
			type: 'button',
			tip: 'Once locked, the token&apos;s name, symbol, and icon can&apos;t be changed. Enhances trust and transparency.',
			pending: lockMetadataMutation.isPending,
			action: () => lockMetadataMutation.mutate()
		},
		{
			label: 'Burn Token',
			value: burnTokenAmount,
			type: 'input',
			tip: 'Permanently remove tokens from circulation. Useful for reducing supply or managing errors.',
			pending: burnTokensMutation.isPending,
			disabled: isDisabled || burnTokenAmount === '' || burnTokenAmount === '0' || tokenDetailData?.supply === 0,
			action: () =>
				burnTokensMutation.mutate({ amount: Number(burnTokenAmount), decimals: tokenDetailData?.decimals! }),
			onChange: (e: ChangeEvent<HTMLInputElement>) => setBurnTokenAmount(e.target.value)
		},
		{
			label: 'Mint Token',
			value: mintTokenAmount,
			type: 'input',
			tip: 'Add more token supply to your account',
			pending: mintTokensMutation.isPending,
			disabled: isDisabled || mintTokenAmount === '' || mintTokenAmount === '0' || isMintRevoked,
			action: () =>
				mintTokensMutation.mutate({ amount: Number(mintTokenAmount), decimals: tokenDetailData?.decimals! }),
			onChange: (e: ChangeEvent<HTMLInputElement>) => setMintTokenAmount(e.target.value)
		}
	]

	const tokenMetaData: BasicTokenProps[] = [
		{
			label: 'Description',
			name: 'description',
			value: updatePayload.description,
			type: isMetadataLocked ? 'view text' : 'editable text'
		},
		{
			label: 'IPFS Link',
			name: 'metadataLink',
			value: tokenDetailData?.metadata.metadataOffChain.link ?? '-',
			type: 'link'
		},
		{
			label: 'Metadata Status',
			name: 'metadataStatus',
			value: isMetadataLocked ? 'Locked' : 'Unlocked',
			type: 'view text'
		}
	]

	useEffect(() => {
		if (getTokenDetailQuery.isSuccess && getTokenDetailQuery.data) {
			const data: TUpdateTokenMetadataPayload = {
				name: tokenDetailData?.metadata.name ?? '-',
				symbol: tokenDetailData?.metadata.symbol ?? '-',
				icon: null,
				description: tokenDetailData?.metadata.metadataOffChain.data.description ?? '-'
			}
			setInitialData(data)
			setUpdatePayload(data)
		}
	}, [
		getTokenDetailQuery.data,
		getTokenDetailQuery.isSuccess,
		tokenDetailData?.metadata.metadataOffChain.data.description,
		tokenDetailData?.metadata.name,
		tokenDetailData?.metadata.symbol
	])

	useEffect(() => {
		if (JSON.stringify(initialData) !== JSON.stringify(updatePayload)) {
			setIsChanged(true)
		}
		return () => {
			setIsChanged(false)
		}
	}, [initialData, updatePayload])

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (!isChanged) return
			e.preventDefault()
		}

		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload)
		}
	}, [isChanged])

	useEffect(() => {
		if (updateTokenMetadataMutation.isSuccess && updateTokenMetadataMutation.data)
			toast.success(updateTokenMetadataMutation.data.message)
	}, [updateTokenMetadataMutation.data, updateTokenMetadataMutation.isSuccess])

	useEffect(() => {
		if (revokeMintAuthorityMutation.isSuccess && revokeMintAuthorityMutation.data)
			toast.success(revokeMintAuthorityMutation.data.message)
	}, [revokeMintAuthorityMutation.data, revokeMintAuthorityMutation.isSuccess])

	useEffect(() => {
		if (revokeFreezeAuthoritiMutation.isSuccess && revokeFreezeAuthoritiMutation.data)
			toast.success(revokeFreezeAuthoritiMutation.data.message)
	}, [revokeFreezeAuthoritiMutation.data, revokeFreezeAuthoritiMutation.isSuccess])

	useEffect(() => {
		if (lockMetadataMutation.isSuccess && lockMetadataMutation.data) toast.success(lockMetadataMutation.data.message)
	}, [lockMetadataMutation.data, lockMetadataMutation.isSuccess])

	useEffect(() => {
		if (burnTokensMutation.isSuccess && burnTokensMutation.data) {
			toast.success(burnTokensMutation.data.message)
			setBurnTokenAmount('')
		}
	}, [burnTokensMutation.data, burnTokensMutation.isSuccess])

	useEffect(() => {
		if (mintTokensMutation.isSuccess && mintTokensMutation.data) {
			toast.success(mintTokensMutation.data.message)
			setMintTokenAmount('')
		}
	}, [mintTokensMutation.data, mintTokensMutation.isSuccess])

	useEffect(() => {
		if (updateTokenMetadataMutation.isError && updateTokenMetadataMutation.error)
			openErrorDialog({
				title: 'We can not proceed your transaction',
				description: updateTokenMetadataMutation.error.message
			})
	}, [openErrorDialog, updateTokenMetadataMutation.error, updateTokenMetadataMutation.isError])

	useEffect(() => {
		if (revokeMintAuthorityMutation.isError && revokeMintAuthorityMutation.error)
			openErrorDialog({
				title: 'We can not proceed your transaction',
				description: revokeMintAuthorityMutation.error.message
			})
	}, [openErrorDialog, revokeMintAuthorityMutation.error, revokeMintAuthorityMutation.isError])

	useEffect(() => {
		if (revokeFreezeAuthoritiMutation.isError && revokeFreezeAuthoritiMutation.error)
			openErrorDialog({
				title: 'We can not proceed your transaction',
				description: revokeFreezeAuthoritiMutation.error.message
			})
	}, [openErrorDialog, revokeFreezeAuthoritiMutation.error, revokeFreezeAuthoritiMutation.isError])

	useEffect(() => {
		if (lockMetadataMutation.isError && lockMetadataMutation.error)
			openErrorDialog({ title: 'We can not proceed your transaction', description: lockMetadataMutation.error.message })
	}, [openErrorDialog, lockMetadataMutation.error, lockMetadataMutation.isError])

	useEffect(() => {
		if (burnTokensMutation.isError && burnTokensMutation.error)
			openErrorDialog({ title: 'We can not proceed your transaction', description: burnTokensMutation.error.message })
	}, [burnTokensMutation.error, burnTokensMutation.isError, openErrorDialog])

	useEffect(() => {
		if (mintTokensMutation.isError && mintTokensMutation.error)
			openErrorDialog({ title: 'We can not proceed your transaction', description: mintTokensMutation.error.message })
	}, [mintTokensMutation.error, mintTokensMutation.isError, openErrorDialog])

	if (getBalanceQuery.isLoading || getTokenDetailQuery.isLoading) {
		return (
			<div className="xl:px-[90px] md:px-16 px-[15px] flex flex-col md:space-y-6 space-y-3">
				<section className="w-full flex justify-center">
					<Skeleton className="h-5 w-72 rounded-[16px]" />
				</section>
				<section className="flex xl:flex-row flex-col xl:space-x-6 md:space-y-6 space-y-3 xl:space-y-0 justify-between">
					<Skeleton className="w-full rounded-[16px] xl:h-72 h-48 " />
					<Skeleton className="w-full rounded-[16px] xl:h-72 h-48 " />
				</section>
				<Skeleton className="h-48 w-full rounded-[16px]" />
			</div>
		)
	}

	return (
		<div className="xl:px-[90px] md:px-16 px-[15px]">
			<div className="flex flex-col md:space-y-6 space-y-3">
				<section>
					<Button
						variant="ghost"
						onClick={onNavigateBack}
						className={'md:flex hidden w-32 mb-3 text-main-black items-center space-x-2.5 text-xl'}
					>
						<HiOutlineArrowNarrowLeft />
						<h4>Tokens</h4>
					</Button>
					<h2 className="text-main-black text-center md:text-[32px] text-xl  font-medium">
						Manage Token - {pageTitle}
					</h2>
				</section>
				{isNoBalance && <NoBalanceAlert />}
				<section className="flex xl:flex-row flex-col xl:space-x-6 md:space-y-6 space-y-3 xl:space-y-0 justify-between">
					<TokenDetailCard className="min-h-[346px]" title="Token Overview">
						<section className="flex md:flex-row md:space-y-0 space-y-2.5 flex-col justify-between">
							<div className="flex flex-col space-y-[18px]">
								{tokenOverviewData.map((overviewData) => (
									<div
										className="flex items-center space-x-3 md:text-base text-sm text-main-black"
										key={overviewData.label}
									>
										<p className="lg:w-[160px] w-[112px]">{overviewData.label}</p>
										<span>:</span>
										<TokenValue
											value={overviewData.value}
											type={overviewData.type}
											onChange={(e) =>
												onUpdateInputPayload(overviewData.name as keyof TUpdateTokenMetadataPayload, e.target.value)
											}
										/>
									</div>
								))}
							</div>
							<div className="flex md:flex-col flex-row items-center md:space-y-2.5 md:space-x-0 space-x-2.5">
								<Image
									src={
										tokenPreview ||
										(tokenDetailData?.metadata?.metadataOffChain.data.image?.trim()
											? tokenDetailData.metadata.metadataOffChain.data.image
											: '/icon-placeholder.svg')
									}
									width={isMobile ? 62 : 111}
									height={isMobile ? 62 : 111}
									alt={`${tokenDetailData?.metadata.name ?? 'token'}-icon`}
								/>
								{!isMetadataLocked && (
									<Button
										onClick={triggerFileInput}
										type="button"
										disabled={isDisabled}
										className="bg-main-green rounded-[8px] text-sm py-1.5 h-7 w-28"
									>
										Change
										<HiArrowPath className="text-xs" />
									</Button>
								)}
								<FlowbiteFileInput
									ref={fileInputRef}
									id="dropzone-file"
									className="hidden"
									onChange={handleFileChange}
								/>
							</div>
						</section>
					</TokenDetailCard>
					<TokenDetailCard className="min-h-[346px]" title="Manage Token Options">
						<div className="flex flex-col space-y-[18px]">
							{tokenOptionsData.map((optionData) =>
								optionData.type === 'input' ? (
									<div key={optionData.label} className="flex flex-col space-y-2">
										<section className="flex space-x-0.5 items-center">
											<TooltipComponent content={optionData.tip} />
											<h5 className="md:text-lg text-sm text-main-black">{optionData.label}</h5>
										</section>
										<section className="flex ml-9 space-x-2.5">
											<Input
												defaultValue={optionData.value}
												onChange={optionData.onChange}
												className="md:w-52 rounded-[8px]"
												placeholder="Enter amount"
												type="number"
											/>
											<Button
												onClick={optionData.action}
												type="button"
												disabled={optionData.disabled}
												className="bg-main-green rounded-[8px]"
											>
												{optionData.pending && <Loader2 className="animate-spin" />}
												{optionData.label.split(' ')[0]}
											</Button>
										</section>
									</div>
								) : (
									<div className="flex md:flex-row flex-col justify-between" key={optionData.label}>
										<div className="flex items-center space-x-3">
											<section className="flex space-x-0.5 items-center">
												<TooltipComponent content={optionData.tip} />
												<h5 className="md:text-lg text-sm text-main-black">{optionData.label}</h5>
											</section>
											<p className="text-sm text-main-green">{optionData.value}</p>
										</div>
										{!optionData.state && (
											<Button
												type="button"
												onClick={optionData.action}
												disabled={isDisabled}
												className="bg-main-green md:ml-0 ml-9  rounded-[8px] text-sm w-auto md:max-w-none max-w-[171px] min-w-[114px] h-7 md:px-3 px-0 py-1.5 font-medium"
											>
												{optionData.pending && <Loader2 className="animate-spin" />}
												{optionData.label !== 'Lock Metadata' ? `Revoke ${optionData.label}` : optionData.label}
											</Button>
										)}
									</div>
								)
							)}
						</div>
					</TokenDetailCard>
				</section>
				<TokenDetailCard title="Metadata">
					<section className="flex md:flex-row md:space-y-0 space-y-2.5 flex-col justify-between">
						<div className="flex flex-col space-y-[18px]">
							{tokenMetaData.map((overviewData) => (
								<div
									className="flex items-center space-x-3 md:text-base text-sm text-main-black"
									key={overviewData.label}
								>
									<p className="lg:w-[160px] w-[112px]">{overviewData.label}</p>
									<span>:</span>
									<TokenValue
										value={overviewData.value}
										type={overviewData.type}
										onChange={(e) =>
											onUpdateInputPayload(
												overviewData.name as keyof TUpdateTokenMetadataPayload,
												e.target.value.trim()
											)
										}
									/>
								</div>
							))}
						</div>
					</section>
				</TokenDetailCard>
			</div>
			{!isMetadataLocked && isChanged && (
				<div className="w-full flex justify-end">
					<Button
						type="button"
						disabled={isDisabled}
						onClick={() => updateTokenMetadataMutation.mutate(updatePayload)}
						className="bg-main-green text-center mt-14 flex justify-center items-center hover:bg-hover-green text-main-white md:h-[47px] h-[34px] md:px-6 md:py-3 p-3 rounded-[43px] md:text-xl text-base"
					>
						{updateTokenMetadataMutation.isPending && <Loader2 className="animate-spin" />}
						Save Changes
					</Button>
				</div>
			)}
		</div>
	)
}
