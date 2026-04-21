import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Check, Phone, MessageSquare, Filter, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Tarefa {
  id: number | string;
  titulo: string;
  motivo: string;
  responsavel: string;
  canal: string;
  dataInicio: string;
  dataFim: string;
  status: boolean;
}

export interface SecaoTarefas {
  dbId?: string;
  titulo: string;
  tarefas: Tarefa[];
}

interface TaskBoardProps {
  secoes: SecaoTarefas[];
  onUpdate: (secoes: SecaoTarefas[]) => void;
  coordenacao: string;
}

const emptyTarefa: Omit<Tarefa, "id"> = {
  titulo: "",
  motivo: "",
  responsavel: "",
  canal: "Telefone",
  dataInicio: "",
  dataFim: "",
  status: false,
};

const TaskBoard = ({ secoes, onUpdate, coordenacao }: TaskBoardProps) => {
  const [editingTask, setEditingTask] = useState<{ secaoIdx: number; tarefa: Tarefa } | null>(null);
  const [newTask, setNewTask] = useState<{ secaoIdx: number; tarefa: Omit<Tarefa, "id"> } | null>(null);
  const [newSecaoName, setNewSecaoName] = useState("");
  const [showNewSecao, setShowNewSecao] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "done" | "pending">("all");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("all");

  // Extract unique responsáveis
  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    secoes.forEach(s => s.tarefas.forEach(t => { if (t.responsavel) set.add(t.responsavel); }));
    return Array.from(set).sort();
  }, [secoes]);

  // Filtered sections
  const filteredSecoes = useMemo(() => {
    return secoes.map(s => ({
      ...s,
      tarefas: s.tarefas.filter(t => {
        if (filterStatus === "done" && !t.status) return false;
        if (filterStatus === "pending" && t.status) return false;
        if (filterResponsavel !== "all" && t.responsavel !== filterResponsavel) return false;
        return true;
      }),
    }));
  }, [secoes, filterStatus, filterResponsavel]);

  const hasFilters = filterStatus !== "all" || filterResponsavel !== "all";
  const clearFilters = () => { setFilterStatus("all"); setFilterResponsavel("all"); };

  const addSecao = () => {
    if (!newSecaoName.trim()) return;
    onUpdate([...secoes, { titulo: newSecaoName.trim(), tarefas: [] }]);
    setNewSecaoName("");
    setShowNewSecao(false);
  };

  const removeSecao = (idx: number) => {
    onUpdate(secoes.filter((_, i) => i !== idx));
  };

  const addTask = (secaoIdx: number) => {
    if (!newTask || !newTask.tarefa.titulo.trim()) return;
    const updated = secoes.map((s, i) => {
      if (i !== secaoIdx) return s;
      return { ...s, tarefas: [...s.tarefas, { ...newTask.tarefa, id: Date.now() }] };
    });
    onUpdate(updated);
    setNewTask(null);
  };

  const updateTask = () => {
    if (!editingTask) return;
    const updated = secoes.map((s, i) => {
      if (i !== editingTask.secaoIdx) return s;
      return { ...s, tarefas: s.tarefas.map(t => t.id === editingTask.tarefa.id ? editingTask.tarefa : t) };
    });
    onUpdate(updated);
    setEditingTask(null);
  };

  const removeTask = (secaoIdx: number, taskId: number | string) => {
    const updated = secoes.map((s, i) => {
      if (i !== secaoIdx) return s;
      return { ...s, tarefas: s.tarefas.filter(t => t.id !== taskId) };
    });
    onUpdate(updated);
  };

  const toggleStatus = (secaoIdx: number, taskId: number | string) => {
    const updated = secoes.map((s, i) => {
      if (i !== secaoIdx) return s;
      return { ...s, tarefas: s.tarefas.map(t => t.id === taskId ? { ...t, status: !t.status } : t) };
    });
    onUpdate(updated);
  };

  const totalTarefas = secoes.reduce((sum, s) => sum + s.tarefas.length, 0);
  const concluidas = secoes.reduce((sum, s) => sum + s.tarefas.filter(t => t.status).length, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold font-display text-foreground">{totalTarefas}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Total</p>
        </div>
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold font-display text-success">{concluidas}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Concluídas</p>
        </div>
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold font-display text-warning">{totalTarefas - concluidas}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Pendentes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="done">Concluídas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            {responsaveis.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <button onClick={clearFilters} className="h-8 px-2.5 rounded-md text-xs text-muted-foreground hover:bg-muted flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Sections */}
      {filteredSecoes.map((secao, secaoIdx) => (
        <motion.div key={(secao as any).dbId || secao.titulo + secaoIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="text-sm font-bold font-display text-foreground">{secao.titulo}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{secao.tarefas.filter(t => t.status).length}/{secao.tarefas.length}</span>
              <button onClick={() => setNewTask({ secaoIdx, tarefa: { ...emptyTarefa } })} className="h-7 px-2.5 rounded-md bg-primary/10 text-primary text-xs font-medium flex items-center gap-1 hover:bg-primary/20 transition-colors">
                <Plus className="w-3 h-3" /> Tarefa
              </button>
              <button onClick={() => removeSecao(secaoIdx)} className="h-7 w-7 rounded-md text-destructive/60 hover:bg-destructive/10 flex items-center justify-center transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-border/30">
            {secao.tarefas.map((tarefa) => (
              <div key={tarefa.id} className={`flex items-center gap-3 p-3 px-4 hover:bg-muted/30 transition-colors ${tarefa.status ? "opacity-60" : ""}`}>
                <button
                  onClick={() => toggleStatus(secaoIdx, tarefa.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${tarefa.status ? "border-success bg-success text-success-foreground" : "border-muted-foreground/30 hover:border-primary"}`}
                >
                  {tarefa.status && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium text-foreground ${tarefa.status ? "line-through" : ""}`}>{tarefa.titulo}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    {tarefa.responsavel && <span>{tarefa.responsavel}</span>}
                    {tarefa.canal && <span className="flex items-center gap-0.5">{tarefa.canal === "Telefone" ? <Phone className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}{tarefa.canal}</span>}
                    {tarefa.dataFim && <span>Prazo: {tarefa.dataFim}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditingTask({ secaoIdx, tarefa: { ...tarefa } })} className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeTask(secaoIdx, tarefa.id)} className="h-7 w-7 rounded-md text-destructive/60 hover:bg-destructive/10 flex items-center justify-center transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {secao.tarefas.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center py-6">Nenhuma tarefa nesta seção</p>
            )}
          </div>
        </motion.div>
      ))}

      {/* Add Section */}
      {showNewSecao ? (
        <div className="flex items-center gap-2">
          <Input value={newSecaoName} onChange={e => setNewSecaoName(e.target.value)} placeholder="Nome da nova seção..." className="h-9 text-sm" onKeyDown={e => e.key === "Enter" && addSecao()} />
          <button onClick={addSecao} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Criar</button>
          <button onClick={() => { setShowNewSecao(false); setNewSecaoName(""); }} className="h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
        </div>
      ) : (
        <button onClick={() => setShowNewSecao(true)} className="w-full h-10 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Nova Seção
        </button>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar Tarefa</DialogTitle>
          </DialogHeader>
          {editingTask && <TaskForm tarefa={editingTask.tarefa} onChange={t => setEditingTask({ ...editingTask, tarefa: t })} onSubmit={updateTask} onCancel={() => setEditingTask(null)} />}
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={!!newTask} onOpenChange={(open) => !open && setNewTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nova Tarefa</DialogTitle>
          </DialogHeader>
          {newTask && <TaskForm tarefa={newTask.tarefa as Tarefa} onChange={t => setNewTask({ ...newTask, tarefa: t })} onSubmit={() => addTask(newTask.secaoIdx)} onCancel={() => setNewTask(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface TaskFormProps {
  tarefa: Omit<Tarefa, "id"> & { id?: number | string };
  onChange: (t: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const TaskForm = ({ tarefa, onChange, onSubmit, onCancel }: TaskFormProps) => (
  <div className="space-y-4">
    <div>
      <Label className="text-xs">Título *</Label>
      <Input value={tarefa.titulo} onChange={e => onChange({ ...tarefa, titulo: e.target.value })} className="mt-1" />
    </div>
    <div>
      <Label className="text-xs">Motivo</Label>
      <Input value={tarefa.motivo} onChange={e => onChange({ ...tarefa, motivo: e.target.value })} className="mt-1" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">Responsável</Label>
        <Input value={tarefa.responsavel} onChange={e => onChange({ ...tarefa, responsavel: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Canal</Label>
        <Select value={tarefa.canal} onValueChange={v => onChange({ ...tarefa, canal: v })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Telefone">Telefone</SelectItem>
            <SelectItem value="Whatsapp">Whatsapp</SelectItem>
            <SelectItem value="Telefone / Whatsapp">Telefone / Whatsapp</SelectItem>
            <SelectItem value="Pessoal">Pessoal</SelectItem>
            <SelectItem value="SAPL">SAPL</SelectItem>
            <SelectItem value="Email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">Data Início</Label>
        <Input type="date" value={tarefa.dataInicio} onChange={e => onChange({ ...tarefa, dataInicio: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Data Fim</Label>
        <Input type="date" value={tarefa.dataFim} onChange={e => onChange({ ...tarefa, dataFim: e.target.value })} className="mt-1" />
      </div>
    </div>
    <div className="flex items-center gap-2 pt-2">
      <button onClick={onSubmit} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">Salvar</button>
      <button onClick={onCancel} className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
    </div>
  </div>
);

export default TaskBoard;
