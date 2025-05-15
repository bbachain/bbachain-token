import { z } from 'zod'
import type { CreateTokenValidation } from '@/lib/validation/token.validation'

export type CreateTokenPayload = z.infer<typeof CreateTokenValidation>

export type UploadToMetadataPayload = {
	name: string
	symbol: string
	icon: string
	description: string | null
}
