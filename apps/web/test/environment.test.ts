import { expect, test } from "bun:test";
import { environmentLabel, isLocalEnvironment } from "../src/environment";

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
    expect(environmentLabel(host)).toBe("Entorno local");
  }
});

test("TEST shows its environment label", () => {
  expect(isLocalEnvironment("test.myfinanzas.pp.ua")).toBe(false);
  expect(environmentLabel("test.myfinanzas.pp.ua")).toBe("Entorno TEST");
});

test("unknown or production hosts have no local label", () => {
  for (const host of [
    "myfinanzas.pp.ua",
    "192.168.1.10",
    "0.0.0.0",
    "",
  ]) {
    expect(isLocalEnvironment(host)).toBe(false);
    expect(environmentLabel(host)).toBeNull();
  }
});
