/**
 * POST /api/admin/login
 *
 * Body: { password: string }
 * Sets a signed `wasabi_admin` cookie on success.
 */

import { NextResponse } from 'next/server';
import { createSessionCookie, safeEqual, SESSION_COOKIE_NAME, SESSION_TTL } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not configured' },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const provided = body.password ?? '';
  if (!safeEqual(provided, expected)) {
    // Small delay to discourage brute force
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'invalid password' }, { status: 401 });
  }

  const token = await createSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  });
  return res;
}

export async function DELETE() {
  // Logout
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
