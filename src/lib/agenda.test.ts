import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  etapasRealizadas,
  faltasRecentes,
  intervaloPeriodo,
  moverPeriodo,
  proximoDiaUtil,
  resumoAtendimentos,
  toCsv,
} from "./agenda";

const ag = (id: string, paciente: string, data: string, status: string, extra: Record<string, string> = {}) => ({
  id,
  paciente_id: paciente,
  especialidade_slug: "psicologia",
  data_hora: data,
  status,
  ...extra,
});

describe("intervaloPeriodo", () => {
  it("semana começa na segunda e termina no domingo", () => {
    const { inicio, fim } = intervaloPeriodo("semana", new Date(2026, 9, 29)); // quinta
    expect(inicio.getDate()).toBe(26);
    expect(inicio.getDay()).toBe(1);
    expect(fim.getDate()).toBe(1);
    expect(fim.getDay()).toBe(0);
  });

  it("mês cobre do dia 1 ao último dia", () => {
    const { inicio, fim } = intervaloPeriodo("mes", new Date(2026, 1, 10));
    expect(inicio.getDate()).toBe(1);
    expect(fim.getDate()).toBe(28);
  });

  it("move o período para trás e para frente", () => {
    expect(moverPeriodo("mes", new Date(2026, 0, 31), 1).getMonth()).toBe(1);
    expect(moverPeriodo("dia", new Date(2026, 0, 31), -1).getDate()).toBe(30);
  });
});

describe("resumoAtendimentos", () => {
  it("conta agendados sem cancelados, atendidos, faltosos e pendentes", () => {
    const r = resumoAtendimentos([
      ag("1", "p1", "2026-10-01T10:00:00Z", "presente"),
      ag("2", "p2", "2026-10-01T11:00:00Z", "falta"),
      ag("3", "p3", "2026-10-01T12:00:00Z", "cancelado"),
      ag("4", "p4", "2026-10-01T13:00:00Z", "agendado"),
      ag("5", "p5", "2026-10-01T14:00:00Z", "confirmado"),
    ]);
    expect(r).toEqual({ agendados: 4, atendidos: 1, faltosos: 1, cancelados: 1, pendentes: 2 });
  });
});

describe("faltasRecentes", () => {
  it("considera só faltas dos últimos 30 dias e ordena por quantidade", () => {
    const hoje = new Date("2026-10-27T15:00:00Z");
    const r = faltasRecentes(
      [
        ag("1", "p1", "2026-10-20T10:00:00Z", "falta"),
        ag("2", "p1", "2026-10-06T10:00:00Z", "falta"),
        ag("3", "p2", "2026-10-25T10:00:00Z", "falta"),
        ag("4", "p3", "2026-09-01T10:00:00Z", "falta"),
        ag("5", "p2", "2026-10-26T10:00:00Z", "presente"),
      ],
      hoje,
    );
    expect(r.map((f) => [f.paciente_id, f.total])).toEqual([
      ["p1", 2],
      ["p2", 1],
    ]);
    expect(r[0].ultima).toBe("2026-10-20T10:00:00Z");
  });
});

describe("etapasRealizadas", () => {
  it("só conta etapas com presença", () => {
    const etapas = etapasRealizadas([
      ag("1", "p1", "2026-10-01T10:00:00Z", "presente", { etapa: "entrevista_inicial" }),
      ag("2", "p1", "2026-10-08T10:00:00Z", "falta", { etapa: "testagem" }),
    ]);
    expect([...etapas]).toEqual(["entrevista_inicial"]);
  });
});

describe("proximoDiaUtil", () => {
  it("leva sábado e domingo para segunda", () => {
    expect(proximoDiaUtil(new Date(2026, 9, 31)).getDay()).toBe(1);
    expect(proximoDiaUtil(new Date(2026, 10, 1)).getDay()).toBe(1);
    expect(proximoDiaUtil(new Date(2026, 9, 28)).getDate()).toBe(28);
  });
});

describe("agruparPorDia", () => {
  it("agrupa em ordem cronológica", () => {
    const grupos = agruparPorDia([
      { data_hora: "2026-10-28T15:00:00" },
      { data_hora: "2026-10-27T09:00:00" },
      { data_hora: "2026-10-28T08:00:00" },
    ]);
    expect(grupos.map((g) => [g.dia, g.itens.length])).toEqual([
      ["2026-10-27", 1],
      ["2026-10-28", 2],
    ]);
    expect(grupos[1].itens[0].data_hora).toBe("2026-10-28T08:00:00");
  });
});

describe("toCsv", () => {
  it("usa ponto e vírgula e escapa aspas", () => {
    expect(toCsv([["a", 'b"c'], [1, null]])).toBe('﻿a;"b""c"\n1;');
  });
});
