import { NextResponse } from 'next/server';

type Params = {
  params: Promise<{
    specification: string;
    workId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { specification, workId } = await params;

    const link = `${process.env.NEXT_PUBLIC_META_API_URL}/specifications/${specification}/work/${workId}`;

    const response = await fetch(
      link,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok && response.status === 404) {
      const message = await response.text();

      const errorMessage = message.length > 0 ? message : 'Failed to fetch specification';

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch specification' },
        { status: response.status }
      );
    }

    return NextResponse.json(link);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
