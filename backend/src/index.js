const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const setupWSConnection = require('y-websocket/bin/utils').setupWSConnection;
const setupRoutes = require('./routes/api');
const { supabase, supabaseAdmin } = require('./utils/supabase');

require('dotenv').config();
const { initializeImages } = require('./utils/executionEngine');

// Pre-pull Docker images for execution engine
initializeImages();

const app = express();
const server = http.createServer(app);

// 1. Setup Socket.io (Existing collaboration/chat logic)
const io = new Server(server, { cors: { origin: '*' } });

// Setup Redis Adapter for horizontal scaling (Phase 6 Distributed Sync)
const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');
const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

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

      // If document is empty, try to seed from Supabase
      const monacoText = ydoc.getText('monaco');
      if (monacoText.length === 0) {
        if (docName.startsWith('project-')) {
          const parts = docName.split('-');
          // UUIDs have 5 parts (4 hyphens). Room is project-UUID-UUID.
          // project is parts[0], projectId is parts[1-5], fileId is parts[6-10]
          if (parts.length >= 11) {
            const projectId = parts.slice(1, 6).join('-');
            const fileId = parts.slice(6, 11).join('-');
            console.log(`[Yjs] 🔍 Room empty. Seeding from DB for file: ${fileId}`);
            
            const { data: file, error } = await supabaseAdmin
              .from('ide_files')
              .select('content')
              .eq('id', fileId)
              .single();
              
            if (!error && file && file.content) {
              monacoText.insert(0, file.content);
              console.log(`[Yjs] ✨ Seeded document with ${file.content.length} chars`);
            }
          }
        }
      }

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
