'use client'

import { FileInput as FlowbiteFileInput, Label } from 'flowbite-react'
import Image from 'next/image'
import { Button } from '../ui/button'
import { MutableRefObject } from 'react'
import ThemeImage from '../ui/theme-image'

type FileInputProps = {
	fileInputRef: MutableRefObject<HTMLInputElement | null>
	preview: string | null
	errorMessage?: string
	handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
	handleDrop: (event: React.DragEvent<HTMLLabelElement>) => void
}

export default function FileInput(props: FileInputProps) {
	const { fileInputRef, preview, errorMessage, handleFileChange, handleDrop } = props

	const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
	}

	const triggerFileInput = () => {
		fileInputRef.current?.click()
	}

	return (
		<div className="flex flex-col space-y-1 w-full ">
			<Label
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				className="flex h-full w-full flex-col cursor-default items-center justify-center"
			>
				<div className="flex flex-col w-full h-full items-center justify-center pb-6 pt-5">
					{preview ? (
						<>
							<Image src={preview} width={118} height={137} alt="Uploaded preview" />
							<Button
								variant="ghost"
								type="button"
								onClick={triggerFileInput}
								className="h-full mt-6 text-base font-medium text-main-green"
							>
								<ThemeImage
									lightSrc="change_logo_light.svg"
									darkSrc="change_logo_dark.svg"
									width={25}
									height={25}
									alt="change icon logo"
								/>
								Change Icon
							</Button>
						</>
					) : (
						<>
							<Image src="/upload_icon_logo.svg" width={104} height={75.63} alt="upload icon logo" />
							<div className="mt-6 text-center">
								<h4 className="md:text-2xl text-sm font-normal">Choose a file or drag & drop it here</h4>
								<p className="md:text-xl text-sm mb-6 mt-[15px]">JPEG, PNG, SVG formats, up to 5MB</p>
								<Button
									variant="outline"
									type="button"
									onClick={triggerFileInput}
									className="rounded-[44px] h-full border-2 md:text-2xl text-base md:px-[30px] px-[18px] md:py-3 py-2 font-medium text-[#54575C] border-[#CBD0DC]"
								>
									Browse File
								</Button>
							</div>
						</>
					)}
				</div>
			</Label>
			<FlowbiteFileInput ref={fileInputRef} id="dropzone-file" className="hidden" onChange={handleFileChange} />
			{errorMessage && <p className="md:text-lg text-sm text-center font-medium text-destructive">{errorMessage}</p>}
		</div>
	)
}
