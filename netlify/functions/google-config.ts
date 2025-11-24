import type { HandlerContext } from "@netlify/functions";

export default async (request: Request, context: HandlerContext) => {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  return new Response(JSON.stringify({
    clientId: process.env.GOOGLE_CLIENT_ID,
    apiKey: process.env.GOOGLE_API_KEY,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
