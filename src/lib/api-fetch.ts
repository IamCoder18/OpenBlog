/**
 * Client-side fetch wrapper that extracts error messages from API responses.
 * Returns the parsed data on success or throws an Error with the server's
 * error message on failure.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);

  if (res.ok) {
    // 204 No Content
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  let message: string;
  try {
    const body = await res.json();
    message = body?.error || body?.message;
  } catch {
    message = undefined as unknown as string;
  }

  if (!message) {
    switch (res.status) {
      case 400:
        message = "Invalid request. Please check your input.";
        break;
      case 401:
        message = "Your session has expired. Please sign in again.";
        break;
      case 403:
        message = "You don't have permission to perform this action.";
        break;
      case 404:
        message = "The requested resource was not found.";
        break;
      case 409:
        message = "This conflicts with an existing record.";
        break;
      case 429:
        message = "Too many requests. Please wait a moment and try again.";
        break;
      default:
        message = `Something went wrong (error ${res.status}). Please try again.`;
    }
  }

  throw new Error(message);
}
