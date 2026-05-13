import { io } from 'socket.io-client';

// In dev, Vite proxy handles /socket.io -> localhost:3000
// In prod, same origin serves both
const socket = io();

export default socket;
