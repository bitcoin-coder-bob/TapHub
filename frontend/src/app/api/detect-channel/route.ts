interface DetectChannelRequest {
  pk1: string;
  pk2: string;
}

interface DetectChannelResponse {
  channels?: string[];
  success?: boolean;
  error?: string;
}

export async function POST(request: Request) {
  try {
    const body: DetectChannelRequest = await request.json();
    const { pk1, pk2 } = body;

    if (!pk1 || !pk2) {
      return new Response(JSON.stringify({
        success: false,
        error: "Both pk1 and pk2 are required"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Configuration for Lightning Network API
    const LND_HOST = process.env.LND_HOST || '127.0.0.1:8080';
    const LND_MACAROON = process.env.LND_MACAROON;
    
    // For development, return mock data if macaroon isn't configured
    if (!LND_MACAROON) {
      console.log('No LND macaroon configured, returning mock channel data for development');
      
      const mockResponse: DetectChannelResponse = {
        channels: ["mockChannelPoint1:0", "mockChannelPoint2:1"],
        error: ""
      };
      
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Make request to LND REST API to get channel graph
    const response = await fetch(`https://${LND_HOST}/v1/graph`, {
      method: 'GET',
      headers: {
        'Grpc-Metadata-macaroon': LND_MACAROON,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({
        error: `Failed to get channel graph: ${errorText}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const channelGraph = await response.json();
    const openedChannelPoints: string[] = [];

    // Search for channels between the two nodes
    if (channelGraph.edges) {
      for (const edge of channelGraph.edges) {
        if ((edge.node1_pub === pk1 && edge.node2_pub === pk2) ||
            (edge.node1_pub === pk2 && edge.node2_pub === pk1)) {
          openedChannelPoints.push(edge.chan_point);
        }
      }
    }

    const result: DetectChannelResponse = {
      channels: openedChannelPoints,
      error: ""
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error detecting channels:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}       