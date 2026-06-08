import type { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { verifyToken } from "./utils/jwt";

type RealtimeEvent = {
  payload: unknown;
  type: string;
};

const clientsByUserId = new Map<number, Set<WebSocket>>();

function addClient(userId: number, socket: WebSocket) {
  const clients = clientsByUserId.get(userId) ?? new Set<WebSocket>();
  clients.add(socket);
  clientsByUserId.set(userId, clients);

  socket.on("close", () => {
    clients.delete(socket);
    if (clients.size === 0) {
      clientsByUserId.delete(userId);
    }
  });
}

function send(socket: WebSocket, event: RealtimeEvent) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

export function publishToUser(userId: number, event: RealtimeEvent) {
  const clients = clientsByUserId.get(userId);
  if (!clients) {
    return;
  }

  clients.forEach((socket) => send(socket, event));
}

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ path: "/ws", server });

  wss.on("connection", (socket, request) => {
    try {
      const url = new URL(request.url ?? "", "http://localhost");
      const token = url.searchParams.get("token");
      if (!token) {
        socket.close(1008, "Missing token");
        return;
      }

      const { userId } = verifyToken(token);
      addClient(userId, socket);
      send(socket, { payload: { userId }, type: "connected" });
    } catch {
      socket.close(1008, "Invalid token");
    }
  });

  return () => {
    wss.close();
    clientsByUserId.clear();
  };
}
