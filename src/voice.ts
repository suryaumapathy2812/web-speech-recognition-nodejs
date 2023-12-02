import { OpenAI } from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const speech_to_text = async (audio: string) => {

  const { text } = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    response_format: 'json',
    language: 'en',
    file: ('https://assets.openai.com/voice/eng-0001.wav' as any),
  });

  console.log("[voice]", text);
  return text;
}


const text_to_speech = async (text: string) => {
  const audio = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'alloy',
    input: 'Hello, my name is John.',
    response_format: 'mp3',
    speed: 1.0,
  });

  console.log("[audio]", audio);
  return audio;
}


export { text_to_speech, speech_to_text }
