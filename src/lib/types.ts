// import { type Message } from 'ai'

import { z } from "zod";

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: any[]
  sharePath?: string
  feedbacks?: any[]
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

export const loginSchema = z.object({
  email : z.string().min(1,'Email is required').email('please enter a valid email adress')
})

export type TloginSchema = z.infer<typeof loginSchema>