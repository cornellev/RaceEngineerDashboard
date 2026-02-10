type MessageHandler = (data: any) => void;

class SocketService {
  private static instance: SocketService;
  private socket: WebSocket | null = null;
  private url: string = "ws://localhost:8000/ws/stream"; // Replace with your URL
  private handlers: Set<MessageHandler> = new Set();
  private reconnectInterval: number = 5000;

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
      const data = JSON.parse(event.data);
      this.handlers.forEach((handler) => handler(data));
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

  public subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    // Return unsubscribe function
    return () => this.handlers.delete(handler);
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
