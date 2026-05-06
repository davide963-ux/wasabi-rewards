/**
 * DELETE /api/admin/exclusions/:wallet
 */

import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { removeExclusion } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, ctx: { params: { wallet: string } }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  await removeExclusion(ctx.params.wallet);
  return NextResponse.json({ ok: true });
}
