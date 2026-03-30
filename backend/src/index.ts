import app from './app';
import connectDB from './config/db';
import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket: any) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined their private room`);
  });

  socket.on('send_message', (data: any) => {
    const { receiverId, message } = data;
    io.to(receiverId).emit('receive_message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});

export { io };
