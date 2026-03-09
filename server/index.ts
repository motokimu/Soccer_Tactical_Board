import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import boardHandler from '../api/boards.ts';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allows any origin, including localhost:5173
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true // Support older clients if needed
});

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

app.get('/', (req, res) => res.send('API & Socket Server is Running'));

app.all('/api/boards', async (req, res) => {
    await boardHandler(req, mockRes(res));
});

// Socket.io event handling
const users = new Map<string, { id: string, name: string, x: number, y: number, color: string }>();

const COLOR_PALETTE = [
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#71717a', // Zinc
];

let colorIndex = 0;

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join', (data: { name: string, boardId?: string }) => {
        const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
        colorIndex++;

        users.set(socket.id, { id: socket.id, name: data.name, x: 0, y: 0, color });

        if (data.boardId) {
            socket.join(data.boardId);
            // Store room info on socket for easier access
            (socket as any).boardId = data.boardId;
        }

        const roomUsers = data.boardId
            ? Array.from(users.entries())
                .filter(([sid]) => io.sockets.adapter.rooms.get(data.boardId!)?.has(sid))
                .map(([, user]) => user)
            : Array.from(users.values());

        if (data.boardId) {
            io.to(data.boardId).emit('users-update', roomUsers);
        } else {
            io.emit('users-update', Array.from(users.values()));
        }
    });

    socket.on('cursor-move', (data: { x: number, y: number }) => {
        const user = users.get(socket.id);
        const boardId = (socket as any).boardId;
        if (user) {
            user.x = data.x;
            user.y = data.y;
            if (boardId) {
                socket.to(boardId).emit('cursor-update', { id: socket.id, x: data.x, y: data.y });
            } else {
                socket.broadcast.emit('cursor-update', { id: socket.id, x: data.x, y: data.y });
            }
        }
    });

    socket.on('state-change', (data: { objects: any[], lines: any[] }) => {
        const boardId = (socket as any).boardId;
        if (boardId) {
            socket.to(boardId).emit('state-update', data);
        } else {
            socket.broadcast.emit('state-update', data);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        const user = users.get(socket.id);
        const boardId = (socket as any).boardId;
        users.delete(socket.id);

        if (boardId) {
            const roomUsers = Array.from(users.entries())
                .filter(([sid]) => io.sockets.adapter.rooms.get(boardId)?.has(sid))
                .map(([, user]) => user);
            io.to(boardId).emit('users-update', roomUsers);
        } else {
            io.emit('users-update', Array.from(users.values()));
        }
    });
});

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 API Bridge & Socket Server is running on port ${PORT}`);
    console.log(`🏠 Network: http://localhost:${PORT}`);
    console.log(`🔗 Proxying /api/boards to Serverless Function`);
    console.log(`📡 WebSocket server is active`);
    console.log(`-----------------------------------------`);
});
