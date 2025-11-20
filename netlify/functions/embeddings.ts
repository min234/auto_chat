import { Handler } from '@netlify/functions';
import OpenAI from 'openai';

// Initialize OpenAI outside the handler for better performance (cold starts)
const openai = new OpenAI({
  apiKey: process.env.GPT40_API_KEY,
});

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { input } = JSON.parse(event.body || '{}');

    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Input is required' }),
      };
    }

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: input,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embeddingResponse),
    };
  } catch (error) {
    console.error('Error in /netlify/functions/embeddings:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate embeddings' }),
    };
  }
};

export { handler };
