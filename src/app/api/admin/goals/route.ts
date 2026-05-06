/**
 * GET  /api/admin/goals     -> list all goals
 * POST /api/admin/goals     -> create a goal { targetUsd: number, label?: string }
 */

import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { createGoal, listGoals } from '@/lib/db';

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
  const goals = await listGoals();
  return NextResponse.json({ goals });
}

export async function POST(req: Request) {
  const guard = await requireAuth();
  if (guard) return guard;

  let body: { targetUsd?: number; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const targetUsd = Number(body.targetUsd);
  if (!isFinite(targetUsd) || targetUsd <= 0) {
    return NextResponse.json({ error: 'targetUsd must be positive' }, { status: 400 });
  }

  const goal = await createGoal(targetUsd, body.label?.trim() || null);
  return NextResponse.json({ goal });
}
