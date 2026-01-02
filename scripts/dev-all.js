#!/usr/bin/env bun

import { $ } from 'bun';

// Check if --tmux flag is used
const useTmux = process.argv.includes('--tmux');

if (useTmux) {
  // Use tmux for multi-terminal view
  console.log("🚀 Starting services in tmux...");
  const tmuxCmd = `
    tmux new-session -d -s url-util-dev
    tmux split-window -h
    tmux split-window -v
    tmux select-pane -t 0
    tmux send-keys 'cd packages/server && bun run dev' C-m
    tmux select-pane -t 1
    tmux send-keys 'cd packages/client && bun run dev' C-m
    tmux select-pane -t 2
    tmux send-keys 'echo "🐍 Python service: bun run dev:python"' C-m
    tmux select-pane -t 0
    tmux attach-session -t url-util-dev
  `;
  await $`bash -c ${tmuxCmd}`;
  process.exit(0);
}

// Clear screen and show header
console.clear();
console.log("🚀 URL Util Development Servers");
console.log("═══════════════════════════════════════");
console.log("");

const services = [
  { name: "Server", port: 3000, cmd: "cd packages/server && bun run dev", emoji: "🖥️" },
  { name: "Client", port: 5173, cmd: "cd packages/client && bun run dev", emoji: "🌐" },
  { name: "Python Alt-Text", port: 8000, cmd: "bun run dev:python", emoji: "🐍", skip: true }
];

let runningServices = [];

async function checkPort(port) {
  try {
    const result = await $`lsof -i :${port}`.nothrow();
    return result.exitCode === 0 ? "🔴 Occupied" : "🟢 Available";
  } catch {
    return "🟢 Available";
  }
}

async function showStatus() {
  console.clear();
  console.log("🚀 URL Util Development Servers");
  console.log("═══════════════════════════════════════");
  console.log("");

  for (const service of services) {
    const portStatus = await checkPort(service.port);
    const status = service.skip ? "⏭️  Skipped" :
                  runningServices.includes(service.name) ? "✅ Running" : "⏳ Starting";
    console.log(`${service.emoji} ${service.name.padEnd(15)} | Port ${service.port.toString().padEnd(4)} | ${status} | ${portStatus}`);
  }

  console.log("");
  console.log("🌐 URLs:");
  for (const service of services) {
    if (!service.skip && runningServices.includes(service.name)) {
      console.log(`   ${service.emoji} http://localhost:${service.port}`);
    }
  }

  console.log("");
  console.log("🎮 Controls:");
  console.log("   Ctrl+C to stop all services");
  console.log("   Status updates every 3 seconds");
  console.log("   Use --tmux flag for multi-terminal view");
  console.log("");
}

async function startServices() {
  try {
    // Show initial status
    await showStatus();

    // Start server
    console.log("🔄 Starting Server...");
    const serverPromise = $`cd packages/server && bun run dev`.nothrow();
    runningServices.push("Server");
    await showStatus();

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start client
    console.log("🔄 Starting Client...");
    const clientPromise = $`cd packages/client && bun run dev`.nothrow();
    runningServices.push("Client");
    await showStatus();

    // Show final status
    console.log("✅ All services started!");
    console.log("");

    // Status update loop
    const statusInterval = setInterval(async () => {
      await showStatus();
    }, 3000);

    // Wait for services to exit
    const results = await Promise.allSettled([serverPromise, clientPromise]);
    clearInterval(statusInterval);

    console.log("\n🛑 Services stopped");
    for (let i = 0; i < results.length; i++) {
      const service = services[i];
      if (results[i].status === 'rejected') {
        console.log(`❌ ${service.name} exited with error`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log("\n🛑 Shutting down services...");
  process.exit(0);
});

startServices();
