import { test, expect } from "bun:test";

test("CI negative probe intentionally fails", () => {
  expect("probe").toBe("must-fail");
});
