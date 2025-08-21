import { TSuccessMessage } from '@/types'

export type TWrapPayload = {
	amount: number
}

export type TWrapResponse = TSuccessMessage & {
	signature: string
}

export type TUnwrapResponse = TSuccessMessage & {
	signatures: string[]
}
