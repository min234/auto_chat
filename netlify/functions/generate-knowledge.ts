import { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GPT40_API_KEY,
});

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text, prompt } = JSON.parse(event.body || '{}');

    if (!text || !prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Text and prompt are required' }),
      };
    }

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for knowledge generation
      messages: [{ role: "user", content: `${prompt}\n\n${text}` }],
      response_format: { type: "json_object" },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatCompletion),
    };
  } catch (error) {
    console.error('Error in /netlify/functions/generate-knowledge:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate knowledge' }),
    };
  }
};

export { handler };
