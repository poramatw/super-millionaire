import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { SHARED_PACKAGE_NAME, type ServerHealthPayload } from '@super-millionaire/shared';

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  const payload: ServerHealthPayload = {
    status: 'ok',
    service: SHARED_PACKAGE_NAME,
  };
  res.json(payload);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  socket.emit('health', { status: 'ok', service: SHARED_PACKAGE_NAME });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
