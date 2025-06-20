import { zodResolver } from '@hookform/resolvers/zod'
import { Dispatch, SetStateAction } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { EnableExpertModeConfirmationValidation } from '../validation'

interface ExpertModeWarningDialogProps {
	isOpen: boolean
	setIsOpen: Dispatch<SetStateAction<boolean>>
	setIsExpertMode: Dispatch<SetStateAction<boolean>>
}

export default function ExpertModeWarningDialog({ isOpen, setIsOpen, setIsExpertMode }: ExpertModeWarningDialogProps) {
	const form = useForm({
		resolver: zodResolver(EnableExpertModeConfirmationValidation),
		defaultValues: {
			confirm: ''
		}
	})

	const onConfirm = () => {
		setIsExpertMode(true)
		form.reset()
		setIsOpen(false)
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="md:max-w-[488px] rounded-[12px] shadow-[0_6px_14.1px_6px_rgba(0,0,0,0.25)] p-5 max-w-[310px]">
				<DialogHeader className="p-0">
					<DialogTitle className="font-normal text-lg text-main-black">Are you sure?</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col md:space-y-[22px] space-y-3">
					<section className="px-[13px] border-2 rounded-[10px] border-[#8A4200] py-[11px]">
						<p className="text-sm text-main-black">
							Expert mode turns off the &quot;Confirm&quot; transaction prompt, and allows high slippage trades that
							often result in bad rates and lost funds.
						</p>
					</section>
					<p className="text-main-black text-sm text-center">
						Please type the word <span className="text-[#8A4200]">Confirm</span> below to enable expert Mode
					</p>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onConfirm)}>
							<FormField
								control={form.control}
								name="confirm"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Input
												className="focus-visible:ring-hover-green bg-box !text-xs focus:border-hover-green h-[34px] rounded-[10px] w-full"
												type="text"
												placeholder="Confirm"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex w-full justify-center items-center">
								<Button
									type="submit"
									className="rounded-[26px] md:h-[42px] h-[37px] md:mt-[22px] mt-3 text-base md:text-xl py-3 w-[250px] text-main-white bg-[#F8C100] hover:bg-yellow-400"
								>
									Confirm
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	)
}
