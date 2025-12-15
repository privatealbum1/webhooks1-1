import { NextResponse } from 'next/server';

// Code JavaScript thuần (Không có định kiểu :Type)

export async function GET(request) {
  // Lấy các tham số từ URL
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log("Verify Request:", { mode, token, challenge });

  // Kiểm tra Token (Hard-code luôn để test cho dễ)
  const MY_VERIFY_TOKEN = "dungdev_secret_code_123";

  if (mode === 'subscribe' && token === MY_VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("Received Event:", body);
    
    // Tạm thời chỉ trả về 200 OK
    return NextResponse.json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
