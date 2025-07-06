// /app/api/auth/google/callback/route.ts
import { google } from 'googleapis';
import { type NextRequest, NextResponse } from 'next/server';
import { db, authAdmin } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is our userId

    const userId = state;

    if (!code || !userId) {
        return new Response('Authorization code or state missing.', { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            console.warn(`No refresh_token received for user ${userId}. They may have already granted consent.`);
            // You might still store the access_token, but long-term access will fail.
        }

        // Store the tokens securely in Firestore, associated with the user.
        await db.collection('gmail_tokens').doc(userId).set({
            refresh_token: tokens.refresh_token,
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date,
            scope: tokens.scope,
            last_updated: new Date().toISOString()
        }, { merge: true });

        // Update the user's profile in the 'users' collection to show connection status
        await db.collection('users').doc(userId).update({
            gmailConnected: true
        });

        console.log(`Gmail tokens stored successfully for user ${userId}`);
        
        const redirectUrl = new URL('/dashboard/settings', request.nextUrl.origin);
        redirectUrl.searchParams.set('status', 'gmail_connected');

        return NextResponse.redirect(redirectUrl.toString());

    } catch (error) {
        console.error('Error exchanging code for tokens or storing them:', error);
        const redirectUrl = new URL('/dashboard/settings', request.nextUrl.origin);
        redirectUrl.searchParams.set('status', 'gmail_failed');
        return NextResponse.redirect(redirectUrl.toString());
    }
}
