import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
async function handleProxy(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  const pathString = params.path.join('/');
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.SSO_BACKEND_URL ||
    (process.env.NODE_ENV === 'production' ? 'http://saas-backend-sso:3001' : 'http://localhost:3001');
  
  // Preserve query parameters
  const searchParams = req.nextUrl.search;
  const targetUrl = `${backendUrl}/sso/${pathString}${searchParams}`;

  try {
    const headers = new Headers();
    // Copy all necessary headers, especially Authorization
    req.headers.forEach((value, key) => {
      // Don't copy host to avoid issues with proxying
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });

    // Ensure Authorization header is present - fallback to accessToken cookie if not explicitly provided
    if (!headers.has('authorization') || !headers.get('authorization')?.trim()) {
      const rawCookieToken =
        req.cookies.get('accessToken')?.value ||
        req.cookies.get('token')?.value ||
        req.cookies.get('auth_token')?.value;
      if (rawCookieToken) {
        try {
          const cookieToken = decodeURIComponent(rawCookieToken).trim();
          const authVal = cookieToken.startsWith('Bearer ') ? cookieToken : `Bearer ${cookieToken}`;
          headers.set('authorization', authVal);
        } catch {
          const authVal = rawCookieToken.startsWith('Bearer ') ? rawCookieToken : `Bearer ${rawCookieToken}`;
          headers.set('authorization', authVal);
        }
      }
    }

    // Forward the real IP
    const clientIp = req.headers.get('x-forwarded-for') || (req as any).ip || '127.0.0.1';
    if (!headers.has('x-forwarded-for')) {
      headers.set('x-forwarded-for', clientIp);
    }

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

    console.log(`[PROXY] Forwarding ${req.method} request to: ${targetUrl}`);

    const res = await fetch(targetUrl, init);

    const textData = await res.text();
    let jsonData;
    try {
      jsonData = textData ? JSON.parse(textData) : {};
    } catch {
      return NextResponse.json({
        statusCode: res.status,
        message: `Backend returned non-JSON response: ${textData.substring(0, 200)}`
      }, { status: res.status });
    }

    return NextResponse.json(jsonData, { status: res.status });

  } catch (error: any) {
    console.error('[PROXY ERROR]', error);
    return NextResponse.json({
      statusCode: 502,
      message: `[NextJS Proxy Error] Failed to connect to ${targetUrl}. Reason: ${error.message}. Code: ${error.code}`
    }, { status: 502 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;

