import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequestDeadline } from './requestDeadline';

describe('createRequestDeadline', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts with a timeout reason when the deadline expires', () => {
    vi.useFakeTimers();
    const deadline = createRequestDeadline(undefined, 1000);

    vi.advanceTimersByTime(1000);

    expect(deadline.signal.aborted).toBe(true);
    expect((deadline.signal.reason as DOMException).name).toBe('TimeoutError');
    deadline.cleanup();
  });

  it('propagates parent aborts and stops its timer after cleanup', () => {
    vi.useFakeTimers();
    const parent = new AbortController();
    const deadline = createRequestDeadline(parent.signal, 1000);

    parent.abort(new DOMException('Cancelled', 'AbortError'));

    expect(deadline.signal.aborted).toBe(true);
    expect((deadline.signal.reason as DOMException).name).toBe('AbortError');

    deadline.cleanup();
    vi.advanceTimersByTime(2000);
    expect((deadline.signal.reason as DOMException).name).toBe('AbortError');
  });
});
