import { z } from "zod";

export const ESPECIALIDADE_SLUGS = ["neuropsicologia", "psicologia", "neuropediatria"] as const;
export type EspecialidadeSlug = (typeof ESPECIALIDADE_SLUGS)[number];

export interface Especialidade {
  slug: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export const STATUS_LISTA = ["aguardando", "agendado", "em_atendimento", "concluido", "cancelado"] as const;
export type StatusLista = (typeof STATUS_LISTA)[number];

export const STATUS_LABEL: Record<StatusLista, string> = {
  aguardando: "Aguardando",
  agendado: "Agendado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const STATUS_CLASS: Record<StatusLista, string> = {
  aguardando: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  agendado: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  em_atendimento: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
  concluido: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  cancelado: "bg-muted text-muted-foreground border-border",
};

/** Status que mantêm o paciente na fila da especialidade. */
export const STATUS_ATIVOS: StatusLista[] = ["aguardando", "agendado", "em_atendimento"];

export const ORIGENS_CONHECIMENTO = [
  "Indicação de familiar ou amigo",
  "Escola ou creche",
  "Unidade de saúde / UBS",
  "Redes sociais",
  "Gabinete / atendimento presencial",
  "Outro",
];

export const onlyDigits = (value: string | null | undefined): string => (value ?? "").replace(/\D/g, "");

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split("").map(Number);
  const dv = (len: number) => {
    const sum = digits.slice(0, len).reduce((acc, d, i) => acc + d * (len + 1 - i), 0);
    return ((sum * 10) % 11) % 10;
  };
  return dv(9) === digits[9] && dv(10) === digits[10];
}

export function maskCpf(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCep(value: string): string {
  return onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskSus(value: string): string {
  return onlyDigits(value)
    .slice(0, 15)
    .replace(/(\d{3})(\d)/, "$1 $2")
    .replace(/(\d{4})(\d)/, "$1 $2")
    .replace(/(\d{4})(\d)/, "$1 $2");
}

/** Idade em anos completos na data de referência (ISO yyyy-mm-dd). */
export function calcularIdade(dataNascimento: string | null | undefined, hoje: Date = new Date()): number | null {
  if (!dataNascimento) return null;
  const [y, m, d] = dataNascimento.split("-").map(Number);
  if (!y || !m || !d) return null;
  let idade = hoje.getFullYear() - y;
  const antesDoAniversario = hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d);
  if (antesDoAniversario) idade -= 1;
  return idade >= 0 ? idade : null;
}

export function formatIdade(dataNascimento: string | null | undefined): string {
  const idade = calcularIdade(dataNascimento);
  if (idade === null) return "—";
  return idade === 1 ? "1 ano" : `${idade} anos`;
}

const opcionalDigitos = (len: number, msg: string) =>
  z
    .string()
    .optional()
    .transform((v) => onlyDigits(v))
    .refine((v) => v === "" || v.length === len, msg);

const opcionalCpf = (msg: string) =>
  z
    .string()
    .optional()
    .transform((v) => onlyDigits(v))
    .refine((v) => v === "" || isValidCpf(v), msg);

export const inscricaoSchema = z.object({
  especialidade: z.string().min(1, "Selecione o atendimento desejado."),
  nome: z.string().trim().min(3, "Informe o nome completo do paciente.").max(160),
  data_nascimento: z
    .string()
    .min(1, "Informe a data de nascimento.")
    .refine((v) => {
      const date = new Date(`${v}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date <= new Date() && date.getFullYear() >= 1900;
    }, "Informe uma data de nascimento válida."),
  cpf: opcionalCpf("CPF do paciente inválido."),
  cartao_sus: opcionalDigitos(15, "O Cartão do SUS tem 15 dígitos."),
  responsavel_nome: z.string().trim().min(3, "Informe o nome do responsável.").max(160),
  responsavel_cpf: opcionalCpf("CPF do responsável inválido."),
  telefone: z
    .string()
    .transform((v) => onlyDigits(v))
    .refine((v) => v.length >= 10 && v.length <= 11, "Informe um telefone com DDD."),
  cep: opcionalDigitos(8, "CEP inválido."),
  endereco: z.string().trim().max(300).optional(),
  possui_laudo: z.enum(["sim", "nao"], { required_error: "Informe se o paciente já possui laudo." }),
  motivo: z.string().trim().min(3, "Informe o motivo da avaliação.").max(500),
  descricao_sintomas: z.string().trim().max(4000).optional(),
  origem_conhecimento: z.string().trim().max(200).optional(),
  website: z.string().optional(),
});

export type InscricaoFormValues = z.input<typeof inscricaoSchema>;
export type InscricaoPayload = z.output<typeof inscricaoSchema>;

/** Corpo enviado à RPC `inscrever_paciente`. */
export function toInscricaoRpc(values: InscricaoPayload, consentimento: boolean) {
  return {
    ...values,
    possui_laudo: values.possui_laudo === "sim",
    consentimento,
  };
}

export function buildInscricaoLink(origin: string, especialidade?: string): string {
  const url = new URL("/inscricao", origin);
  if (especialidade) url.searchParams.set("especialidade", especialidade);
  return url.toString();
}

export function buildWhatsAppShareUrl(texto: string, telefone?: string): string {
  const numero = onlyDigits(telefone);
  const destino = numero ? `55${numero.replace(/^55/, "")}` : "";
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}

export function mensagemConvite(nomeEspecialidade: string, link: string): string {
  return [
    "Olá! Tudo bem?",
    "",
    `Para darmos andamento ao atendimento de *${nomeEspecialidade}*, pedimos que preencha a ficha de inscrição do paciente pelo link abaixo:`,
    link,
    "",
    "O preenchimento leva cerca de 5 minutos. Após o envio, você receberá um número de protocolo e nossa equipe entrará em contato para o agendamento.",
  ].join("\n");
}

/** Ordem de atendimento: prioridade alta primeiro, depois quem se inscreveu antes. */
export function ordenarFila<T extends { prioridade: string; created_at: string }>(entradas: T[]): T[] {
  return [...entradas].sort((a, b) => {
    if (a.prioridade !== b.prioridade) return a.prioridade === "alta" ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

/** Dias corridos desde a inscrição. */
export function diasDeEspera(createdAt: string, hoje: Date = new Date()): number {
  const diff = hoje.getTime() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}
