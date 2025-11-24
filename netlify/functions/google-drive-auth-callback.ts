import type { HandlerContext } from "@netlify/functions";
import { google } from 'googleapis';

console.log('[DEBUG] GOOGLE_REDIRECT_URI (from env):', process.env.GOOGLE_REDIRECT_URI);
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export default async (request: Request, context: HandlerContext) => {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  console.log('[/netlify/functions/google-drive-auth-callback] Received callback from Google.');
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing authorization code.', { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('[/netlify/functions/google-drive-auth-callback] Successfully exchanged code for tokens.');

    // Send tokens to the client via postMessage
    // The targetOrigin needs to be dynamic based on the Netlify deployment URL
    const targetOrigin = process.env.NETLIFY_SITE_URL || 'http://localhost:3000';

    const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Success</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'google-auth-tokens',
              tokens: ${JSON.stringify(tokens)}
            }, '${targetOrigin}');
            window.close();
          </script>
          <p>Authentication successful! You can close this window.</p>
        </body>
        </html>
      `;

    return new Response(htmlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    return new Response('Authentication failed.', { status: 500 });
  }
};
