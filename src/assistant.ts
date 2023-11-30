
import { OpenAI } from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const initializeThread = async () => {
  const thread = await openai.beta.threads.create();
  console.debug("[THREAD]", thread)
  return thread;
}


export const sendMessage = async (threadId: string, message: string) => {

  const newMessage = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message,
  })
  console.debug("[APPENDED_THREAD]", newMessage)


  const assistant = await openai.beta.assistants.retrieve("asst_UriK8p1GRkSRLKKGm5Dyuync", {
    stream: false,
    maxRetries: 3,
  });
  console.debug("[ASSISTANT]", assistant)


  const run_response = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistant.id,
  })
  console.debug("[RUN_RESPONSE]", run_response)


  let retrieved_runs = await openai.beta.threads.runs.retrieve(threadId, run_response.id);
  while (retrieved_runs.status !== 'completed') {
    await new Promise(resolve => setTimeout(resolve, 100));
    retrieved_runs = await openai.beta.threads.runs.retrieve(threadId, run_response.id);
  }
  console.debug("[RETRIEVED_RUNS]", retrieved_runs)


  const messages = await ListMessages(threadId);
  // const lastMessage = messages.find((message) => message.run_id === run_response.id && message.role === 'assistant');
  // console.debug("[LAST_MESSAGE]", lastMessage)


  return messages;
}

export const ListMessages = async (threadId: string) => {
  const messages = await openai.beta.threads.messages.list(threadId);
  console.debug("[MESSAGES]", messages);
  return messages.data;
}