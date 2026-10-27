import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ORIGENS_CONHECIMENTO,
  formatIdade,
  inscricaoSchema,
  maskCep,
  maskCpf,
  maskPhone,
  maskSus,
  onlyDigits,
  type Especialidade,
  type InscricaoFormValues,
  type InscricaoPayload,
} from "@/lib/atendimento";

interface InscricaoFormProps {
  especialidades: Especialidade[];
  defaultEspecialidade?: string;
  /** Formulário público: exige consentimento LGPD e inclui o campo anti-robô. */
  isPublic?: boolean;
  submitLabel?: string;
  onSubmit: (values: InscricaoPayload, consentimento: boolean) => Promise<void>;
}

interface CepResponse {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

const Field = ({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={cn("space-y-1.5", className)}>
    <Label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
      {label}
    </Label>
    {children}
    {error ? (
      <p role="alert" className="text-xs text-destructive">{error}</p>
    ) : hint ? (
      <p className="text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const Section = ({ step, title, description, children }: { step: number; title: string; description: string; children: ReactNode }) => (
  <section className="grid gap-5 border-t border-border/60 pt-7 first:border-t-0 first:pt-0 md:grid-cols-[220px_1fr]">
    <div className="flex gap-3 md:block">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary md:mb-3">
        {step}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </section>
);

export function InscricaoForm({ especialidades, defaultEspecialidade, isPublic = false, submitLabel = "Enviar inscrição", onSubmit }: InscricaoFormProps) {
  const [consentimento, setConsentimento] = useState(!isPublic);
  const [consentError, setConsentError] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InscricaoFormValues, unknown, InscricaoPayload>({
    resolver: zodResolver(inscricaoSchema),
    defaultValues: {
      especialidade: defaultEspecialidade ?? "",
      nome: "",
      data_nascimento: "",
      cpf: "",
      cartao_sus: "",
      responsavel_nome: "",
      responsavel_cpf: "",
      telefone: "",
      cep: "",
      endereco: "",
      motivo: "",
      descricao_sintomas: "",
      origem_conhecimento: "",
      website: "",
    },
  });

  const dataNascimento = watch("data_nascimento");

  const masked = (name: "cpf" | "responsavel_cpf" | "telefone" | "cep" | "cartao_sus", mask: (v: string) => string) =>
    register(name, { onChange: (e) => setValue(name, mask(e.target.value)) });

  const buscarCep = async (valor: string) => {
    const cep = onlyDigits(valor);
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      if (!res.ok) return;
      const data = (await res.json()) as CepResponse;
      const endereco = [data.street, data.neighborhood, data.city && data.state ? `${data.city} - ${data.state}` : data.city]
        .filter(Boolean)
        .join(", ");
      if (endereco) setValue("endereco", `${endereco}, nº `, { shouldValidate: true });
    } catch {
      // CEP é só um atalho; a família pode digitar o endereço.
    } finally {
      setBuscandoCep(false);
    }
  };

  const submit = handleSubmit(async (values) => {
    if (isPublic && !consentimento) {
      setConsentError(true);
      return;
    }
    await onSubmit(values, consentimento);
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      <Section step={1} title="Atendimento" description="Escolha o atendimento que a família está solicitando.">
        <Field label="Especialidade ou atendimento" htmlFor="especialidade" error={errors.especialidade?.message} className="sm:col-span-2">
          <Controller
            control={control}
            name="especialidade"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="especialidade" aria-invalid={!!errors.especialidade}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp.slug} value={esp.slug}>
                      {esp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </Section>

      <Section step={2} title="Dados do paciente" description="Como consta na certidão de nascimento ou documento oficial.">
        <Field label="Nome completo do paciente" htmlFor="nome" error={errors.nome?.message} className="sm:col-span-2">
          <Input id="nome" autoComplete="off" {...register("nome")} aria-invalid={!!errors.nome} />
        </Field>
        <Field
          label="Data de nascimento"
          htmlFor="data_nascimento"
          error={errors.data_nascimento?.message}
          hint={dataNascimento ? `Idade: ${formatIdade(dataNascimento)}` : undefined}
        >
          <Input id="data_nascimento" type="date" max={new Date().toISOString().slice(0, 10)} {...register("data_nascimento")} aria-invalid={!!errors.data_nascimento} />
        </Field>
        <Field label="CPF do paciente (se houver)" htmlFor="cpf" error={errors.cpf?.message}>
          <Input id="cpf" inputMode="numeric" placeholder="000.000.000-00" {...masked("cpf", maskCpf)} aria-invalid={!!errors.cpf} />
        </Field>
        <Field label="Cartão do SUS" htmlFor="cartao_sus" error={errors.cartao_sus?.message} hint="15 números, frente do cartão." className="sm:col-span-2">
          <Input id="cartao_sus" inputMode="numeric" placeholder="000 0000 0000 0000" {...masked("cartao_sus", maskSus)} aria-invalid={!!errors.cartao_sus} />
        </Field>
      </Section>

      <Section step={3} title="Responsável e contato" description="Usaremos este telefone para confirmar o agendamento.">
        <Field label="Nome completo da mãe, pai ou responsável" htmlFor="responsavel_nome" error={errors.responsavel_nome?.message} className="sm:col-span-2">
          <Input id="responsavel_nome" {...register("responsavel_nome")} aria-invalid={!!errors.responsavel_nome} />
        </Field>
        <Field label="CPF do responsável" htmlFor="responsavel_cpf" error={errors.responsavel_cpf?.message}>
          <Input id="responsavel_cpf" inputMode="numeric" placeholder="000.000.000-00" {...masked("responsavel_cpf", maskCpf)} aria-invalid={!!errors.responsavel_cpf} />
        </Field>
        <Field label="Telefone / WhatsApp" htmlFor="telefone" error={errors.telefone?.message}>
          <Input id="telefone" type="tel" inputMode="tel" placeholder="(92) 90000-0000" {...masked("telefone", maskPhone)} aria-invalid={!!errors.telefone} />
        </Field>
        <Field label="CEP" htmlFor="cep" error={errors.cep?.message} hint="Preenche o endereço automaticamente.">
          <div className="relative">
            <Input
              id="cep"
              inputMode="numeric"
              placeholder="00000-000"
              {...register("cep", {
                onChange: (e) => setValue("cep", maskCep(e.target.value)),
                onBlur: (e) => buscarCep(e.target.value),
              })}
              aria-invalid={!!errors.cep}
            />
            {buscandoCep ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            )}
          </div>
        </Field>
        <Field label="Endereço completo" htmlFor="endereco" error={errors.endereco?.message} hint="Rua, número, bairro, cidade.">
          <Input id="endereco" {...register("endereco")} aria-invalid={!!errors.endereco} />
        </Field>
      </Section>

      <Section step={4} title="Sobre a avaliação" description="Essas informações ajudam a equipe a preparar o primeiro atendimento.">
        <Field label="O paciente já possui laudo?" htmlFor="possui_laudo" error={errors.possui_laudo?.message} className="sm:col-span-2">
          <Controller
            control={control}
            name="possui_laudo"
            render={({ field }) => (
              <RadioGroup id="possui_laudo" value={field.value} onValueChange={field.onChange} className="flex gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="sim" /> Sim
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="nao" /> Não
                </label>
              </RadioGroup>
            )}
          />
        </Field>
        <Field label="Motivo da avaliação" htmlFor="motivo" error={errors.motivo?.message} className="sm:col-span-2">
          <Input id="motivo" placeholder="Ex.: suspeita de TEA indicada pela escola" {...register("motivo")} aria-invalid={!!errors.motivo} />
        </Field>
        <Field
          label="Dificuldades e sintomas observados"
          htmlFor="descricao_sintomas"
          error={errors.descricao_sintomas?.message}
          hint="Fala, comportamento, sono, alimentação, interação, aprendizagem…"
          className="sm:col-span-2"
        >
          <Textarea id="descricao_sintomas" rows={5} {...register("descricao_sintomas")} />
        </Field>
        <Field label="Como conheceu o atendimento?" htmlFor="origem_conhecimento" className="sm:col-span-2">
          <Controller
            control={control}
            name="origem_conhecimento"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="origem_conhecimento">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS_CONHECIMENTO.map((origem) => (
                    <SelectItem key={origem} value={origem}>
                      {origem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </Section>

      {isPublic && (
        <>
          {/* Campo anti-robô: fica fora da tela e do teclado. */}
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" {...register("website")} />
          <div className={cn("rounded-xl border p-4", consentError ? "border-destructive/60 bg-destructive/5" : "border-border bg-muted/30")}>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <Checkbox
                checked={consentimento}
                onCheckedChange={(v) => {
                  setConsentimento(v === true);
                  setConsentError(false);
                }}
                className="mt-0.5"
              />
              <span>
                Declaro que sou o responsável legal pelo paciente e autorizo o uso destes dados exclusivamente para
                inscrição, agendamento e acompanhamento do atendimento, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
              </span>
            </label>
            {consentError && <p role="alert" className="mt-2 pl-7 text-xs text-destructive">Para enviar, é preciso marcar a autorização.</p>}
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
