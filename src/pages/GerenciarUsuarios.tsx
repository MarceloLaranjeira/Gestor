import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, Shield, X, Check, ChevronDown } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  user_id: string;
  nome: string;
  email: string;
  cargo: string | null;
  role: AppRole;
  coordenacao_ids: string[];
}

interface Coordenacao {
  id: string;
  nome: string;
}

const roleLabels: Record<AppRole, string> = {
  gestor: "Gestor",
  assessor: "Assessor",
  coordenador: "Coordenador",
};

const GerenciarUsuarios = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [coordenacoes, setCoordenacoes] = useState<Coordenacao[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("assessor");
  const [editCoords, setEditCoords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, coordsRes, ucRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, nome, email, cargo"),
      supabase.from("coordenacoes").select("id, nome").order("nome"),
      supabase.from("user_coordenacoes").select("user_id, coordenacao_id"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const profiles = profilesRes.data || [];
    const ucs = ucRes.data || [];
    const roles = rolesRes.data || [];
    setCoordenacoes(coordsRes.data || []);

    const rows: UserRow[] = profiles.map((p) => {
      const userRole = roles.find((r) => r.user_id === p.user_id);
      const userCoords = ucs
        .filter((uc) => uc.user_id === p.user_id)
        .map((uc) => uc.coordenacao_id);
      return {
        user_id: p.user_id,
        nome: p.nome,
        email: p.email,
        cargo: p.cargo,
        role: (userRole?.role as AppRole) || "assessor",
        coordenacao_ids: userCoords,
      };
    });

    setUsers(rows);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditCoords([...u.coordenacao_ids]);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);

    try {
      // Update role
      if (editRole !== editUser.role) {
        await supabase
          .from("user_roles")
          .update({ role: editRole })
          .eq("user_id", editUser.user_id);
      }

      // Sync coordenacoes: delete removed, insert added
      const oldCoords = editUser.coordenacao_ids;
      const toRemove = oldCoords.filter((id) => !editCoords.includes(id));
      const toAdd = editCoords.filter((id) => !oldCoords.includes(id));

      if (toRemove.length > 0) {
        await supabase
          .from("user_coordenacoes")
          .delete()
          .eq("user_id", editUser.user_id)
          .in("coordenacao_id", toRemove);
      }

      if (toAdd.length > 0) {
        await supabase.from("user_coordenacoes").insert(
          toAdd.map((coordId) => ({
            user_id: editUser.user_id,
            coordenacao_id: coordId,
          }))
        );
      }

      toast({ title: "Usuário atualizado com sucesso" });
      setEditUser(null);
      fetchData();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const isGestor = currentUser?.role === "Gestor";

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Gerenciar Usuários</h1>
            <p className="text-sm text-muted-foreground">
              {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="pl-10"
          />
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Coordenações</TableHead>
                {isGestor && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "gestor" ? "default" : "secondary"}>
                        {roleLabels[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.coordenacao_ids.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhuma</span>
                        ) : (
                          u.coordenacao_ids.map((cId) => {
                            const c = coordenacoes.find((co) => co.id === cId);
                            return c ? (
                              <Badge key={cId} variant="outline" className="text-xs">
                                {c.nome}
                              </Badge>
                            ) : null;
                          })
                        )}
                      </div>
                    </TableCell>
                    {isGestor && (
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{editUser.nome}</p>
                <p className="text-xs text-muted-foreground">{editUser.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Função</label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="assessor">Assessor</SelectItem>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Coordenações</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {coordenacoes.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={editCoords.includes(c.id)}
                        onCheckedChange={(checked) => {
                          setEditCoords((prev) =>
                            checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                          );
                        }}
                      />
                      <span className="text-sm">{c.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default GerenciarUsuarios;
