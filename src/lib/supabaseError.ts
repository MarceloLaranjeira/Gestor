export const getSupabaseErrorMessage = (error: unknown, fallback = "Tente novamente.") => {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null) {
    const fields = ["message", "error_description", "details", "hint", "code"] as const;

    for (const field of fields) {
      const value = (error as Record<string, unknown>)[field];
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  if (typeof error === "string" && error.trim()) return error;

  return fallback;
};

/**
 * Extracts the real error message from a `supabase.functions.invoke` failure.
 *
 * When an Edge Function returns a non-2xx status, supabase-js resolves with a
 * `FunctionsHttpError` whose `.message` is the generic "Edge Function returned a
 * non-2xx status code". The message the function actually sent lives in the
 * response body, reachable via `error.context` (a `Response`). Without reading
 * it, every failure surfaces the same useless generic text.
 */
export const getFunctionErrorMessage = async (
  error: unknown,
  fallback = "Tente novamente.",
): Promise<string> => {
  const context = (error as { context?: unknown } | null)?.context;

  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      const message = body?.error ?? body?.message;
      if (typeof message === "string" && message.trim()) return message;
    } catch {
      // Body was not JSON or was already consumed.
    }
    // It IS a function error, but we couldn't extract a useful body message.
    // Return the caller's friendly fallback instead of supabase's opaque
    // "Edge Function returned a non-2xx status code".
    return fallback;
  }

  return getSupabaseErrorMessage(error, fallback);
};
