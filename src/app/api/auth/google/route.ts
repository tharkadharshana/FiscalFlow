// /app/api/auth/google/route.ts
import { google } from 'googleapis';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('User ID is required to link Gmail.', { status: 400 });
  }

  const { 
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: clientId, 
    GOOGLE_CLIENT_SECRET: clientSecret, 
    NEXT_PUBLIC_GOOGLE_REDIRECT_URI: redirectUri 
  } = process.env;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("Missing Google OAuth environment variables.");
    return new Response('Server configuration error. Please check environment variables.', { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify' // To mark emails as read
  ];

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important to get a refresh token
    scope: scopes,
    prompt: 'consent', // Ensures the user is always prompted for consent
    state: userId // Pass the userId to the callback for linking
  });

  return NextResponse.redirect(authorizeUrl);
}
