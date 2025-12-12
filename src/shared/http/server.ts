import { serve, Server } from "bun";

export interface RouteDefinition {
  method: string;
  match: (url: URL, req: Request) => boolean;
  handler: (req: Request, url: URL) => Promise<Response> | Response;
}

interface ServerOptions {
  port?: number;
  onStart?: (server: Server) => void;
}

export function pathMatcher(path: string) {
  return (url: URL) => url.pathname === path;
}

export function prefixMatcher(prefix: string) {
  return (url: URL) => url.pathname.startsWith(prefix);
}

export function startHttpServer(routes: RouteDefinition[], options: ServerOptions = {}) {
  const server = serve({
    port: options.port ?? 3000,
    fetch(req) {
      const url = new URL(req.url);
      for (const route of routes) {
        if (route.method === req.method && route.match(url, req)) {
          return route.handler(req, url);
        }
      }
      return new Response("Not Found", { status: 404 });
    },
  });

  options.onStart?.(server);
  return server;
}
