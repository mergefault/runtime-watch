import { mkdir, writeFile } from "node:fs/promises";

const results = {
  generatedAt: new Date().toISOString(),
  runtime: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch
  },
  checks: {}
};

async function run(name, fn) {
  const startedAt = performance.now();

  try {
    await fn();

    results.checks[name] = {
      status: "pass",
      durationMs: Math.round(performance.now() - startedAt)
    };
  } catch (error) {
    results.checks[name] = {
      status: "fail",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

await run("abort-controller", async () => {
  const controller = new AbortController();
  controller.abort();

  if (!controller.signal.aborted) {
    throw new Error("AbortSignal did not enter aborted state");
  }
});

await run("promise-microtask-order", async () => {
  const order = [];

  Promise.resolve().then(() => order.push("promise"));
  queueMicrotask(() => order.push("microtask"));

  await new Promise(resolve => setImmediate(resolve));

  if (order.join(",") !== "promise,microtask") {
    throw new Error(`Unexpected order: ${order.join(",")}`);
  }
});

await run("structured-clone", async () => {
  const original = {
    nested: {
      value: 42
    }
  };

  const cloned = structuredClone(original);

  if (
    cloned === original ||
    cloned.nested === original.nested ||
    cloned.nested.value !== 42
  ) {
    throw new Error("Unexpected structuredClone behavior");
  }
});

await mkdir("results", { recursive: true });

await writeFile(
  "results/latest.json",
  JSON.stringify(results, null, 2) + "\n"
);

console.log(JSON.stringify(results, null, 2));
