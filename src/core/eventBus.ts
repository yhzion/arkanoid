type EventHandler = (...args: any[]) => void;

// Simple event bus for decoupled communication
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  emit(event: string, ...args: any[]): void {
    const set = this.handlers.get(event);
    if (set) {
      for (const handler of set) {
        handler(...args);
      }
    }
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  clear(): void {
    this.handlers.clear();
  }
}

// Singleton for global game events
export const gameEvents = new EventBus();