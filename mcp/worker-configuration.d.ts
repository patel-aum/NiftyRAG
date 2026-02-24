interface Env {
  // Add bindings (e.g. KV, secrets) here when needed
}

/** Cloudflare Workers execution context (waitUntil, passThroughOnException) */
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
