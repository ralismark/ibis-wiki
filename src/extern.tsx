import { useEffect, useState, useSyncExternalStore } from "react";

export interface Extern<T> {
  subscribe(onStoreChange: () => void): () => void,
  getSnapshot(): T,
}

export class Feed {
  private listeners: Map<Symbol, () => void> = new Map();

  subscribe(onStoreChange: () => void) {
    const key = Symbol();
    this.listeners.set(key, onStoreChange);
    return () => {
      this.listeners.delete(key);
    };
  }

  signal() {
    for (let v of this.listeners.values()) {
      try {
        v();
      } catch(e) {
        // stop propagation of error
        console.error("Subscriber threw exception", e);
      }
    }
  }
}

export abstract class ExternBase<T> extends Feed implements Extern<T> {
  abstract getSnapshot(): T;
}

export function useExtern<T>(ext: Extern<T>): T {
  return useSyncExternalStore(f => ext.subscribe(f), () => ext.getSnapshot());
}

export function useAsync<T>(promise: Promise<T>, fallback: T): T {
  const [val, setVal] = useState<T>(fallback);
  useEffect(() => {
    promise.then(setVal);
  }, [promise]);
  return val;
}

// ----------------------------------------------------------------------------

export class ExternState<T> extends ExternBase<T> {
  private value: T;

  constructor(value: T) {
    super();
    this.value = value;
  }

  getSnapshot(): T {
    return this.value;
  }

  set(value: T) {
    this.value = value;
    this.signal();
  }
}

export class ExternMemo<T extends {}> extends ExternBase<T> {
  private readonly fetch: () => T;
  private cache: T | undefined;

  constructor(fetch: () => T) {
    super();
    this.fetch = fetch;
    this.cache = undefined;
  }

  getSnapshot(): T {
    if (this.cache === undefined) {
      this.cache = this.fetch();
    }
    return this.cache;
  }

  signal() {
    this.cache = undefined;
    super.signal();
  }
}