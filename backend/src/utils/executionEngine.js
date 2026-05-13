const Docker = require('dockerode');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');

// Initialize Docker
// On Windows, use the named pipe
const isWindows = process.platform === 'win32';
const docker = new Docker(isWindows ? { socketPath: '//./pipe/docker_engine' } : { socketPath: '/var/run/docker.sock' });

const CONFIG = {
  python: {
    image: 'python:3.10-slim',
    command: (file) => ['python', file],
    extension: '.py'
  },
  javascript: {
    image: 'node:18-slim',
    command: (file) => ['node', file],
    extension: '.js'
  },
  cpp: {
    image: 'gcc:12.2',
    command: (file) => ['sh', '-c', `g++ ${file} -o /tmp/main.out && /tmp/main.out`],
    extension: '.cpp'
  },
  java: {
    image: 'eclipse-temurin:17-jdk-jammy',
    command: (file) => ['sh', '-c', `javac ${file} && java -cp /tmp Main`],
    extension: '.java'
  }
};

/**
 * Executes code in a Docker container and streams output
 */
async function executeCode(language, code, onOutput, onExit) {
  const config = CONFIG[language];
  if (!config) {
    onOutput(`Error: Unsupported language: ${language}\r\n`);
    onExit(1);
    return;
  }

  // Use a fixed filename within a temp directory for better compatibility (e.g. Java class name)
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  const fixedFileName = language === 'java' ? 'Main.java' : `solution${config.extension}`;
  const filePath = path.join(tmpDir.name, fixedFileName);
  
  fs.writeFileSync(filePath, code);
  const dirName = tmpDir.name;
  const fileName = fixedFileName;

  try {
    // Check if image exists, pull if not
    const images = await docker.listImages({ filters: { reference: [config.image] } });
    if (images.length === 0) {
      onOutput(`Image ${config.image} not found. Pulling... (this may take a minute)\r\n`);
      await new Promise((resolve, reject) => {
        docker.pull(config.image, (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
        });
      });
      onOutput(`Successfully pulled ${config.image}.\r\n`);
    }

    // Create and start container
    const container = await docker.createContainer({
      Image: config.image,
      Cmd: config.command(`/tmp/${fileName}`),
      HostConfig: {
        Binds: [`${dirName}:/tmp:rw`], // Mount temp dir as read-write for compilation
        Memory: 128 * 1024 * 1024, // 128MB limit
        CpuPeriod: 100000,
        CpuQuota: 50000, // 0.5 CPU limit
        NetworkMode: 'none', // No network access
        AutoRemove: true // Remove container after exit
      },
      WorkingDir: '/tmp',
      Tty: true // Enable TTY for better output formatting
    });

    // Attach to the container's streams before starting it (if possible) or right after
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    console.log(`[ExecutionEngine] Attached to container ${container.id}`);

    // Stream output back
    stream.on('data', (chunk) => {
      const text = chunk.toString();
      console.log(`[ExecutionEngine] Output: ${text}`);
      onOutput(text);
    });

    await container.start();
    console.log(`[ExecutionEngine] Container started`);

    // Handle timeout
    const timeout = setTimeout(async () => {
      try {
        await container.stop();
        onOutput('\r\n[Execution Timeout: 10 seconds exceeded]\r\n');
      } catch (e) {
        // Container might already be gone
      }
    }, 10000);

    // Wait for container to exit
    const result = await container.wait();
    clearTimeout(timeout);
    
    onExit(result.StatusCode);
  } catch (error) {
    console.error('[ExecutionEngine] Error:', error);
    onOutput(`Error initializing execution environment: ${error.message}\r\n`);
    onExit(1);
  } finally {
    // Cleanup temp directory
    try {
      tmpDir.removeCallback();
    } catch (e) {}
  }
}

module.exports = { executeCode };
