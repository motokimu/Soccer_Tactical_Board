import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import templateHandler from '../api/templates.ts';

const app = express();
app.use(express.json());

// Mock Vercel response object for local dev
const mockRes = (res: any) => ({
    status: (code: number) => {
        res.status(code);
        return {
            json: (data: any) => res.json(data),
            end: () => res.end(),
        };
    },
    json: (data: any) => res.json(data),
    end: () => res.end(),
});

app.all('/api/templates', async (req, res) => {
    await templateHandler(req, mockRes(res));
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 API Bridge is running on port ${PORT}`);
    console.log(`🔗 Proxying /api/templates to Serverless Function`);
    console.log(`-----------------------------------------`);
});
