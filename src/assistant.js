"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListMessages = exports.sendMessage = exports.initializeThread = exports.openai = void 0;
const openai_1 = require("openai");
exports.openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const initializeThread = () => __awaiter(void 0, void 0, void 0, function* () {
    const thread = yield exports.openai.beta.threads.create();
    console.debug("[THREAD]", thread);
    return thread;
});
exports.initializeThread = initializeThread;
const sendMessage = (threadId, message) => __awaiter(void 0, void 0, void 0, function* () {
    const newMessage = yield exports.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message,
    });
    console.debug("[APPENDED_THREAD]", newMessage);
    const assistant = yield exports.openai.beta.assistants.retrieve("asst_UriK8p1GRkSRLKKGm5Dyuync", {
        stream: false,
        maxRetries: 3,
    });
    console.debug("[ASSISTANT]", assistant);
    const run_response = yield exports.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistant.id,
    });
    console.debug("[RUN_RESPONSE]", run_response);
    let retrieved_runs = yield exports.openai.beta.threads.runs.retrieve(threadId, run_response.id);
    while (retrieved_runs.status !== 'completed') {
        yield new Promise(resolve => setTimeout(resolve, 600));
        retrieved_runs = yield exports.openai.beta.threads.runs.retrieve(threadId, run_response.id);
    }
    console.debug("[RETRIEVED_RUNS]", retrieved_runs);
    const messages = yield (0, exports.ListMessages)(threadId);
    // const lastMessage = messages.find((message) => message.run_id === run_response.id && message.role === 'assistant');
    // console.debug("[LAST_MESSAGE]", lastMessage)
    return messages;
});
exports.sendMessage = sendMessage;
const ListMessages = (threadId) => __awaiter(void 0, void 0, void 0, function* () {
    const messages = yield exports.openai.beta.threads.messages.list(threadId);
    console.debug("[MESSAGES]", messages);
    return messages.data;
});
exports.ListMessages = ListMessages;
