const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const setupWSConnection = require('y-websocket/bin/utils').setupWSConnection;
const setupRoutes = require('./routes/api');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 1. Setup Socket.io (Existing collaboration/chat logic)
const io = new Server(server, { cors: { origin: '*' } });

// 2. Setup standard WebSocket server for Yjs
const wss = new WebSocket.Server({ noServer: true });

// Setup Persistence (prevent erasure on refresh)
const { LeveldbPersistence } = require('y-leveldb');
const { setPersistence } = require('y-websocket/bin/utils');
const Y = require('yjs');
const path = require('path');
const ldb = new LeveldbPersistence(path.join(__dirname, '../yjs-data'));

setPersistence({
  bindState: async (docName, ydoc) => {
    console.log(`[Yjs] 💾 Loading state for room: ${docName}`);
    try {
      const persistedYdoc = await ldb.getYDoc(docName);
      const persistedState = Y.encodeStateAsUpdate(persistedYdoc);
      
      // Apply the persisted state to the document
      Y.applyUpdate(ydoc, persistedState);
      
      console.log(`[Yjs] ✅ State loaded for room: ${docName}`);

      // Listen for updates and store them
      ydoc.on('update', update => {
        ldb.storeUpdate(docName, update);
      });
    } catch (err) {
      console.error(`[Yjs] ❌ Error loading state for ${docName}:`, err);
    }
  },
  writeState: async (docName, ydoc) => {
    // LeveldbPersistence.storeUpdate already handles incremental updates.
    return Promise.resolve();
  }
});

wss.on('connection', (conn, req) => {
  // Extract docName from URL (e.g., /yjs/project-123 -> project-123)
  const urlParts = req.url.split('?')[0].split('/');
  const docName = urlParts[urlParts.length - 1] || 'default-doc';
  console.log(`[Yjs] 🔌 New connection for room: ${docName}`);
  setupWSConnection(conn, req, { docName, gc: true });
});

// 3. Handle Upgrade requests (route to Socket.io or Yjs WSS)
server.on('upgrade', (request, socket, head) => {
  // If the path starts with /yjs, it's a Yjs websocket connection
  if (request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // Let socket.io handle other upgrades automatically
  }
});

// 4. Mount existing application routes and logic
setupRoutes(app, io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n✅ TeamSync API running at http://localhost:${PORT}`);
  console.log(`🔌 Yjs WebSocket Server attached on ws://localhost:${PORT}/yjs/*\n`);
});
