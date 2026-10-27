import { test, expect } from "bun:test";

test("CI negative probe intentionally still fails", () => {
  expect(2).toBe(3);
});
