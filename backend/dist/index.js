"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const PORT = process.env.PORT || 5000;
const httpServer = (0, http_1.createServer)(app_1.default);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
    },
});
exports.io = io;
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join_room', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their private room`);
    });
    socket.on('send_message', (data) => {
        const { receiverId, message } = data;
        io.to(receiverId).emit('receive_message', message);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
(0, db_1.default)().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
});
