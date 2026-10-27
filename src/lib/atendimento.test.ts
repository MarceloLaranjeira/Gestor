import { describe, expect, it } from "vitest";
import {
  buildInscricaoLink,
  buildWhatsAppShareUrl,
  calcularIdade,
  diasDeEspera,
  inscricaoSchema,
  isValidCpf,
  maskCpf,
  maskPhone,
  ordenarFila,
  toInscricaoRpc,
} from "./atendimento";

const base = {
  especialidade: "neuropsicologia",
  nome: "Maria Clara Souza",
  data_nascimento: "2019-03-10",
  responsavel_nome: "Ana Souza",
  telefone: "(92) 99123-4567",
  possui_laudo: "nao" as const,
  motivo: "Suspeita de TEA",
};

describe("isValidCpf", () => {
  it("aceita CPF com dígitos verificadores corretos", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
  });

  it("rejeita dígito verificador errado, sequência repetida e tamanho errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});

describe("máscaras", () => {
  it("formata CPF e telefone celular", () => {
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
    expect(maskPhone("92991234567")).toBe("(92) 99123-4567");
    expect(maskPhone("9233334444")).toBe("(92) 3333-4444");
  });
});

describe("calcularIdade", () => {
  it("considera se o aniversário já passou no ano", () => {
    const ref = new Date(2026, 9, 27);
    expect(calcularIdade("2019-10-27", ref)).toBe(7);
    expect(calcularIdade("2019-10-28", ref)).toBe(6);
    expect(calcularIdade(null, ref)).toBeNull();
  });
});

describe("inscricaoSchema", () => {
  it("normaliza telefone e campos opcionais vazios", () => {
    const parsed = inscricaoSchema.parse({ ...base, cpf: "", cep: "" });
    expect(parsed.telefone).toBe("92991234567");
    expect(parsed.cpf).toBe("");
    expect(toInscricaoRpc(parsed, true)).toMatchObject({ possui_laudo: false, consentimento: true });
  });

  it("recusa CPF inválido e data futura", () => {
    expect(inscricaoSchema.safeParse({ ...base, cpf: "529.982.247-24" }).success).toBe(false);
    expect(inscricaoSchema.safeParse({ ...base, data_nascimento: "2999-01-01" }).success).toBe(false);
  });
});

describe("links", () => {
  it("monta link de inscrição com especialidade", () => {
    expect(buildInscricaoLink("https://gestor.automatikus.com.br", "psicologia")).toBe(
      "https://gestor.automatikus.com.br/inscricao?especialidade=psicologia",
    );
  });

  it("monta link do WhatsApp com DDI 55 sem duplicar", () => {
    expect(buildWhatsAppShareUrl("oi", "(92) 99123-4567")).toBe("https://wa.me/5592991234567?text=oi");
    expect(buildWhatsAppShareUrl("oi", "5592991234567")).toBe("https://wa.me/5592991234567?text=oi");
    expect(buildWhatsAppShareUrl("oi")).toBe("https://wa.me/?text=oi");
  });
});

describe("ordenarFila", () => {
  it("coloca prioridade alta na frente e mantém ordem de chegada", () => {
    const fila = ordenarFila([
      { id: "a", prioridade: "normal", created_at: "2026-10-01" },
      { id: "b", prioridade: "alta", created_at: "2026-10-05" },
      { id: "c", prioridade: "normal", created_at: "2026-09-01" },
    ]);
    expect(fila.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });
});

describe("diasDeEspera", () => {
  it("conta dias corridos", () => {
    expect(diasDeEspera("2026-10-20T12:00:00Z", new Date("2026-10-27T12:00:00Z"))).toBe(7);
  });
});
