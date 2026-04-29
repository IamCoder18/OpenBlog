import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "../../lib/api-fetch";

describe("apiFetch", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockReset();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns data on successful 200 response", async () => {
    const mockData = { id: 1, name: "Test" };
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await apiFetch<typeof mockData>("/api/test");
    expect(result).toEqual(mockData);
  });

  it("returns undefined on 204 No Content", async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await apiFetch("/api/test");
    expect(result).toBeUndefined();
  });

  it("throws Error with body error message on 400", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: "Bad input" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("Bad input");
  });

  it("uses default message when 400 has no body message", async () => {
    fetchSpy.mockResolvedValue(new Response("Bad Request", { status: 400 }));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Invalid request. Please check your input."
    );
  });

  it("throws Error with session expired message on 401", async () => {
    fetchSpy.mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Your session has expired. Please sign in again."
    );
  });

  it("throws Error with permission denied message on 403", async () => {
    fetchSpy.mockResolvedValue(new Response("Forbidden", { status: 403 }));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "You don't have permission to perform this action."
    );
  });

  it("throws Error with not found message on 404", async () => {
    fetchSpy.mockResolvedValue(new Response("Not Found", { status: 404 }));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "The requested resource was not found."
    );
  });

  it("throws Error with conflict message on 409", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: "Conflict" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("Conflict");
  });

  it("uses default conflict message on 409 when no body message", async () => {
    fetchSpy.mockResolvedValue(new Response("Conflict", { status: 409 }));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "This conflicts with an existing record."
    );
  });

  it("throws Error with rate limit message on 429", async () => {
    fetchSpy.mockResolvedValue(
      new Response("Too Many Requests", { status: 429 })
    );

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Too many requests. Please wait a moment and try again."
    );
  });

  it("throws Error with status in default message for other status codes", async () => {
    fetchSpy.mockResolvedValue(new Response("Server Error", { status: 500 }));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Something went wrong (error 500). Please try again."
    );
  });

  it("uses body message field when error field is not present", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ message: "Custom message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("Custom message");
  });

  it("passes options to fetch", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiFetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "test" }),
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });
});
