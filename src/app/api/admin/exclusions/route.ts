/**
 * GET  /api/admin/exclusions          -> list custom exclusions
 * POST /api/admin/exclusions          -> add { wallet, reason? }
 */

import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { addExclusion, listExclusions } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAuth() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const guard = await requireAuth();
  if (guard) return guard;
  const exclusions = await listExclusions();
  return NextResponse.json({ exclusions });
}

export async function POST(req: Request) {
  const guard = await requireAuth();
  if (guard) return guard;

  let body: { wallet?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const wallet = String(body.wallet ?? '').trim();
  if (!wallet || wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  }

  await addExclusion(wallet, body.reason?.trim() || null);
  return NextResponse.json({ ok: true });
}
