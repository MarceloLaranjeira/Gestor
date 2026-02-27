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
      apoiadores: {
        Row: {
          beneficios_relacionados: string
          cargo: string
          cidade: string
          created_at: string
          data_nascimento: string | null
          funcao: string
          grau_influencia: number
          id: string
          nome: string
          organizacao: string
          origem_contato: string
          prioridade: Database["public"]["Enums"]["prioridade_apoiador"]
          regiao: string
          resumo: string
          segmento: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficios_relacionados?: string
          cargo?: string
          cidade?: string
          created_at?: string
          data_nascimento?: string | null
          funcao?: string
          grau_influencia?: number
          id?: string
          nome: string
          organizacao?: string
          origem_contato?: string
          prioridade?: Database["public"]["Enums"]["prioridade_apoiador"]
          regiao?: string
          resumo?: string
          segmento?: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficios_relacionados?: string
          cargo?: string
          cidade?: string
          created_at?: string
          data_nascimento?: string | null
          funcao?: string
          grau_influencia?: number
          id?: string
          nome?: string
          organizacao?: string
          origem_contato?: string
          prioridade?: Database["public"]["Enums"]["prioridade_apoiador"]
          regiao?: string
          resumo?: string
          segmento?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campanha_assessores: {
        Row: {
          coordenador_id: string | null
          created_at: string
          email: string
          funcao: string
          id: string
          nome: string
          telefone: string
          updated_at: string
        }
        Insert: {
          coordenador_id?: string | null
          created_at?: string
          email?: string
          funcao?: string
          id?: string
          nome: string
          telefone?: string
          updated_at?: string
        }
        Update: {
          coordenador_id?: string | null
          created_at?: string
          email?: string
          funcao?: string
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_assessores_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "campanha_coordenadores"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_calhas: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          municipios: number
          nome: string
          percentual_cristaos: number
          potencial_votos: number
          regiao: string
          updated_at: string
          votos_validos: number
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipios?: number
          nome: string
          percentual_cristaos?: number
          potencial_votos?: number
          regiao?: string
          updated_at?: string
          votos_validos?: number
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipios?: number
          nome?: string
          percentual_cristaos?: number
          potencial_votos?: number
          regiao?: string
          updated_at?: string
          votos_validos?: number
        }
        Relationships: []
      }
      campanha_contatos: {
        Row: {
          coordenador_id: string | null
          created_at: string
          data_contato: string
          id: string
          observacoes: string
          resumo: string
          tipo: string
          user_id: string
        }
        Insert: {
          coordenador_id?: string | null
          created_at?: string
          data_contato?: string
          id?: string
          observacoes?: string
          resumo?: string
          tipo?: string
          user_id: string
        }
        Update: {
          coordenador_id?: string | null
          created_at?: string
          data_contato?: string
          id?: string
          observacoes?: string
          resumo?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_contatos_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "campanha_coordenadores"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_coordenadores: {
        Row: {
          calha_id: string | null
          created_at: string
          email: string
          id: string
          nome: string
          status: string
          telefone: string
          ultimo_contato: string | null
          updated_at: string
        }
        Insert: {
          calha_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nome: string
          status?: string
          telefone?: string
          ultimo_contato?: string | null
          updated_at?: string
        }
        Update: {
          calha_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          telefone?: string
          ultimo_contato?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_coordenadores_calha_id_fkey"
            columns: ["calha_id"]
            isOneToOne: false
            referencedRelation: "campanha_calhas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_locais: {
        Row: {
          calha_id: string | null
          created_at: string
          descricao: string
          endereco: string
          id: string
          latitude: number
          longitude: number
          nome: string
          tipo: string
          updated_at: string
          user_id: string
          visita_id: string | null
        }
        Insert: {
          calha_id?: string | null
          created_at?: string
          descricao?: string
          endereco?: string
          id?: string
          latitude: number
          longitude: number
          nome: string
          tipo?: string
          updated_at?: string
          user_id: string
          visita_id?: string | null
        }
        Update: {
          calha_id?: string | null
          created_at?: string
          descricao?: string
          endereco?: string
          id?: string
          latitude?: number
          longitude?: number
          nome?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          visita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanha_locais_calha_id_fkey"
            columns: ["calha_id"]
            isOneToOne: false
            referencedRelation: "campanha_calhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_locais_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "campanha_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_municipios: {
        Row: {
          apoiadores_estimados: number
          calha_id: string | null
          created_at: string
          id: string
          nome: string
          percentual_cristaos: number
          updated_at: string
          votos_validos: number
        }
        Insert: {
          apoiadores_estimados?: number
          calha_id?: string | null
          created_at?: string
          id?: string
          nome: string
          percentual_cristaos?: number
          updated_at?: string
          votos_validos?: number
        }
        Update: {
          apoiadores_estimados?: number
          calha_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          percentual_cristaos?: number
          updated_at?: string
          votos_validos?: number
        }
        Relationships: [
          {
            foreignKeyName: "campanha_municipios_calha_id_fkey"
            columns: ["calha_id"]
            isOneToOne: false
            referencedRelation: "campanha_calhas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_visitas: {
        Row: {
          calha_id: string | null
          coordenador_id: string | null
          created_at: string
          data_visita: string
          id: string
          objetivo: string
          observacoes: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calha_id?: string | null
          coordenador_id?: string | null
          created_at?: string
          data_visita: string
          id?: string
          objetivo?: string
          observacoes?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calha_id?: string | null
          coordenador_id?: string | null
          created_at?: string
          data_visita?: string
          id?: string
          objetivo?: string
          observacoes?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_visitas_calha_id_fkey"
            columns: ["calha_id"]
            isOneToOne: false
            referencedRelation: "campanha_calhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_visitas_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "campanha_coordenadores"
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
          google_synced: boolean
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
          google_synced?: boolean
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
          google_synced?: boolean
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
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      historico_apoiadores: {
        Row: {
          apoiador_id: string
          created_at: string
          data: string
          data_prevista: string | null
          descricao: string
          id: string
          responsavel: string
          status: Database["public"]["Enums"]["status_historico"]
          tipo: string
          user_id: string
        }
        Insert: {
          apoiador_id: string
          created_at?: string
          data?: string
          data_prevista?: string | null
          descricao?: string
          id?: string
          responsavel?: string
          status?: Database["public"]["Enums"]["status_historico"]
          tipo?: string
          user_id: string
        }
        Update: {
          apoiador_id?: string
          created_at?: string
          data?: string
          data_prevista?: string | null
          descricao?: string
          id?: string
          responsavel?: string
          status?: Database["public"]["Enums"]["status_historico"]
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_apoiadores_apoiador_id_fkey"
            columns: ["apoiador_id"]
            isOneToOne: false
            referencedRelation: "apoiadores"
            referencedColumns: ["id"]
          },
        ]
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
      tarefas_coordenacao: {
        Row: {
          assessor_id: string | null
          coordenador_id: string | null
          created_at: string
          data_limite: string | null
          descricao: string
          id: string
          status: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessor_id?: string | null
          coordenador_id?: string | null
          created_at?: string
          data_limite?: string | null
          descricao?: string
          id?: string
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessor_id?: string | null
          coordenador_id?: string | null
          created_at?: string
          data_limite?: string | null
          descricao?: string
          id?: string
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_coordenacao_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "campanha_assessores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_coordenacao_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "campanha_coordenadores"
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
      prioridade_apoiador: "alta" | "media" | "baixa"
      status_historico: "concluido" | "pendente" | "em_andamento"
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
      prioridade_apoiador: ["alta", "media", "baixa"],
      status_historico: ["concluido", "pendente", "em_andamento"],
    },
  },
} as const
