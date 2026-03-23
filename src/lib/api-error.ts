import { NextResponse } from "next/server";

/**
 * Wraps an API route handler with centralized error handling.
 * - Intentional ApiError instances are forwarded as-is.
 * - Prisma known request errors become 400 with specific message.
 * - All other unexpected errors become 500 with a generic message
 *   (no internal details leak to the client).
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.statusCode }
        );
      }

      // Prisma known request errors (constraint violations, etc.)
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        typeof (err as Record<string, unknown>).code === "string"
      ) {
        const code = (err as { code: string }).code;
        const meta = (err as { meta?: unknown }).meta;

        // Unique constraint violation
        if (code === "P2002") {
          const target =
            meta && typeof meta === "object" && "target" in meta
              ? (meta as { target: string[] }).target?.[0]
              : "field";
          return NextResponse.json(
            {
              error: `A record with this ${target ?? "value"} already exists.`,
            },
            { status: 409 }
          );
        }

        // Record not found
        if (code === "P2025") {
          return NextResponse.json(
            { error: "The requested resource was not found." },
            { status: 404 }
          );
        }

        // Foreign key constraint
        if (code === "P2003") {
          return NextResponse.json(
            {
              error: "This operation references a record that does not exist.",
            },
            { status: 400 }
          );
        }
      }

      // Truly unexpected error -- log server-side, return generic message
      process.stderr.write(`[API Error] ${String(err)}\n`);

      return NextResponse.json(
        { error: "An unexpected error occurred. Please try again later." },
        { status: 500 }
      );
    }
  };
}
