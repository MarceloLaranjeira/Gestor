export type SaudeAtendimentoGrupo = "consulta" | "exame";

export interface SaudeAtendimento {
  grupo: SaudeAtendimentoGrupo;
  tipo: string;
  prazoDias: number;
}

export const SAUDE_ATENDIMENTO_GRUPO_LABEL: Record<SaudeAtendimentoGrupo, string> = {
  consulta: "Consultas",
  exame: "Exames",
};

export const SAUDE_ATENDIMENTOS: SaudeAtendimento[] = [
  { grupo: "consulta", tipo: "Consulta Cardiologista", prazoDias: 20 },
  { grupo: "consulta", tipo: "Consulta Cardiologista Pediatra", prazoDias: 15 },
  { grupo: "consulta", tipo: "Consulta Cabeça/Pescoço", prazoDias: 15 },
  { grupo: "consulta", tipo: "Consulta Cirurgião Geral", prazoDias: 15 },
  { grupo: "consulta", tipo: "Consulta Cirurgião Ginecológico", prazoDias: 10 },
  { grupo: "consulta", tipo: "Ortopedista Pediatra", prazoDias: 7 },
  { grupo: "consulta", tipo: "Ortopedista Adulto", prazoDias: 15 },
  { grupo: "consulta", tipo: "Ortopedista Pediátrico", prazoDias: 7 },
  { grupo: "consulta", tipo: "Consulta em Fisioterapia", prazoDias: 10 },
  { grupo: "consulta", tipo: "Consulta Hematologista", prazoDias: 7 },
  { grupo: "consulta", tipo: "Consulta Mastologista", prazoDias: 5 },
  { grupo: "consulta", tipo: "Consulta Neurologista Pediatra", prazoDias: 7 },
  { grupo: "consulta", tipo: "Consulta Oftalmologista", prazoDias: 20 },
  { grupo: "consulta", tipo: "Consulta em Otorrino Geral", prazoDias: 7 },
  { grupo: "consulta", tipo: "Consulta em Proctologista Cirúrgico", prazoDias: 7 },
  { grupo: "consulta", tipo: "Consulta em Reumatologista", prazoDias: 20 },
  { grupo: "consulta", tipo: "Consulta Urologia Cirúrgico", prazoDias: 7 },
  { grupo: "consulta", tipo: "Consulta Urologia Geral", prazoDias: 20 },
  { grupo: "consulta", tipo: "Consulta em Pequenas Cirurgias", prazoDias: 7 },
  { grupo: "consulta", tipo: "Consulta em Dermatologista", prazoDias: 7 },
  { grupo: "consulta", tipo: "Consulta Cardiologista (RC)", prazoDias: 15 },
  { grupo: "consulta", tipo: "Consulta Proctologista Geral", prazoDias: 20 },
  { grupo: "exame", tipo: "Densitometria Óssea", prazoDias: 15 },
  { grupo: "exame", tipo: "Ecocardiograma Adulto/Infantil", prazoDias: 7 },
  { grupo: "exame", tipo: "Eletrocardiograma Adulto/Infantil", prazoDias: 15 },
  { grupo: "exame", tipo: "Exames Ultrasson", prazoDias: 15 },
  { grupo: "exame", tipo: "Ultrasson com Doplen", prazoDias: 7 },
  { grupo: "exame", tipo: "Mamografia", prazoDias: 10 },
  { grupo: "exame", tipo: "Cintilografia do Miocárdio", prazoDias: 7 },
  { grupo: "exame", tipo: "Exames Laboratoriais", prazoDias: 5 },
  { grupo: "exame", tipo: "Retossigmoidoscopia", prazoDias: 4 },
  { grupo: "exame", tipo: "Ressonância sem Sedação", prazoDias: 15 },
  { grupo: "exame", tipo: "Tomografia sem Sedação", prazoDias: 5 },
  { grupo: "exame", tipo: "Teste Ergométrico", prazoDias: 3 },
  { grupo: "exame", tipo: "Exames de Raio X", prazoDias: 10 },
  { grupo: "exame", tipo: "Exames de PAFF", prazoDias: 4 },
  { grupo: "exame", tipo: "Exame de Diagnose de Otorrino", prazoDias: 10 },
  { grupo: "exame", tipo: "Exames de Laringoscopia", prazoDias: 10 },
];

export const SAUDE_ATENDIMENTOS_POR_GRUPO = SAUDE_ATENDIMENTOS.reduce<Record<SaudeAtendimentoGrupo, SaudeAtendimento[]>>(
  (acc, atendimento) => {
    acc[atendimento.grupo].push(atendimento);
    return acc;
  },
  { consulta: [], exame: [] },
);

export const findSaudeAtendimento = (tipo: string) =>
  SAUDE_ATENDIMENTOS.find((atendimento) => atendimento.tipo === tipo);

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calculateSaudeResponseDate = (prazoDias: number, baseDate = new Date()) => {
  const next = new Date(baseDate);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + Math.max(0, prazoDias));
  return toIsoDate(next);
};
