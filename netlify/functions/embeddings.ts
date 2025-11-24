import type { HandlerContext } from "@netlify/functions";
import OpenAI from 'openai';

// Initialize OpenAI outside the handler for better performance (cold starts)
const openai = new OpenAI({
  apiKey: process.env.GPT40_API_KEY,
});

export default async (request: Request, context: HandlerContext) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { input } = await request.json();

    if (!input) {
      return new Response(JSON.stringify({ error: 'Input is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: input,
    });

    return new Response(JSON.stringify(embeddingResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in /netlify/functions/embeddings:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate embeddings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
