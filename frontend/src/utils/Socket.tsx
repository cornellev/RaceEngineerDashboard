type MessageHandler = (data: any) => void;
export interface SocketData {
  seq: number;
  global_ts: number;
  power: {
    ts: number;
    current: number;
    voltage: number;
  };
  steering: {
    ts: number;
    brake_pressure: number;
    turn_angle: number;
  };
  rpm_front: {
    ts: number;
    rpm_left: number;
    rpm_right: number;
  };
  rpm_back: {
    ts: number;
    rpm_left: number;
    rpm_right: number;
  };
  gps: {
    ts: number;
    lat: number;
    long: number;
    heading: number;
    speed: number;
  };
  motor: {
    ts: number;
    rpm: number;
    throttle: number;
  };
  filtered: {
    speed: number;
  };
}

class SocketService {
  private static instance: SocketService;
  private socket: WebSocket | null = null;
  private url: string = `ws://127.0.0.1:8000/ws/stream`; // Replace with env variable URL
  private handlers: Set<MessageHandler> = new Set();
  private reconnectInterval: number = 5000;
  private data: SocketData[] = [];
  private dataTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private readonly DATA_TIMEOUT_MS = 5000;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("WebSocket Connected");
    };

    this.socket.onmessage = (event: MessageEvent) => {
      const envelope = JSON.parse(event.data);
      const data = envelope.data;
      this.data = [...this.data.slice(-2000), data];
      this.handlers.forEach((handler) => handler(data));
      this.resetDataTimeout();
    };

    this.socket.onclose = () => {
      console.log("WebSocket Disconnected. Reconnecting...");
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      this.socket?.close();
    };
  }

  private resetDataTimeout(): void {
    if (this.dataTimeoutHandle) clearTimeout(this.dataTimeoutHandle);
    this.dataTimeoutHandle = setTimeout(() => {
        console.warn(`[ROS] Error: no data received for >${this.DATA_TIMEOUT_MS / 1000}s. possible reasons:` + 
            `\n- ros publisher is not publishing` + 
            `\n- tailscale connection is not working properly` +
            `\n- you are not using the correct fastdds discovery server ip address`
        );
    }, this.DATA_TIMEOUT_MS);
  }

  public subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    // Return unsubscribe function
    return () => this.handlers.delete(handler);
  }

  public getData(): SocketData[] {
    return this.data;
  }

  public getLatestData(): SocketData | null {
    return this.data.length > 0 ? this.data[this.data.length - 1] : null;
  }

  public send(data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error("Socket not connected");
    }
  }

  public disconnect(): void {
    this.socket?.close();
  }
}

export default SocketService.getInstance();
