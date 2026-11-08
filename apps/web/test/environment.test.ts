import { expect, test } from "bun:test";
import { isLocalEnvironment } from "../src/environment";

test("loopback hosts are local", () => {
  for (const host of [
    "localhost",
    "localhost.",
    "app.localhost",
    "127.0.0.1",
    "::1",
    "[::1]",
  ]) {
    expect(isLocalEnvironment(host)).toBe(true);
  }
});

test("remote or empty hosts are not local", () => {
  for (const host of [
    "test.myfinanzas.pp.ua",
    "myfinanzas.pp.ua",
    "192.168.1.10",
    "0.0.0.0",
    "",
  ]) {
    expect(isLocalEnvironment(host)).toBe(false);
  }
});
