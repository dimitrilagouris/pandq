import { useState, useRef, useCallback } from 'react';

const MAX_HISTORY_DEPTH = 50;
const DEFAULT_DEBOUNCE_MS = 500;

interface UndoableStateReturn<T> {
  /** Current state value. */
  state: T;
  /** Update state with debounced history snapshot (for text input). */
  setState: (next: T | ((prev: T) => T)) => void;
  /** Update state with immediate history snapshot (for discrete actions). */
  setStateImmediate: (next: T | ((prev: T) => T)) => void;
  /** Revert to the previous state snapshot. */
  undo: () => void;
  /** Re-apply the last undone state snapshot. */
  redo: () => void;
  /** Whether undo is available. */
  canUndo: boolean;
  /** Whether redo is available. */
  canRedo: boolean;
  /** Reset all history and set a new baseline state. */
  resetHistory: (newState: T) => void;
}

/**
 * Generic hook that wraps a state value with undo/redo history stacks.
 *
 * Uses a Memento (snapshot-based) pattern: each history entry is a full
 * copy of the state. Supports debounced snapshots for text input so
 * rapid keystrokes collapse into a single undo entry.
 */
export function useUndoableState<T>(
  initialState: T,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): UndoableStateReturn<T> {
  const [present, setPresent] = useState<T>(initialState);

  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  /* Tracks whether we are mid-debounce, and the state before the burst began. */
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preDebounceStateRef = useRef<T | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  /** Sync the boolean flags with the actual stack lengths. */
  const syncFlags = useCallback((): void => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  /** Push a snapshot onto the past stack, respecting depth limit. */
  const pushToPast = useCallback((snapshot: T): void => {
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY_DEPTH - 1)), snapshot];
  }, []);

  /** Flush any pending debounce — commits the pre-debounce snapshot to history. */
  const flushDebounce = useCallback((): void => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (preDebounceStateRef.current !== null) {
      pushToPast(preDebounceStateRef.current);
      preDebounceStateRef.current = null;
    }
  }, [pushToPast]);

  /**
   * Update state with a debounced history snapshot.
   * Rapid calls within `debounceMs` collapse into a single undo entry.
   */
  const setState = useCallback((next: T | ((prev: T) => T)): void => {
    setPresent(prev => {
      const nextVal = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;

      /* First call in this debounce burst — capture the pre-edit state. */
      if (preDebounceStateRef.current === null) {
        preDebounceStateRef.current = prev;
      }

      /* Clear previous timer and start a new one. */
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        /* Timer fired: commit the pre-debounce snapshot to the past stack. */
        if (preDebounceStateRef.current !== null) {
          pushToPast(preDebounceStateRef.current);
          preDebounceStateRef.current = null;
        }
        debounceTimerRef.current = null;
        futureRef.current = [];
        syncFlags();
      }, debounceMs);

      /* Clear redo on any new change. */
      futureRef.current = [];
      syncFlags();

      return nextVal;
    });
  }, [debounceMs, pushToPast, syncFlags]);

  /**
   * Update state with an immediate history snapshot.
   * Use for discrete actions (add item, toggle, client change).
   */
  const setStateImmediate = useCallback((next: T | ((prev: T) => T)): void => {
    /* Flush any pending debounce first so the timeline stays correct. */
    flushDebounce();

    setPresent(prev => {
      const nextVal = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
      pushToPast(prev);
      futureRef.current = [];
      syncFlags();
      return nextVal;
    });
  }, [flushDebounce, pushToPast, syncFlags]);

  /** Revert to the previous state snapshot. */
  const undo = useCallback((): void => {
    flushDebounce();

    setPresent(prev => {
      if (pastRef.current.length === 0) {
        return prev;
      }
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, prev];
      syncFlags();
      return previous;
    });
  }, [flushDebounce, syncFlags]);

  /** Re-apply the last undone state snapshot. */
  const redo = useCallback((): void => {
    flushDebounce();

    setPresent(prev => {
      if (futureRef.current.length === 0) {
        return prev;
      }
      const next = futureRef.current[futureRef.current.length - 1];
      futureRef.current = futureRef.current.slice(0, -1);
      pushToPast(prev);
      syncFlags();
      return next;
    });
  }, [flushDebounce, pushToPast, syncFlags]);

  /** Reset all history and set a new baseline state (e.g. after loading an invoice). */
  const resetHistory = useCallback((newState: T): void => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    preDebounceStateRef.current = null;
    pastRef.current = [];
    futureRef.current = [];
    setPresent(newState);
    syncFlags();
  }, [syncFlags]);

  return {
    state: present,
    setState,
    setStateImmediate,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  };
}
