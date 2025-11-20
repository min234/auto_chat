import { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.GOOGLE_CLIENT_ID,
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  };
};

export { handler };
