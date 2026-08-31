export class AgentEventQueue<T> {
  private values: T[] = [];
  private draining = false;

  constructor(private readonly consume: (value: T) => void) {}

  push(value: T) {
    this.values.push(value);
    this.drain();
  }

  clear() {
    this.values = [];
  }

  private drain() {
    if (this.draining) return;
    this.draining = true;
    queueMicrotask(() => {
      try {
        for (const value of this.values.splice(0)) this.consume(value);
      } finally {
        this.draining = false;
        if (this.values.length) this.drain();
      }
    });
  }
}
