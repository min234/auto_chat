import type { HandlerContext } from "@netlify/functions";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GPT40_API_KEY,
});

export default async (request: Request, context: HandlerContext) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { messages, model: modelName, response_format } = await request.json();

    if (!messages) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatCompletion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: messages,
      response_format: response_format,
    });

    return new Response(JSON.stringify(chatCompletion), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in /netlify/functions/chat-completions:', error);
    return new Response(JSON.stringify({ error: 'Failed to get completion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
