#!/usr/bin/env bun
import { runSeed } from "./commands";

const result = runSeed(process.argv.slice(2));
if (result.command === "status") {
  console.log(
    JSON.stringify(
      {
        status: result.status ?? "unknown",
        code: result.code,
        message: result.message,
        ...(result.detail ?? {}),
      },
      null,
      2,
    ),
  );
} else if (result.code === 0) {
  const value = result.noop ? "no-op" : "ok";
  const sha = result.manifestSha256
    ? ` manifest_sha256=${result.manifestSha256}`
    : "";
  console.log(`seed ${result.command}: ${value}.${sha}`);
} else {
  console.error(`seed ${result.command}: rechazado (${result.code}). ${result.message}`);
}
process.exitCode = result.code;
