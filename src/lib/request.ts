import { z } from 'zod'
import { CreateBBATokenValidation } from './validation'

export type CreateBBATokenPayload = z.infer<typeof CreateBBATokenValidation>
