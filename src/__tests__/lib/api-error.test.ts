import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError, apiHandler } from "@/lib/api-error";

describe("ApiError", () => {
  it("can be instantiated with statusCode and message", () => {
    const err = new ApiError(400, "Bad request");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Bad request");
  });

  it("has name 'ApiError'", () => {
    const err = new ApiError(500, "Server error");
    expect(err.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    const err = new ApiError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("apiHandler", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("returns the response from successful handler", async () => {
    const handler = async () => {
      return new Response("success", { status: 200 });
    };
    const wrapped = apiHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("success");
  });

  it("forwards ApiError with 400 status", async () => {
    const handler = async () => {
      throw new ApiError(400, "Bad input");
    };
    const wrapped = apiHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Bad input");
  });

  it("forwards ApiError with 404 status", async () => {
    const handler = async () => {
      throw new ApiError(404, "Not found");
    };
    const wrapped = apiHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Not found");
  });

  it("handles Prisma P2002 error (unique constraint)", async () => {
    const handler = async () => {
      throw {
        code: "P2002",
        meta: { target: ["email"] },
      };
    };
    const wrapped = apiHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("A record with this email already exists.");
  });

  it("handles Prisma P2002 error without meta target", async () => {
    const handler = async () => {
      throw {
        code: "P2002",
      };
    };
    const wrapped = apiHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("A record with this field already exists.");
  });

  it("handles Prisma P2025 error (record not found)", async () => {
    const handler = async () => {
      throw { code: "P2025" };
    };
    const wrapped = apiHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("The requested resource was not found.");
  });

  it("handles Prisma P2003 error (foreign key)", async () => {
    const handler = async () => {
      throw { code: "P2003" };
    };
    const wrapped = apiHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      "This operation references a record that does not exist."
    );
  });

  it("handles unexpected errors with 500 status", async () => {
    const handler = async () => {
      throw new Error("Something went wrong");
    };
    const wrapped = apiHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe(
      "An unexpected error occurred. Please try again later."
    );
  });

  it("logs unexpected errors to stderr", async () => {
    const handler = async () => {
      throw new Error("Unexpected");
    };
    const wrapped = apiHandler(handler);
    await wrapped();
    expect(stderrSpy).toHaveBeenCalledWith("[API Error] Error: Unexpected\n");
  });
});
