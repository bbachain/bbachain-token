'use client'
import {
	useGetTokenDataDetail,
	useLockMetadata,
	useRevokeAuthority,
	useUpdateMetadata
} from '@/components/account/account-data-access'
import { CustomToastOnBack, TokenDetailCard, TokenValue, TooltipComponent } from '@/components/tokens/token-detail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useErrorDialog, useIsMobile } from '@/lib/hooks'
import { UpdateMetadataPayload } from '@/lib/types'
import { AuthorityType } from '@bbachain/spl-token'
import { PublicKey } from '@bbachain/web3.js'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FileInput as FlowbiteFileInput } from 'flowbite-react'
import toast, { Toast } from 'react-hot-toast'
import { HiOutlineArrowNarrowLeft } from 'react-icons/hi'
import Image from 'next/image'
import { HiArrowPath } from 'react-icons/hi2'
import { CreateIconTokenValidation } from '@/lib/validation'
import { useRouter } from 'next/navigation'

type BasicTokenProps = {
	label: string
	name: string
	value: string
	type: 'view text' | 'editable text' | 'link'
}

const initialUpdatedPayload: UpdateMetadataPayload = {
	token_name: '',
	token_symbol: '',
	token_icon: null,
	description: ''
}

export default function TokenDetail({ params }: { params: { mintAddress: string } }) {
	const mintKey = new PublicKey(params.mintAddress)
	const router = useRouter()

	const getTokenDetailData = useGetTokenDataDetail({ mintAddress: mintKey })
	const tokenDetailData = getTokenDetailData.data
	const isMintRevoked = tokenDetailData?.authoritiesState?.revoke_mint ?? false
	const isFreezeRevoked = tokenDetailData?.authoritiesState?.revoke_freeze ?? false
	const isMetadataLocked = tokenDetailData?.authoritiesState.immutable_metadata ?? false

	const revokeAuthority = useRevokeAuthority({ mintAddress: mintKey })

	const lockMetadata = useLockMetadata({
		mintAddress: mintKey
	})

	const [firstPayload, setFirstPayload] = useState<UpdateMetadataPayload>(initialUpdatedPayload)
	const [updatePayload, setUpdatePayload] = useState<UpdateMetadataPayload>(initialUpdatedPayload)
	const [isChanged, setIsChanged] = useState<boolean>(false)
	const [tokenPreview, setTokenPreview] = useState<string | null>(null)

	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const onMetadataUpdate = useUpdateMetadata({ mintAddress: mintKey })

	const onUpdateInputPayload = <K extends keyof UpdateMetadataPayload>(key: K, value: UpdateMetadataPayload[K]) => {
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
			const result = CreateIconTokenValidation.safeParse({ token_icon: file })

			console.log(result)

			if (!result.success) {
				const errorMessage = result.error.flatten().fieldErrors.token_icon?.[0]
				openErrorDialog({
					title: `We couldn't upload your image`,
					description: errorMessage ?? ''
				})
				onUpdateInputPayload('token_icon', null)
				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
				return
			}

			onUpdateInputPayload('token_icon', file)

			reader.onload = () => {
				setTokenPreview(reader.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	const onNavigateBack = () => {
		if (isChanged) {
			const onClose = (t: Toast) => {
				router.push('/my-tokens')
				toast.dismiss(t.id)
			}
			const onSave = (t: Toast) => {
				onMetadataUpdate.mutate(updatePayload)
				toast.dismiss(t.id)
			}
			toast.custom((t) => <CustomToastOnBack t={t} onClose={onClose} onSave={onSave} />)
			return
		}
		router.push('/my-tokens')
	}

	const { openErrorDialog } = useErrorDialog()
	const isMobile = useIsMobile()
	const isDisabled = onMetadataUpdate.isPending || revokeAuthority.isPending || lockMetadata.isPending

	const tokenOverviewData: BasicTokenProps[] = [
		{
			label: 'Token Name',
			name: 'token_name',
			value: updatePayload.token_name,
			type: isMetadataLocked ? 'view text' : 'editable text'
		},
		{
			label: 'Symbol',
			name: 'token_symbol',
			value: updatePayload.token_symbol,
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
			pending: revokeAuthority.isPending && revokeAuthority.variables === AuthorityType.MintTokens,
			onClick: () => revokeAuthority.mutate(AuthorityType.MintTokens)
		},
		{
			label: 'Freeze Authority',
			state: isFreezeRevoked,
			value: isFreezeRevoked ? 'Active' : 'Inactive',
			type: 'button',
			tip: 'Allows freezing user wallets holding this token. Revoke to make the token fully decentralized and ready for liquidity pools.',
			pending: revokeAuthority.isPending && revokeAuthority.variables === AuthorityType.FreezeAccount,
			onClick: () => revokeAuthority.mutate(AuthorityType.FreezeAccount)
		},
		{
			label: 'Lock Metadata',
			state: isMetadataLocked,
			value: isMetadataLocked ? 'Locked' : 'Unlocked',
			type: 'button',
			tip: 'Once locked, the token&apos;s name, symbol, and icon can&apos;t be changed. Enhances trust and transparency.',
			pending: lockMetadata.isPending,
			onClick: () => lockMetadata.mutate()
		},
		{
			label: 'Burn Token',
			type: 'input',
			tip: 'Permanently remove tokens from circulation. Useful for reducing supply or managing errors.',
			pending: false,
			onClick: () => {}
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
			value: tokenDetailData?.metadataLink ?? '-',
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
		if (getTokenDetailData.isSuccess && getTokenDetailData.data) {
			setFirstPayload({
				token_name: tokenDetailData?.name ?? '-',
				token_symbol: tokenDetailData?.symbol ?? '-',
				token_icon: null,
				description: tokenDetailData?.metadataURI?.description ?? '-'
			})
			setUpdatePayload({
				token_name: tokenDetailData?.name ?? '-',
				token_symbol: tokenDetailData?.symbol ?? '-',
				token_icon: null,
				description: tokenDetailData?.metadataURI?.description ?? '-'
			})
		}
	}, [
		getTokenDetailData.data,
		getTokenDetailData.isSuccess,
		tokenDetailData?.metadataURI?.description,
		tokenDetailData?.name,
		tokenDetailData?.symbol
	])

	useEffect(() => {
		if (JSON.stringify(firstPayload) !== JSON.stringify(updatePayload)) {
			setIsChanged(true)
		}
		return () => {
			setIsChanged(false)
		}
	}, [firstPayload, updatePayload])

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
		if (onMetadataUpdate.isSuccess && onMetadataUpdate.data) toast.success(onMetadataUpdate.data.message)
	}, [onMetadataUpdate.data, onMetadataUpdate.isSuccess])

	useEffect(() => {
		if (revokeAuthority.isSuccess && revokeAuthority.data) toast.success(revokeAuthority.data.message)
	}, [revokeAuthority.data, revokeAuthority.isSuccess])

	useEffect(() => {
		if (lockMetadata.isSuccess && lockMetadata.data) toast.success(lockMetadata.data.message)
	}, [lockMetadata.data, lockMetadata.isSuccess])

	useEffect(() => {
		if (onMetadataUpdate.isError && onMetadataUpdate.error)
			openErrorDialog({ title: 'We can not proceed your transaction', description: onMetadataUpdate.error.message })
	}, [openErrorDialog, onMetadataUpdate.error, onMetadataUpdate.isError])

	useEffect(() => {
		if (revokeAuthority.isError && revokeAuthority.error)
			openErrorDialog({ title: 'We can not proceed your transaction', description: revokeAuthority.error.message })
	}, [openErrorDialog, revokeAuthority.error, revokeAuthority.isError])

	useEffect(() => {
		if (lockMetadata.isError && lockMetadata.error)
			openErrorDialog({ title: 'We can not proceed your transaction', description: lockMetadata.error.message })
	}, [openErrorDialog, lockMetadata.error, lockMetadata.isError])

	if (getTokenDetailData.isLoading) {
		return (
			<div className="xl:px-[90px] md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5 flex flex-col md:space-y-6 space-y-3">
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
		<div className="xl:px-[90px] md:px-16 px-[15px] md:mt-40 mt-20 md:mb-20 mb-5">
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
						Manage Token - {tokenDetailData?.name ?? `${tokenDetailData?.mintAddress.slice(0, 8)}...`}
					</h2>
				</section>
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
												onUpdateInputPayload(overviewData.name as keyof UpdateMetadataPayload, e.target.value)
											}
										/>
									</div>
								))}
							</div>
							<div className="flex md:flex-col flex-row items-center md:space-y-2.5 md:space-x-0 space-x-2.5">
								<Image
									src={tokenPreview ?? tokenDetailData?.metadataURI?.image ?? '/icon-placeholder.svg'}
									width={isMobile ? 62 : 111}
									height={isMobile ? 62 : 111}
									alt={tokenDetailData?.name + '-' + 'icon'}
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
											<Input className="md:w-52 rounded-[8px]" placeholder="Enter amount" />
											<Button type="button" disabled className="bg-main-green rounded-[8px]">
												Burnt
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
												onClick={optionData.onClick}
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
				<TokenDetailCard title="Token Overview">
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
											onUpdateInputPayload(overviewData.name as keyof UpdateMetadataPayload, e.target.value.trim())
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
						onClick={() => onMetadataUpdate.mutate(updatePayload)}
						className="bg-main-green text-center mt-14 flex justify-center items-center hover:bg-hover-green text-main-white md:h-[47px] h-[34px] md:px-6 md:py-3 p-3 rounded-[43px] md:text-xl text-base"
					>
						{onMetadataUpdate.isPending && <Loader2 className="animate-spin" />}
						Save Changes
					</Button>
				</div>
			)}
		</div>
	)
}
