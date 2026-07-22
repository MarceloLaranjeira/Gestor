import { describe, it, expect } from "vitest";
import { getSupabaseErrorMessage, getFunctionErrorMessage } from "./supabaseError";

describe("getSupabaseErrorMessage", () => {
  it("returns the Error message", () => {
    expect(getSupabaseErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("reads message from a plain object", () => {
    expect(getSupabaseErrorMessage({ message: "detalhe" })).toBe("detalhe");
  });

  it("falls back when there is nothing useful", () => {
    expect(getSupabaseErrorMessage(null, "padrão")).toBe("padrão");
  });
});

describe("getFunctionErrorMessage", () => {
  it("extracts the error field from an edge function's non-2xx JSON body", async () => {
    // Reproduces a supabase FunctionsHttpError: the useful message lives in
    // error.context (a Response), NOT in error.message.
    const error = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: new Response(
        JSON.stringify({ error: "Unable to validate email address: invalid format" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    };

    const msg = await getFunctionErrorMessage(error, "Erro ao criar usuário");
    expect(msg).toBe("Unable to validate email address: invalid format");
  });

  it("falls back to the provided default when the body has no message", async () => {
    const error = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: new Response("not json", { status: 500 }),
    };

    const msg = await getFunctionErrorMessage(error, "Erro ao criar usuário");
    expect(msg).toBe("Erro ao criar usuário");
  });

  it("handles non-function errors like a normal Error", async () => {
    expect(await getFunctionErrorMessage(new Error("rede caiu"), "fallback")).toBe("rede caiu");
  });
});
