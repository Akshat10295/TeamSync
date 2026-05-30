const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');
const tar = require('tar-stream');

const isWindows = process.platform === 'win32';
const docker = new Docker(isWindows ? { socketPath: '//./pipe/docker_engine' } : { socketPath: '/var/run/docker.sock' });

const CONFIG = {
  python: {
    image: 'python:3.10-slim',
    extension: '.py',
    command: (file) => ['python', file]
  },
  javascript: {
    image: 'node:18-slim',
    extension: '.js',
    command: (file) => ['node', file]
  },
  cpp: {
    image: 'gcc:latest',
    extension: '.cpp',
    command: (file) => ['sh', '-c', `g++ ${file} -o /tmp/app && /tmp/app`]
  },
  java: {
    image: 'amazoncorretto:17',
    extension: '.java',
    command: (file) => ['sh', '-c', `javac ${file} && java -cp /tmp Main`]
  }
};

async function executeCode(language, code, onOutput, onExit, onContainerCreated) {
  const config = CONFIG[language];
  if (!config) {
    onOutput(`Error: Unsupported language: ${language}\r\n`);
    onExit(1);
    return;
  }

  const fixedFileName = language === 'java' ? 'Main.java' : `solution${config.extension}`;
  let container = null;
  let timeoutId = null;

  try {
    // 1. Create the container (Blazing fast startup)
    container = await docker.createContainer({
      Image: config.image,
      Cmd: config.command(`/tmp/${fixedFileName}`),
      HostConfig: {
        Memory: 128 * 1024 * 1024,
        CpuQuota: 50000,
        NetworkMode: 'none',
      },
      Tty: true
    });

    if (onContainerCreated) {
      onContainerCreated(container);
    }

    // 2. Prepare the code as a tar stream
    const pack = tar.pack();
    pack.entry({ name: fixedFileName }, code);
    pack.finalize();

    // 3. Inject the code into the container's /tmp folder
    await container.putArchive(pack, { path: '/tmp' });

    // 4. Attach to output
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    let totalOutputLength = 0;
    const MAX_OUTPUT_LIMIT = 100 * 1024; // 100 KB limit
    let killedDueToOutputLimit = false;

    stream.on('data', async (chunk) => {
      if (killedDueToOutputLimit) return;
      const str = chunk.toString();
      totalOutputLength += str.length;
      if (totalOutputLength > MAX_OUTPUT_LIMIT) {
        killedDueToOutputLimit = true;
        const allowedChunk = str.substring(0, MAX_OUTPUT_LIMIT - (totalOutputLength - str.length));
        if (allowedChunk) onOutput(allowedChunk);
        onOutput(`\r\n[Execution Engine] Output limit exceeded (limit: ${MAX_OUTPUT_LIMIT / 1024}KB). Terminating...\r\n`);
        try {
          await container.kill();
        } catch (err) {}
        return;
      }
      onOutput(str);
    });

    // Set a timeout to kill the container if it runs too long
    const TIMEOUT_LIMIT = 10000; // 10 seconds
    timeoutId = setTimeout(async () => {
      try {
        await container.kill();
        onOutput(`\r\n[Execution Engine] Time limit exceeded (limit: ${TIMEOUT_LIMIT / 1000}s). Terminating...\r\n`);
      } catch (err) {
        // container might have already exited
      }
    }, TIMEOUT_LIMIT);

    // 5. Start and wait
    await container.start();
    
    const result = await container.wait();
    if (timeoutId) clearTimeout(timeoutId);
    onExit(result.StatusCode);

    // 6. Cleanup
    await container.remove().catch(() => {});
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error('[ExecutionEngine] Error:', error);
    onOutput(`Error: ${error.message}\r\n`);
    onExit(1);
    if (container) {
      await container.remove().catch(() => {});
    }
  }
}

async function initializeImages() {
  console.log('[ExecutionEngine] 🚀 Pre-pulling images...');
  const images = [...new Set(Object.values(CONFIG).map(c => c.image)), 'alpine:latest'];
  for (const image of images) {
    try {
      const existing = await docker.listImages({ filters: { reference: [image] } });
      if (existing.length === 0) {
        await new Promise((resolve, reject) => {
          docker.pull(image, (err, stream) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
          });
        });
      }
    } catch (e) {}
  }
}

module.exports = { executeCode, initializeImages };
