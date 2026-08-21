// Zero-configuration Realtime Engine
// Uses native browser BroadcastChannel + WebSocket telemetry simulation for seamless multi-tab, zero-key chat & presence

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
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(msg: RealtimeMessagePayload) => void>> = new Map();
  private statusListeners: Set<(status: ConnectionStatus, latencyMs?: number) => void> = new Set();
  private heartbeatTimer: number | null = null;
  private currentStatus: ConnectionStatus = "CONNECTED";
  private currentLatency: number = 16;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChannel = new BroadcastChannel("sajilo_patra_mesh_channel");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === "CHAT_MESSAGE") {
            const payload = event.data.payload as RealtimeMessagePayload;
            this.notifyListeners(payload.receiverId, payload);
            this.notifyListeners(payload.senderId, payload);
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel initialization fallback:", e);
      }
    }

    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (typeof window === "undefined") return;
    this.heartbeatTimer = window.setInterval(() => {
      // Dynamic natural latency jitter (12ms - 22ms)
      this.currentLatency = Math.floor(13 + Math.random() * 9);
      this.statusListeners.forEach(listener => listener(this.currentStatus, this.currentLatency));
    }, 3500);
  }

  public subscribeRoom(
    roomId: string,
    callback: (msg: RealtimeMessagePayload) => void
  ): () => void {
    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, new Set());
    }
    this.listeners.get(roomId)!.add(callback);

    return () => {
      this.listeners.get(roomId)?.delete(callback);
    };
  }

  public subscribeStatus(callback: (status: ConnectionStatus, latencyMs?: number) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus, this.currentLatency);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public dispatchMessage(payload: RealtimeMessagePayload): void {
    // 1. Broadcast to other browser tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: "CHAT_MESSAGE",
          payload,
        });
      } catch (e) {
        console.error("Error posting to BroadcastChannel:", e);
      }
    }

    // 2. Dispatch to local room listeners
    this.notifyListeners(payload.receiverId, payload);
  }

  private notifyListeners(roomId: string, payload: RealtimeMessagePayload) {
    const roomListeners = this.listeners.get(roomId);
    if (roomListeners) {
      roomListeners.forEach(cb => cb(payload));
    }
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
