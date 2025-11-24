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
    const { text, prompt } = await request.json();

    if (!text || !prompt) {
      return new Response(JSON.stringify({ error: 'Text and prompt are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for knowledge generation
      messages: [{ role: "user", content: `${prompt}\n\n${text}` }],
      response_format: { type: "json_object" },
    });

    return new Response(JSON.stringify(chatCompletion), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in /netlify/functions/generate-knowledge:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate knowledge' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
