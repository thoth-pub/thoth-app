import { NextResponse } from 'next/server';

import { generateFileSha256 } from '@/src/shared/utils/crypto';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const hash = await generateFileSha256(file);

  return NextResponse.json({ hash });
}
