// Realtime WebSocket Client Engine
// Connects to the Express WebSocket server on port 3000 (/ws)
// Implements the exact envelope protocol:
// 1. Auth handshake: { type: 'auth', token: '<access_token>', username: '<username>' }
// 2. Direct message: { type: 'message', to: '<username>', content: '<text>' }
// 3. History listener: { type: 'history', messages: [...] }
// 4. Inbound router: { type: 'message', from: '<sender>', to: '<receiver>', content: '<text>' }

import { getStoredAuthUser, subscribeAuth, AuthUser } from "./auth";

export interface RealtimeMessagePayload {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  type?: "text" | "voice" | "image";
  voiceDuration?: string;
  voiceWaveform?: number[];
}

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

class RealtimeBus {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(msg: RealtimeMessagePayload) => void>> = new Map();
  private globalMessageListeners: Set<(msg: RealtimeMessagePayload) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus, latencyMs?: number) => void> = new Set();
  private historyListeners: Set<(messages: RealtimeMessagePayload[]) => void> = new Set();
  private presenceListeners: Set<(onlineUsers: string[]) => void> = new Set();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private currentStatus: ConnectionStatus = "CONNECTING";
  private currentLatency: number = 14;
  private pingStart: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.connectWebSocket();

      // Listen to auth changes and re-authenticate socket immediately
      subscribeAuth((user) => {
        this.reauthenticate(user);
      });
    }
  }

  public reauthenticate(user: AuthUser | null) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const token = user?.token || "dev-token-guest";
      const username = user?.username || "guest";
      this.ws.send(
        JSON.stringify({
          type: "auth",
          token,
          username,
        })
      );
    } else {
      this.connectWebSocket(true);
    }
  }

  public connectWebSocket(forceReconnect: boolean = false) {
    if (typeof window === "undefined") return;

    if (!forceReconnect && this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.setStatus("CONNECTING");

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("⚡ WebSocket connected to backend");
        this.setStatus("CONNECTED", 12);
        
        // Send auth envelope with access token or dev token
        const authUser = getStoredAuthUser();
        const token = authUser?.token || (authUser ? `dev-token-${authUser.username}` : "dev-token-guest");
        const username = authUser?.username || "guest";

        this.ws?.send(
          JSON.stringify({
            type: "auth",
            token,
            username,
          })
        );

        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "pong") {
            const rtt = Math.max(8, Date.now() - this.pingStart);
            this.currentLatency = rtt;
            this.notifyStatus(this.currentStatus, this.currentLatency);
            return;
          }

          if (data.type === "auth_success") {
            console.log("🔐 Authenticated with WebSocket server as:", data.username);
            return;
          }

          if (data.type === "history" && Array.isArray(data.messages)) {
            const mapped: RealtimeMessagePayload[] = data.messages.map((m: any) => ({
              id: m.id || `hist-${Date.now()}-${Math.random()}`,
              senderId: m.from,
              receiverId: m.to,
              content: m.content,
              timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
            }));
            this.historyListeners.forEach((cb) => cb(mapped));
            return;
          }

          if (data.type === "message") {
            const payload: RealtimeMessagePayload = {
              id: data.id || `ws-${Date.now()}-${Math.random()}`,
              senderId: data.from,
              receiverId: data.to,
              content: data.content,
              timestamp: data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
            };
            this.notifyListeners(payload);
            return;
          }

          if (data.type === "presence" && Array.isArray(data.onlineUsers)) {
            this.presenceListeners.forEach((cb) => cb(data.onlineUsers));
            return;
          }
        } catch (err) {
          console.warn("WebSocket parse warning:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("🔌 WebSocket disconnected, scheduling reconnect...");
        this.setStatus("DISCONNECTED");
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket status warning:", err);
        this.setStatus("ERROR");
      };
    } catch (err) {
      console.warn("WebSocket connection init failed:", err);
      this.setStatus("DISCONNECTED");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, 3000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.pingStart = Date.now();
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 4000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus, latency?: number) {
    this.currentStatus = status;
    if (latency !== undefined) this.currentLatency = latency;
    this.notifyStatus(this.currentStatus, this.currentLatency);
  }

  private notifyStatus(status: ConnectionStatus, latency: number) {
    this.statusListeners.forEach((listener) => listener(status, latency));
  }

  public subscribeRoom(
    roomId: string,
    callback: (msg: RealtimeMessagePayload) => void
  ): () => void {
    const key = roomId.replace("user-", "");
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  public subscribeStatus(callback: (status: ConnectionStatus, latencyMs?: number) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus, this.currentLatency);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public subscribeHistory(callback: (messages: RealtimeMessagePayload[]) => void): () => void {
    this.historyListeners.add(callback);
    return () => {
      this.historyListeners.delete(callback);
    };
  }

  public subscribePresence(callback: (onlineUsers: string[]) => void): () => void {
    this.presenceListeners.add(callback);
    return () => {
      this.presenceListeners.delete(callback);
    };
  }

  public subscribeAllMessages(callback: (msg: RealtimeMessagePayload) => void): () => void {
    this.globalMessageListeners.add(callback);
    return () => {
      this.globalMessageListeners.delete(callback);
    };
  }

  public dispatchMessage(payload: RealtimeMessagePayload): void {
    // Send via WebSocket to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const recipient = payload.receiverId.replace("user-", "");
      this.ws.send(
        JSON.stringify({
          type: "message",
          to: recipient,
          content: payload.content,
        })
      );
    }
  }

  private notifyListeners(payload: RealtimeMessagePayload) {
    this.globalMessageListeners.forEach((cb) => cb(payload));

    const senderKey = payload.senderId.replace("user-", "");
    const receiverKey = payload.receiverId.replace("user-", "");

    this.listeners.get(senderKey)?.forEach((cb) => cb(payload));
    this.listeners.get(receiverKey)?.forEach((cb) => cb(payload));
  }

  public getLatency(): number {
    return this.currentLatency;
  }
}

export const realtimeBus = new RealtimeBus();

export class RealtimeChatManager {
  private unsubscribeRoom: (() => void) | null = null;
  private unsubscribeStatus: (() => void) | null = null;

  public initChannel(
    roomId: string,
    onMessage: (msg: RealtimeMessagePayload) => void,
    onStatusChange?: (status: ConnectionStatus, latencyMs?: number) => void
  ) {
    this.cleanup();

    this.unsubscribeRoom = realtimeBus.subscribeRoom(roomId, onMessage);
    if (onStatusChange) {
      this.unsubscribeStatus = realtimeBus.subscribeStatus(onStatusChange);
    }
  }

  public async sendMessage(payload: RealtimeMessagePayload): Promise<boolean> {
    realtimeBus.dispatchMessage(payload);
    return true;
  }

  public cleanup() {
    if (this.unsubscribeRoom) {
      this.unsubscribeRoom();
      this.unsubscribeRoom = null;
    }
    if (this.unsubscribeStatus) {
      this.unsubscribeStatus();
      this.unsubscribeStatus = null;
    }
  }
}

