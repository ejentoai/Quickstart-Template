// import { type Message } from 'ai'

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
