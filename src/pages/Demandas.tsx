import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Clock, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface Demanda {
  id: number;
  titulo: string;
  descricao: string;
  status: "pendente" | "andamento" | "concluida" | "atrasada";
  prioridade: "urgente" | "alta" | "media" | "baixa";
  responsavel: string;
  solicitante: string;
  categoria: string;
  dataCriacao: string;
  dataPrazo: string;
}

const mockDemandas: Demanda[] = [
  { id: 1, titulo: "Pavimentação Rua das Flores", descricao: "Solicitação dos moradores para pavimentação da rua", status: "andamento", prioridade: "alta", responsavel: "João Silva", solicitante: "Assoc. Moradores Zona Norte", categoria: "Infraestrutura", dataCriacao: "10/02/2026", dataPrazo: "28/02/2026" },
  { id: 2, titulo: "Reunião com Sec. de Saúde", descricao: "Tratar construção de nova UBS no bairro", status: "pendente", prioridade: "urgente", responsavel: "Maria Santos", solicitante: "Comunidade Alvorada", categoria: "Saúde", dataCriacao: "15/02/2026", dataPrazo: "22/02/2026" },
  { id: 3, titulo: "Ofício Reforma Escola Municipal", descricao: "Encaminhar ofício à SEDUC solicitando reforma", status: "concluida", prioridade: "media", responsavel: "Carlos Lima", solicitante: "Dir. Escola Municipal", categoria: "Educação", dataCriacao: "05/02/2026", dataPrazo: "15/02/2026" },
  { id: 4, titulo: "Emenda Parlamentar Segurança", descricao: "Articular emenda para equipamentos de segurança", status: "andamento", prioridade: "alta", responsavel: "Ana Costa", solicitante: "Cmd. PM Regional", categoria: "Segurança", dataCriacao: "01/02/2026", dataPrazo: "15/03/2026" },
  { id: 5, titulo: "Visita Comunidade Ribeirinha", descricao: "Agenda de visita para levantamento de demandas", status: "pendente", prioridade: "media", responsavel: "Pedro Souza", solicitante: "Líder comunitário", categoria: "Social", dataCriacao: "12/02/2026", dataPrazo: "25/02/2026" },
  { id: 6, titulo: "Projeto de Lei Pesca Sustentável", descricao: "Finalizar PL sobre regulamentação da pesca", status: "atrasada", prioridade: "urgente", responsavel: "Dra. Fernanda", solicitante: "Equipe Jurídica", categoria: "Legislativo", dataCriacao: "20/01/2026", dataPrazo: "10/02/2026" },
];

const statusConfig = {
  pendente: { label: "Pendente", icon: Clock, style: "bg-warning/10 text-warning" },
  andamento: { label: "Em andamento", icon: Clock, style: "bg-info/10 text-info" },
  concluida: { label: "Concluída", icon: CheckCircle2, style: "bg-success/10 text-success" },
  atrasada: { label: "Atrasada", icon: AlertTriangle, style: "bg-destructive/10 text-destructive" },
};

const prioridadeStyles: Record<string, string> = {
  urgente: "bg-destructive/10 text-destructive border-destructive/20",
  alta: "bg-warning/10 text-warning border-warning/20",
  media: "bg-info/10 text-info border-info/20",
  baixa: "bg-muted text-muted-foreground border-border",
};

const Demandas = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const filtered = mockDemandas.filter((d) => {
    const matchSearch = d.titulo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Demandas</h1>
            <p className="text-sm text-muted-foreground">Gestão de demandas do gabinete</p>
          </div>
          <button className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            Nova Demanda
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          {(["todos", "pendente", "andamento", "concluida"] as const).map((status) => {
            const count = status === "todos" ? mockDemandas.length : mockDemandas.filter((d) => d.status === status).length;
            const labels = { todos: "Total", pendente: "Pendentes", andamento: "Em Andamento", concluida: "Concluídas" };
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`glass-card rounded-lg p-3 text-center transition-all ${filterStatus === status ? "ring-2 ring-primary" : ""}`}
              >
                <p className="text-2xl font-bold font-display text-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{labels[status]}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar demandas..."
              className="w-full h-9 pl-10 pr-4 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((demanda) => {
            const sc = statusConfig[demanda.status];
            return (
              <motion.div
                key={demanda.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.style}`}>
                        <sc.icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize border ${prioridadeStyles[demanda.prioridade]}`}>
                        {demanda.prioridade}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                        {demanda.categoria}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{demanda.titulo}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{demanda.descricao}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>Responsável: <span className="font-medium text-foreground">{demanda.responsavel}</span></span>
                      <span>Prazo: <span className="font-medium text-foreground">{demanda.dataPrazo}</span></span>
                      <span>Solicitante: {demanda.solicitante}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Demandas;
