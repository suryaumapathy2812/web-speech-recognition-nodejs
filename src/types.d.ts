import { Thread } from "openai/resources/beta/threads/threads"

export type UserSession = {
  user_id: string,
  sockets: string[],
  user: {
    email: string,
    name?: string,
    id?: string
  },
  thread: Thread
}