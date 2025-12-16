// app/api/facebook/extend-token/route.ts
// Extend short-lived user token to long-lived (60 days)

import { NextRequest, NextResponse } from 'next/server';

const FB_APP_ID = process.env.FB_APP_ID || "3918018128495962";
const FB_APP_SECRET = process.env.FB_APP_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { short_token } = await request.json();

    if (!short_token) {
      return NextResponse.json(
        { success: false, error: 'Missing short_token' },
        { status: 400 }
      );
    }

    if (!FB_APP_SECRET) {
      return NextResponse.json(
        { success: false, error: 'FB_APP_SECRET not configured on server' },
        { status: 500 }
      );
    }

    // Call Facebook Graph API to exchange token
    const url = `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${short_token}`;

    console.log('🔄 Extending token...');
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook API error:', data.error);
      return NextResponse.json(
        { success: false, error: data.error.message },
        { status: 400 }
      );
    }

    if (!data.access_token) {
      return NextResponse.json(
        { success: false, error: 'No access_token in response' },
        { status: 400 }
      );
    }

    console.log('✅ Token extended successfully');
    console.log(`📅 Expires in: ${data.expires_in} seconds (${Math.floor(data.expires_in / 86400)} days)`);

    return NextResponse.json({
      success: true,
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    });
  } catch (error) {
    console.error('❌ Error extending token:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
