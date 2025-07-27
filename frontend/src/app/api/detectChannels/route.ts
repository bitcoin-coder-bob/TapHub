import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { pk1, pk2 } = await request.json();

    if (!pk1 || !pk2) {
      return NextResponse.json(
        { success: false, error: 'Both node public keys (pk1 and pk2) are required' },
        { status: 400 }
      );
    }

    // Call the backend API to detect channels
    const backendResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8082'}/detectChannels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pk1, pk2 }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'Channel detection failed' },
        { status: backendResponse.status }
      );
    }

    const detectionResult = await backendResponse.json();
    
    if (detectionResult.error) {
      return NextResponse.json(
        { success: false, error: detectionResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      channels: detectionResult.channels || []
    });
  } catch (error) {
    console.error('Error detecting channels:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}