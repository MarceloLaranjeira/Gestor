export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acoes_movimento: {
        Row: {
          created_at: string
          data_prazo: string | null
          descricao: string
          id: string
          movimento_id: string
          responsavel: string
          status: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_prazo?: string | null
          descricao?: string
          id?: string
          movimento_id: string
          responsavel?: string
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_prazo?: string | null
          descricao?: string
          id?: string
          movimento_id?: string
          responsavel?: string
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_movimento_movimento_id_fkey"
            columns: ["movimento_id"]
            isOneToOne: false
            referencedRelation: "movimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      coordenacoes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      demandas: {
        Row: {
          categoria: string
          created_at: string
          data_prazo: string | null
          descricao: string
          id: string
          prioridade: string
          responsavel: string
          solicitante: string
          status: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_prazo?: string | null
          descricao?: string
          id?: string
          prioridade?: string
          responsavel?: string
          solicitante?: string
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          data_prazo?: string | null
          descricao?: string
          id?: string
          prioridade?: string
          responsavel?: string
          solicitante?: string
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          created_at: string
          data: string
          descricao: string
          hora: string
          id: string
          local: string
          participantes: number
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string
          hora?: string
          id?: string
          local?: string
          participantes?: number
          tipo?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          hora?: string
          id?: string
          local?: string
          participantes?: number
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      movimentos: {
        Row: {
          cor: string
          created_at: string
          descricao: string
          icone: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimentos_financeiros: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          id: string
          observacao: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data?: string
          descricao: string
          id?: string
          observacao?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          observacao?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          bairro: string
          cidade: string
          created_at: string
          email: string
          id: string
          nome: string
          tags: string[]
          telefone: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bairro?: string
          cidade?: string
          created_at?: string
          email?: string
          id?: string
          nome: string
          tags?: string[]
          telefone?: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bairro?: string
          cidade?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          tags?: string[]
          telefone?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      secoes: {
        Row: {
          coordenacao_id: string
          created_at: string
          id: string
          ordem: number | null
          titulo: string
        }
        Insert: {
          coordenacao_id: string
          created_at?: string
          id?: string
          ordem?: number | null
          titulo: string
        }
        Update: {
          coordenacao_id?: string
          created_at?: string
          id?: string
          ordem?: number | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "secoes_coordenacao_id_fkey"
            columns: ["coordenacao_id"]
            isOneToOne: false
            referencedRelation: "coordenacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          canal: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          motivo: string | null
          responsavel: string | null
          secao_id: string
          status: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          canal?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          motivo?: string | null
          responsavel?: string | null
          secao_id: string
          status?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          canal?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          motivo?: string | null
          responsavel?: string | null
          secao_id?: string
          status?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coordenacoes: {
        Row: {
          coordenacao_id: string
          id: string
          user_id: string
        }
        Insert: {
          coordenacao_id: string
          id?: string
          user_id: string
        }
        Update: {
          coordenacao_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coordenacoes_coordenacao_id_fkey"
            columns: ["coordenacao_id"]
            isOneToOne: false
            referencedRelation: "coordenacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_coordenacao_access: {
        Args: { _coord_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gestor" | "assessor" | "coordenador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["gestor", "assessor", "coordenador"],
    },
  },
} as const
