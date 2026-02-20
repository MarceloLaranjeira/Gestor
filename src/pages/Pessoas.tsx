import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Filter, UserPlus, Phone, Mail, MapPin } from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface Pessoa {
  id: number;
  nome: string;
  tipo: string;
  telefone: string;
  email: string;
  bairro: string;
  cidade: string;
  tags: string[];
}

const mockPessoas: Pessoa[] = [
  { id: 1, nome: "José Oliveira", tipo: "Líder Comunitário", telefone: "(92) 99123-4567", email: "jose@email.com", bairro: "Cidade Nova", cidade: "Manaus", tags: ["Segurança", "Comunidade"] },
  { id: 2, nome: "Maria Fernanda Silva", tipo: "Apoiador", telefone: "(92) 99234-5678", email: "maria@email.com", bairro: "Adrianópolis", cidade: "Manaus", tags: ["Eclesiástico", "Saúde"] },
  { id: 3, nome: "Carlos Mendes", tipo: "Vereador", telefone: "(92) 99345-6789", email: "carlos@email.com", bairro: "Centro", cidade: "Manaus", tags: ["Político", "Aliado"] },
  { id: 4, nome: "Ana Beatriz Costa", tipo: "Sec. de Saúde", telefone: "(92) 99456-7890", email: "ana@email.com", bairro: "Flores", cidade: "Manaus", tags: ["Governo", "Saúde"] },
  { id: 5, nome: "Pedro Lucas Santos", tipo: "Pastor", telefone: "(92) 99567-8901", email: "pedro@email.com", bairro: "Alvorada", cidade: "Manaus", tags: ["Eclesiástico"] },
  { id: 6, nome: "Francisca Rodrigues", tipo: "Líder Comunitário", telefone: "(92) 99678-9012", email: "francisca@email.com", bairro: "Compensa", cidade: "Manaus", tags: ["Comunidade", "Educação"] },
];

const Pessoas = () => {
  const [search, setSearch] = useState("");
  const filtered = mockPessoas.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Pessoas</h1>
            <p className="text-sm text-muted-foreground">{mockPessoas.length} cadastros no sistema</p>
          </div>
          <button className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
            <UserPlus className="w-4 h-4" />
            Nova Pessoa
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pessoas..."
              className="w-full h-9 pl-10 pr-4 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
          <button className="h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((pessoa) => (
            <motion.div
              key={pessoa.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-foreground">{pessoa.nome.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{pessoa.nome}</p>
                  <p className="text-xs text-muted-foreground">{pessoa.tipo}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {pessoa.telefone}</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {pessoa.email}</p>
                <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {pessoa.bairro}, {pessoa.cidade}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pessoa.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Pessoas;
