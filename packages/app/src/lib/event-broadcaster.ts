// Global event broadcaster for SSE connections
export class EventBroadcaster {
  private connections = new Map<string, Map<string, ReadableStreamDefaultController<Uint8Array>>>();
  private static instance: EventBroadcaster;

  static getInstance(): EventBroadcaster {
    if (!EventBroadcaster.instance) {
      EventBroadcaster.instance = new EventBroadcaster();
    }
    return EventBroadcaster.instance;
  }

  addConnection(gameId: string, connectionId: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    if (!this.connections.has(gameId)) {
      this.connections.set(gameId, new Map());
    }
    this.connections.get(gameId)!.set(connectionId, controller);
  }

  removeConnection(gameId: string, connectionId: string): void {
    const gameConnections = this.connections.get(gameId);
    if (gameConnections) {
      const controller = gameConnections.get(connectionId);
      if (controller) {
        try {
          controller.close();
        } catch (error) {
          // Controller already closed
        }
      }
      gameConnections.delete(connectionId);
      if (gameConnections.size === 0) {
        this.connections.delete(gameId);
      }
    }
  }

  broadcast(gameId: string, event: { type: string; data: unknown }): void {
    const gameConnections = this.connections.get(gameId);
    if (!gameConnections) return;

    const eventId = Date.now().toString();
    const eventData = `id: ${eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    const chunk = new TextEncoder().encode(eventData);

    // Send to all connections, removing failed ones
    const connectionsToRemove: string[] = [];
    
    for (const [connectionId, controller] of gameConnections.entries()) {
      try {
        controller.enqueue(chunk);
      } catch (error) {
        console.error(`Failed to send event to connection ${connectionId}:`, error);
        connectionsToRemove.push(connectionId);
      }
    }

    // Clean up failed connections
    connectionsToRemove.forEach(id => this.removeConnection(gameId, id));
  }

  getConnectionCount(gameId: string): number {
    return this.connections.get(gameId)?.size || 0;
  }
}

// Export broadcaster instance for use in API routes
export const broadcaster = EventBroadcaster.getInstance();