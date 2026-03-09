import * as Ably from 'ably';

export default async function handler(req: any, res: any) {
    const apiKey = process.env.ABLY_API_KEY || process.env.VITE_ABLY_API_KEY;

    if (!apiKey) {
        console.error('Ably API key not found in environment variables');
        return res.status(500).json({ error: 'Ably API key not configured' });
    }

    try {
        const client = new Ably.Rest(apiKey);
        // Create a token request that the client-side SDK will use
        const tokenRequestData = await client.auth.createTokenRequest({
            clientId: req.query.clientId || 'anonymous',
        });

        return res.status(200).json(tokenRequestData);
    } catch (error: any) {
        console.error('Failed to create Ably token request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
