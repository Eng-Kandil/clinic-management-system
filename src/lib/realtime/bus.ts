import { EventEmitter } from "node:events";

const bus = new EventEmitter();
bus.setMaxListeners(0); // allow unlimited listeners for SSE clients

export function publish(room: string, event: string, data: unknown): void {
  bus.emit(room, { event, data });
}

export function subscribe(
  room: string,
  onMsg: (m: { event: string; data: unknown }) => void
): () => void {
  bus.on(room, onMsg);
  return () => bus.off(room, onMsg);
}
