import type { HandlerContext } from "@netlify/functions";
import { google } from 'googleapis';

export default async (request: Request, context: HandlerContext) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return new Response(JSON.stringify({ error: 'Not authenticated with Google Drive. Access token is missing.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a temporary OAuth2 client with the user's token
  const tempOauth2Client = new google.auth.OAuth2();
  tempOauth2Client.setCredentials({ access_token: token });

  const drive = google.drive({ version: 'v3', auth: tempOauth2Client });
  const sheets = google.sheets({ version: 'v4', auth: tempOauth2Client });

  try {
    const { fileId, mimeType } = await request.json();

    let content: string[] = []; // Always return an array of strings
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: 'A1:Z1000', // Read a large range
      });
      // Map each row to a string, filter out empty rows
      content = response.data.values
        ?.map(row => row.join(', '))
        .filter(row => row.trim() !== '') ?? [];
    } else {
      const response = await drive.files.export({
        fileId: fileId,
        mimeType: 'text/plain',
      }, { responseType: 'text' });
      // Split by newline and filter out empty paragraphs
      content = (response.data as string)
        .split('\n')
        .filter(paragraph => paragraph.trim() !== '');
    }

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching Google Drive file content:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch file content from Google Drive.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
