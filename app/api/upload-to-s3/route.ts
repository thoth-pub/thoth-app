import { NextRequest, NextResponse } from 'next/server';

import { HTTP_METHODS } from '@/src/shared';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadUrl = formData.get('uploadUrl') as string;
    const headersJson = formData.get('headers') as string;

    if (!file || !uploadUrl || !headersJson) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const headers = JSON.parse(headersJson);

    const fileBuffer = await file.arrayBuffer();

    const response = await fetch(uploadUrl, {
      method: HTTP_METHODS.PUT,
      headers,
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Failed to upload to S3', details: errorText }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
