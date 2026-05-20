import type { SetupServerApi } from "msw/node";

let server: SetupServerApi | null = null;

export async function setupServer() {
  if (server) {
    return server;
  }

  const { setupServer: mswSetupServer } = await import("msw/node");
  const { handlers } = await import("./handlers");

  server = mswSetupServer(...handlers);
  return server;
}

export async function startServer() {
  const s = await setupServer();
  s.listen();
  return s;
}

export async function closeServer() {
  if (server) {
    server.close();
    server = null;
  }
}

export function getServer() {
  return server;
}
