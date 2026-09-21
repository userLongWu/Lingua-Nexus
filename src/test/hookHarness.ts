import type { ReactElement, ReactNode } from "react";

// A small hook adapter for Node-only interaction tests. No browser or DOM dependency:
// invoke the rendered component's handlers, then explicitly render state changes.
export function createHookHarness(options: { replayUpdates?: boolean } = {}) {
  const slots: unknown[] = [];
  let index = 0;
  const effects: (() => void)[] = [];
  const replays: (() => void)[] = [];
  const hook = {
    useState<T>(initial: T | (() => T)) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = typeof initial === "function" ? (initial as () => T)() : initial;
      return [slots[slot], (update: T | ((current: T) => T)) => {
        const previous = slots[slot] as T;
        if (typeof update === "function" && options.replayUpdates) {
          replays.push(() => { slots[slot] = (update as (current: T) => T)(previous); });
        }
        slots[slot] = typeof update === "function" ? (update as (current: T) => T)(previous) : update;
      }] as const;
    },
    useRef<T>(initial: T) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot] as { current: T };
    },
    useMemo<T>(compute: () => T) { return compute(); },
    useEffect(effect: () => void | (() => void), deps?: unknown[]) {
      const slot = index++;
      const previous = slots[slot] as { deps?: unknown[]; cleanup?: () => void } | undefined;
      if (!previous || !deps || deps.some((dep, i) => !Object.is(dep, previous.deps?.[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[slot] = { deps, cleanup: effect() };
        });
      }
    },
  };
  return {
    hook,
    render(component: () => ReactElement) {
      index = 0;
      const tree = component();
      effects.splice(0).forEach((effect) => effect());
      return tree;
    },
    // React can replay a functional updater after the event handler has returned.
    replayUpdates() {
      replays.splice(0).forEach((replay) => replay());
    },
    reset() {
      slots.length = 0;
      effects.length = 0;
      replays.length = 0;
      index = 0;
    },
  };
}

export function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (typeof node !== "object" || node === null || !("props" in node)) return [];
  const element = node as ReactElement<Record<string, unknown>>;
  return [element, ...elements(element.props.children as ReactNode)];
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export async function flushPromises() {
  // then/catch/finally chains in the page's history loader.
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}
