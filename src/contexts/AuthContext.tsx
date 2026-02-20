import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  name: string;
  role: string;
  email: string;
  user_id: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, nome: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, email, user_id")
    .eq("user_id", userId)
    .single();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (!profile) return null;

  const role = roles?.[0]?.role || "assessor";
  const roleLabel = role === "gestor" ? "Gestor" : role === "assessor" ? "Assessor" : "Coordenador";

  return {
    name: profile.nome,
    email: profile.email,
    role: roleLabel,
    user_id: profile.user_id,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes — no await inside callback to avoid deadlock
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id).then((profile) => {
              if (isMounted) setUser(profile);
            });
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // INITIAL load — controls loading state
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          if (isMounted) setUser(profile);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signup = async (email: string, password: string, nome: string, role = "assessor") => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, role },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
