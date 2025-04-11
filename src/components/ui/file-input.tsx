'use client'

import { FileInput as FlowbiteFileInput, Label } from 'flowbite-react'
import Image from 'next/image'

type FileInputProps = {
	preview: string | null
	errorMessage?: string
	handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
	handleDrop: (event: React.DragEvent<HTMLLabelElement>) => void
}

export default function FileInput(props: FileInputProps) {
	const { preview, errorMessage, handleFileChange, handleDrop } = props

	const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
	}

	return (
		<div className="flex flex-col space-y-2 w-full ">
			<Label
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				htmlFor="dropzone-file"
				className="flex h-[271px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-box"
			>
				<div className="flex flex-col items-center justify-center pb-6 pt-5">
					{preview ? (
						<Image src={preview} width={118} height={137} alt="Uploaded preview" />
					) : (
						<>
							<svg
								className="mb-4 h-8 w-8 text-light-grey"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 20 16"
							>
								<path
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
								/>
							</svg>
							<p className="mb-2 text-sm text-light-grey">
								<span className="font-semibold">Click to upload</span> or drag and drop
							</p>
						</>
					)}
				</div>
				<FlowbiteFileInput id="dropzone-file" className="hidden" onChange={handleFileChange} />
			</Label>
			{errorMessage && <p className="text-[0.8rem] font-medium text-destructive">{errorMessage}</p>}
		</div>
	)
}
