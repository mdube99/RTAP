import { describe, it, expect, vi } from "vitest";

vi.useFakeTimers();
const ip = "1.1.1.1";
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-real-ip": ip })),
}));

const { rateLimit } = await import("@/lib/rateLimit");

describe("rateLimit util", () => {
  it("limits repeated calls and resets after interval", async () => {
    const config = { interval: 1000, uniqueTokenPerInterval: 1 };

    const first = await rateLimit(config);
    expect(first.success).toBe(true);

    const second = await rateLimit(config);
    expect(second.success).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);

    const third = await rateLimit(config);
    expect(third.success).toBe(true);
  });
});
