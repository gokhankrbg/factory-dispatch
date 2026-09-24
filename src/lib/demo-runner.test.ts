import { afterEach, describe, expect, it, vi } from "vitest";
import { runDemoSequence, type DemoRunnerItem } from "./demo-runner";

afterEach(() => {
  vi.useRealTimers();
});

function items(n: number): DemoRunnerItem[] {
  return Array.from({ length: n }, (_, i) => ({ id: `demo-${i + 1}`, report: `Report ${i + 1}` }));
}

describe("runDemoSequence", () => {
  it("submits every item exactly once, in order, with no overlapping calls", async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;
    const order: string[] = [];

    const submit = vi.fn(async (report: string) => {
      activeCalls++;
      maxConcurrent = Math.max(maxConcurrent, activeCalls);
      order.push(report);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeCalls--;
    });

    const { promise } = runDemoSequence(items(3), { submit }, 0);
    const outcome = await promise;

    expect(submit).toHaveBeenCalledTimes(3);
    expect(order).toEqual(["Report 1", "Report 2", "Report 3"]);
    expect(maxConcurrent).toBe(1);
    expect(outcome).toEqual({ completed: 3, total: 3, stopped: false, haltedByError: false });
  });

  it("reports progress after each completed item", async () => {
    const onProgress = vi.fn();
    const submit = vi.fn(async () => {});

    await runDemoSequence(items(3), { submit, onProgress }, 0).promise;

    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3);
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3);
  });

  it("lets an in-flight request finish, then stops before starting the next one", async () => {
    let resolveFirst: (() => void) | null = null;
    const submit = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementation(async () => {});

    const { promise, controller } = runDemoSequence(items(3), { submit }, 0);

    // Let the first request start, then request a stop while it's still pending.
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.stop();
    expect(submit).toHaveBeenCalledTimes(1);

    resolveFirst!();
    const outcome = await promise;

    expect(submit).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ completed: 1, total: 3, stopped: true, haltedByError: false });
  });

  it("halts the run when a submission fails, without attempting the remaining items", async () => {
    const submit = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("upstream failed"))
      .mockResolvedValueOnce(undefined);

    const outcome = await runDemoSequence(items(3), { submit }, 0).promise;

    expect(submit).toHaveBeenCalledTimes(2);
    expect(outcome).toEqual({ completed: 1, total: 3, stopped: false, haltedByError: true });
  });

  it("finishes normally and never loops back to the start", async () => {
    const submit = vi.fn(async () => {});
    const outcome = await runDemoSequence(items(2), { submit }, 0).promise;

    expect(submit).toHaveBeenCalledTimes(2);
    expect(outcome).toEqual({ completed: 2, total: 2, stopped: false, haltedByError: false });
  });

  it("supports an explicit rerun that submits every item again from scratch", async () => {
    const submit = vi.fn(async () => {});

    const firstOutcome = await runDemoSequence(items(2), { submit }, 0).promise;
    const secondOutcome = await runDemoSequence(items(2), { submit }, 0).promise;

    expect(submit).toHaveBeenCalledTimes(4);
    expect(firstOutcome.completed).toBe(2);
    expect(secondOutcome.completed).toBe(2);
  });

  it("waits the presentation pacing (5000ms) before the next item, and no longer", async () => {
    vi.useFakeTimers();
    const submit = vi.fn(async () => {});

    const { promise } = runDemoSequence(items(2), { submit }, 5000);
    await vi.advanceTimersByTimeAsync(4999);
    expect(submit).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(submit).toHaveBeenCalledTimes(2);

    await promise;
  });

  it("waits the fast pacing (300ms) before the next item, and no longer", async () => {
    vi.useFakeTimers();
    const submit = vi.fn(async () => {});

    const { promise } = runDemoSequence(items(2), { submit }, 300);
    await vi.advanceTimersByTimeAsync(299);
    expect(submit).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(submit).toHaveBeenCalledTimes(2);

    await promise;
  });

  it("does not pause after the final item", async () => {
    vi.useFakeTimers();
    const onPauseStart = vi.fn();
    const submit = vi.fn(async () => {});

    const { promise } = runDemoSequence(items(2), { submit, onPauseStart }, 5000);
    await vi.runAllTimersAsync();
    const outcome = await promise;

    expect(onPauseStart).toHaveBeenCalledTimes(1); // only between item 1 and item 2, never after item 2
    expect(outcome.completed).toBe(2);
  });

  it("stopping during the display pause cancels the pending next request immediately", async () => {
    vi.useFakeTimers();
    const submit = vi.fn(async () => {});

    const { promise, controller } = runDemoSequence(items(3), { submit }, 5000);
    await vi.advanceTimersByTimeAsync(0); // let the first submit resolve and the pause begin
    expect(submit).toHaveBeenCalledTimes(1);

    controller.stop();
    await vi.advanceTimersByTimeAsync(0); // no further real time needs to pass

    const outcome = await promise;
    expect(submit).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ completed: 1, total: 3, stopped: true, haltedByError: false });
  });

  it("pacing never touches the data each submit call records — only the delay between calls", async () => {
    vi.useFakeTimers();
    const recordedLatencies: number[] = [];
    const submit = vi.fn(async () => {
      recordedLatencies.push(250); // stands in for a real, measured API latency
    });

    const { promise } = runDemoSequence(items(2), { submit }, 5000);
    await vi.runAllTimersAsync();
    await promise;

    expect(recordedLatencies).toEqual([250, 250]);
  });
});
