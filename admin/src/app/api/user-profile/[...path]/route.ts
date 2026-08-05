import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, props);
}
export async function POST(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, props);
}
export async function PUT(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, props);
}
export async function PATCH(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, props);
}
export async function DELETE(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, props);
}

async function handleProxy(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  const pathString = params.path.join('/');
  const backendUrl =
    process.env.USER_PROFILE_BACKEND_URL || 'http://localhost:3005/user-profile-service';

  const searchParams = req.nextUrl.search;
  const targetUrl = `${backendUrl}/${pathString}${searchParams}`;

  try {
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });

    const init: RequestInit = {
      method: req.method,
      headers,
      cache: 'no-store',
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const text = await req.text();
      if (text) {
        init.body = text;
      }
    }

    const res = await fetch(targetUrl, init);

    const textData = await res.text();
    let jsonData;
    try {
      jsonData = textData ? JSON.parse(textData) : {};
    } catch {
      return NextResponse.json({
        statusCode: res.status,
        message: `Backend returned non-JSON response: ${textData.substring(0, 200)}`,
      }, { status: res.status });
    }

    return NextResponse.json(jsonData, { status: res.status });
  } catch (error: any) {
    console.error('[USER-PROFILE PROXY ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: error.message },
      { status: 500 },
    );
  }
}
