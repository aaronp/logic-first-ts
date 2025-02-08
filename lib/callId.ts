/**
 * used for unique incremental call Ids
 */
export class AtomicCounter {
    private static instance: AtomicCounter;
    private buffer: SharedArrayBuffer;
    private view: Int32Array;
  
    private constructor() {
      this.buffer = new SharedArrayBuffer(4); // Allocate 4 bytes for an Int32
      this.view = new Int32Array(this.buffer);
    }
  
    static getInstance(): AtomicCounter {
      if (!AtomicCounter.instance) {
        AtomicCounter.instance = new AtomicCounter();
      }
      return AtomicCounter.instance;
    }
  
    increment(): number {
      return Atomics.add(this.view, 0, 1) + 1;
    }
  
    decrement(): number {
      return Atomics.sub(this.view, 0, 1) - 1;
    }
  
    get(): number {
      return Atomics.load(this.view, 0);
    }
  
    reset(): void {
      Atomics.store(this.view, 0, 0);
    }
  }