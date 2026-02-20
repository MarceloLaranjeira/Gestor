import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, Shield, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  // Edit state
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("assessor");
  const [editCoords, setEditCoords] = useState<string[]>([]);
  const [editNome, setEditNome] = useState("");
  const [editCargo, setEditCargo] = useState("");
  const [saving, setSaving] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("assessor");
  const [newCoords, setNewCoords] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Delete state
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    setEditNome(u.nome);
    setEditCargo(u.cargo || "");
  };

  const handleSave = async () => {
    if (!editUser) return;
    if (!editNome.trim()) {
      toast({ title: "O nome não pode estar vazio", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Update nome/cargo in profiles
      const profileUpdates: { nome?: string; cargo?: string } = {};
      if (editNome.trim() !== editUser.nome) profileUpdates.nome = editNome.trim();
      if (editCargo.trim() !== (editUser.cargo || "")) profileUpdates.cargo = editCargo.trim();
      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("user_id", editUser.user_id);
      }

      if (editRole !== editUser.role) {
        await supabase
          .from("user_roles")
          .update({ role: editRole })
          .eq("user_id", editUser.user_id);
      }
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

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast({ title: "Preencha nome, email e senha", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: newEmail.trim(),
          password: newPassword,
          nome: newName.trim(),
          role: newRole,
          coordenacao_ids: newCoords,
        },
      });
      if (res.error || res.data?.error) {
        toast({ title: res.data?.error || "Erro ao criar usuário", variant: "destructive" });
      } else {
        toast({ title: "Usuário criado com sucesso" });
        setShowCreate(false);
        resetCreateForm();
        fetchData();
      }
    } catch {
      toast({ title: "Erro ao criar usuário", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("assessor");
    setNewCoords([]);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke("delete-user", {
        body: { user_id: deleteUser.user_id },
      });
      if (res.error || res.data?.error) {
        toast({ title: res.data?.error || "Erro ao excluir usuário", variant: "destructive" });
      } else {
        toast({ title: "Usuário excluído com sucesso" });
        setDeleteUser(null);
        fetchData();
      }
    } catch {
      toast({ title: "Erro ao excluir usuário", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const filtered = users.filter(
    (u) =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

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
          {isGestor && (
            <Button onClick={() => setShowCreate(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          )}
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
                <TableHead>Cargo</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Coordenações</TableHead>
                {isGestor && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.cargo || "—"}</TableCell>
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
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                            Editar
                          </Button>
                          {u.user_id !== currentUser?.user_id && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteUser(u)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={safeCurrentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {safeCurrentPage} / {totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={safeCurrentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome</label>
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Cargo</label>
                <Input value={editCargo} onChange={(e) => setEditCargo(e.target.value)} placeholder="Cargo (opcional)" />
              </div>
              <p className="text-xs text-muted-foreground">{editUser.email}</p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Função</label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetCreateForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Função</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                      checked={newCoords.includes(c.id)}
                      onCheckedChange={(checked) => {
                        setNewCoords((prev) =>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.nome}</strong>? Esta ação não pode ser desfeita e removerá todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default GerenciarUsuarios;
