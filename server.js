import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import routes from './src/routes.js';
import { registerSocketHandlers } from './src/socket.js';
import { startCleanupLoop } from './src/roomManager.js';

const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '256kb' }));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ name: 'psypher-chat-backend', status: 'running' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] },
});

registerSocketHandlers(io);
startCleanupLoop();

httpServer.listen(PORT, () => {
  console.log(`psypher-chat-backend listening on :${PORT}`);
});
