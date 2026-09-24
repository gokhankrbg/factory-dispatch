// Pure, framework-agnostic sequencing for the bounded live demo. Knows
// nothing about React or fetch — it just awaits one `submit` call at a
// time, in order, with a configurable display pause between them, and can
// be stopped or halted by a failure. This makes the tricky part (no
// overlapping calls, stop mid-flight, stop mid-pause, halt on failure)
// directly unit-testable with a mocked `submit` and no DOM.

export interface DemoRunnerItem {
  id: string;
  report: string;
}

export interface DemoRunnerCallbacks {
  /** Perform one analysis. Resolve on success, reject on failure — never invoked concurrently. */
  submit: (report: string, item: DemoRunnerItem) => Promise<void>;
  onProgress?: (completed: number, total: number) => void;
  /** Fired right before the display-only pause starts (never after the last item). */
  onPauseStart?: () => void;
}

export interface DemoRunOutcome {
  completed: number;
  total: number;
  stopped: boolean;
  haltedByError: boolean;
}

export interface DemoController {
  stop: () => void;
}

export interface DemoRun {
  promise: Promise<DemoRunOutcome>;
  controller: DemoController;
}

export function runDemoSequence(
  items: DemoRunnerItem[],
  callbacks: DemoRunnerCallbacks,
  pauseMs: number,
): DemoRun {
  let stopped = false;
  /** Set only while a display pause is in flight; calling it cancels that pause immediately. */
  let cancelPause: (() => void) | null = null;

  const controller: DemoController = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      cancelPause?.();
    },
  };

  function pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        cancelPause = null;
        resolve();
      }, ms);
      cancelPause = () => {
        clearTimeout(timeoutId);
        cancelPause = null;
        resolve();
      };
    });
  }

  const promise = (async (): Promise<DemoRunOutcome> => {
    let completed = 0;

    for (let i = 0; i < items.length; i++) {
      if (stopped) break;

      // A rejected submit is reported to the caller (e.g. a real result
      // arriving and being displayed) before this promise settles — the
      // sequencer itself adds no delay before or after that.
      try {
        await callbacks.submit(items[i].report, items[i]);
      } catch {
        return { completed, total: items.length, stopped, haltedByError: true };
      }

      completed++;
      callbacks.onProgress?.(completed, items.length);

      if (stopped) break;
      if (i < items.length - 1) {
        callbacks.onPauseStart?.();
        await pause(pauseMs);
        if (stopped) break;
      }
    }

    return { completed, total: items.length, stopped, haltedByError: false };
  })();

  return { promise, controller };
}
