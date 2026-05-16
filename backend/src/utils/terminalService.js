const Docker = require('dockerode');
const isWindows = process.platform === 'win32';
const docker = new Docker(isWindows ? { socketPath: '//./pipe/docker_engine' } : { socketPath: '/var/run/docker.sock' });

const sessions = new Map();

async function createTerminalSession(socket, teamId, io) {
  const id = socket.id;
  if (sessions.has(id)) {
    return sessions.get(id);
  }
  console.log(`[TerminalService] 🐚 Creating session for team: ${teamId}`);

  try {
    // We use a basic alpine image for the terminal (very fast)
    const container = await docker.createContainer({
      Image: 'alpine:latest',
      Cmd: ['/bin/sh'],
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      HostConfig: {
        Memory: 64 * 1024 * 1024,
        CpuQuota: 20000,
        NetworkMode: 'none',
        AutoRemove: true
      }
    });

    await container.start();

    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      hijack: true
    });

    sessions.set(id, { container, stream });

    stream.on('data', (chunk) => {
      io.to(`terminal:${teamId}`).emit('terminal:output', chunk.toString());
    });

    return { stream };
  } catch (err) {
    console.error('[TerminalService] ❌ Failed to create session:', err);
    throw err;
  }
}

function handleInput(id, input) {
  const session = sessions.get(id);
  if (session && session.stream && session.stream.writable) {
    console.log(`[TerminalService] ⌨️ Input for ${id}: ${JSON.stringify(input)}`);
    session.stream.write(input);
  } else {
    console.warn(`[TerminalService] ⚠️ Session ${id} not writable or missing`);
  }
}

async function closeSession(id) {
  const session = sessions.get(id);
  if (session && session.container) {
    try {
      await session.container.stop();
    } catch (e) {}
    sessions.delete(id);
  }
}

module.exports = { createTerminalSession, handleInput, closeSession };
