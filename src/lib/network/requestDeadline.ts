export interface RequestDeadline {
  signal: AbortSignal;
  cleanup: () => void;
}

/**
 * Combines an optional parent abort signal with a hard request deadline.
 * Parent aborts are preserved so callers can still distinguish cancellation
 * from a timeout and rethrow abort errors.
 */
export function createRequestDeadline(
  parent: AbortSignal | undefined,
  timeoutMs: number
): RequestDeadline {
  const controller = new AbortController();

  const abortFromParent = () => controller.abort(parent?.reason);
  if (parent?.aborted) {
    controller.abort(parent.reason);
  } else {
    parent?.addEventListener('abort', abortFromParent, { once: true });
  }

  const timer = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', abortFromParent);
    },
  };
}
