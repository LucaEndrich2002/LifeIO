export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_request_limits: {
        Row: {
          attempts: number;
          day: string;
          last_requested_at: string;
          user_id: string;
        };
        Insert: {
          attempts: number;
          day: string;
          last_requested_at: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          day?: string;
          last_requested_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          id: string;
          month: string;
          name: string;
          revision: number;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency?: string;
          id: string;
          month: string;
          name: string;
          revision?: number;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          month?: string;
          name?: string;
          revision?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      calendar_events: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          removed_at: string | null;
          revision: number;
          starts_at: string;
          time_zone: string;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id: string;
          removed_at?: string | null;
          revision?: number;
          starts_at: string;
          time_zone: string;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          removed_at?: string | null;
          revision?: number;
          starts_at?: string;
          time_zone?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      entity_links: {
        Row: {
          budget_id: string | null;
          calendar_event_id: string | null;
          created_at: string;
          goal_id: string;
          id: string;
          relationship: string;
          removed_at: string | null;
          task_id: string | null;
          user_id: string;
        };
        Insert: {
          budget_id?: string | null;
          calendar_event_id?: string | null;
          created_at?: string;
          goal_id: string;
          id: string;
          relationship?: string;
          removed_at?: string | null;
          task_id?: string | null;
          user_id: string;
        };
        Update: {
          budget_id?: string | null;
          calendar_event_id?: string | null;
          created_at?: string;
          goal_id?: string;
          id?: string;
          relationship?: string;
          removed_at?: string | null;
          task_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entity_links_user_id_budget_id_fkey";
            columns: ["user_id", "budget_id"];
            isOneToOne: false;
            referencedRelation: "budgets";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "entity_links_user_id_calendar_event_id_fkey";
            columns: ["user_id", "calendar_event_id"];
            isOneToOne: false;
            referencedRelation: "calendar_events";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "entity_links_user_id_goal_id_fkey";
            columns: ["user_id", "goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "entity_links_user_id_task_id_fkey";
            columns: ["user_id", "task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount_minor: number;
          category: string | null;
          created_at: string;
          currency: string;
          end_month: string | null;
          id: string;
          name: string;
          onboarding_slot: number | null;
          recurrence: string;
          revision: number;
          spent_on: string | null;
          start_month: string | null;
          superseded_by: string | null;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          category?: string | null;
          created_at?: string;
          currency?: string;
          end_month?: string | null;
          id?: string;
          name: string;
          onboarding_slot?: number | null;
          recurrence?: string;
          revision?: number;
          spent_on?: string | null;
          start_month?: string | null;
          superseded_by?: string | null;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          category?: string | null;
          created_at?: string;
          currency?: string;
          end_month?: string | null;
          id?: string;
          name?: string;
          onboarding_slot?: number | null;
          recurrence?: string;
          revision?: number;
          spent_on?: string | null;
          start_month?: string | null;
          superseded_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_successor_owner";
            columns: ["user_id", "superseded_by"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "expenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      goal_contributions: {
        Row: {
          amount_minor: number;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          goal_id: string;
          id: string;
          note: string;
          paid_on: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          goal_id: string;
          id: string;
          note?: string;
          paid_on: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          goal_id?: string;
          id?: string;
          note?: string;
          paid_on?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_contributions_user_id_goal_id_fkey";
            columns: ["user_id", "goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      goal_milestones: {
        Row: {
          completed_at: string | null;
          created_at: string;
          goal_id: string;
          id: string;
          removed_at: string | null;
          revision: number;
          title: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          goal_id: string;
          id: string;
          removed_at?: string | null;
          revision?: number;
          title: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          goal_id?: string;
          id?: string;
          removed_at?: string | null;
          revision?: number;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_milestones_user_id_goal_id_fkey";
            columns: ["user_id", "goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      goal_rates: {
        Row: {
          amount_minor: number;
          currency: string;
          goal_id: string;
          month: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          currency?: string;
          goal_id: string;
          month: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          currency?: string;
          goal_id?: string;
          month?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_rates_user_id_goal_id_fkey";
            columns: ["user_id", "goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      goals: {
        Row: {
          created_at: string;
          currency: string | null;
          current_minor: number | null;
          deadline: string | null;
          id: string;
          kind: string;
          monthly_minor: number | null;
          name: string;
          onboarding_slot: number | null;
          revision: number;
          target_minor: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string | null;
          current_minor?: number | null;
          deadline?: string | null;
          id?: string;
          kind?: string;
          monthly_minor?: number | null;
          name: string;
          onboarding_slot?: number | null;
          revision?: number;
          target_minor?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string | null;
          current_minor?: number | null;
          deadline?: string | null;
          id?: string;
          kind?: string;
          monthly_minor?: number | null;
          name?: string;
          onboarding_slot?: number | null;
          revision?: number;
          target_minor?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      incomes: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          id: string;
          month: string;
          name: string;
          onboarding_slot: number | null;
          revision: number;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency?: string;
          id?: string;
          month: string;
          name: string;
          onboarding_slot?: number | null;
          revision?: number;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          month?: string;
          name?: string;
          onboarding_slot?: number | null;
          revision?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incomes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      onboarding: {
        Row: {
          tasks_status: string;
          completed_at: string | null;
          expenses_status: string;
          goal_status: string;
          income_status: string;
          month: string;
          revision: number;
          user_id: string;
        };
        Insert: {
          tasks_status?: string;
          completed_at?: string | null;
          expenses_status?: string;
          goal_status?: string;
          income_status?: string;
          month: string;
          revision?: number;
          user_id: string;
        };
        Update: {
          tasks_status?: string;
          completed_at?: string | null;
          expenses_status?: string;
          goal_status?: string;
          income_status?: string;
          month?: string;
          revision?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          currency: string;
          display_name: string;
          time_zone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          display_name: string;
          time_zone: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          display_name?: string;
          time_zone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          onboarding_slot: number | null;
          completed_at: string | null;
          created_at: string;
          due_on: string | null;
          id: string;
          priority: string;
          removed_at: string | null;
          revision: number;
          title: string;
          user_id: string;
        };
        Insert: {
          onboarding_slot?: number | null;
          completed_at?: string | null;
          created_at?: string;
          due_on?: string | null;
          id: string;
          priority: string;
          removed_at?: string | null;
          revision?: number;
          title: string;
          user_id: string;
        };
        Update: {
          onboarding_slot?: number | null;
          completed_at?: string | null;
          created_at?: string;
          due_on?: string | null;
          id?: string;
          priority?: string;
          removed_at?: string | null;
          revision?: number;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_ai_request: { Args: never; Returns: boolean };
      is_supported_time_zone: { Args: { candidate: string }; Returns: boolean };
      mutate_budget: {
        Args: {
          p_id: string;
          p_operation: string;
          p_payload: Json;
          p_revision: number;
        };
        Returns: undefined;
      };
      mutate_calendar_event: {
        Args: {
          p_ends_at?: string;
          p_id: string;
          p_operation: string;
          p_revision: number;
          p_starts_at?: string;
          p_time_zone?: string;
          p_title?: string;
        };
        Returns: undefined;
      };
      mutate_fixed_cost: {
        Args: {
          p_id: string;
          p_new_id: string;
          p_operation: string;
          p_payload: Json;
          p_revision: number;
        };
        Returns: undefined;
      };
      mutate_goal: {
        Args: {
          p_entry_id: string;
          p_id: string;
          p_operation: string;
          p_payload: Json;
          p_revision: number;
        };
        Returns: undefined;
      };
      mutate_goal_budget_link: {
        Args: {
          p_budget_id: string;
          p_goal_id: string;
          p_id: string;
          p_operation: string;
        };
        Returns: undefined;
      };
      mutate_goal_milestone: {
        Args: {
          p_goal_id: string;
          p_id: string;
          p_operation: string;
          p_revision: number;
          p_title?: string;
        };
        Returns: undefined;
      };
      mutate_goal_plan_link: {
        Args: {
          p_goal_id: string;
          p_id: string;
          p_kind: string;
          p_operation: string;
          p_target_id: string;
        };
        Returns: undefined;
      };
      mutate_money: {
        Args: {
          p_id: string;
          p_kind: string;
          p_operation: string;
          p_payload: Json;
          p_revision: number;
        };
        Returns: undefined;
      };
      mutate_personal_goal: {
        Args: {
          p_deadline?: string;
          p_id: string;
          p_name: string;
          p_operation: string;
          p_revision: number;
        };
        Returns: undefined;
      };
      mutate_task: {
        Args: {
          p_due_on?: string;
          p_id: string;
          p_operation: string;
          p_priority?: string;
          p_revision: number;
          p_title?: string;
        };
        Returns: undefined;
      };
      onboarding_amount: {
        Args: { allow_zero?: boolean; value: Json };
        Returns: number;
      };
      read_calendar_events: {
        Args: { p_end: string; p_page?: number; p_start: string };
        Returns: Json;
      };
      read_goal: { Args: { p_id: string; p_page?: number }; Returns: Json };
      read_goal_milestones: {
        Args: { p_goal_id: string; p_page?: number };
        Returns: Json;
      };
      read_home_goals: {
        Args: { p_day: string; p_page?: number };
        Returns: Json;
      };
      read_money_month: {
        Args: {
          p_expense_page?: number;
          p_income_page?: number;
          p_month: string;
        };
        Returns: Json;
      };
      read_tasks: {
        Args: {
          p_day: string;
          p_page?: number;
          p_status?: string;
          p_view?: string;
        };
        Returns: Json;
      };
      save_onboarding_step: {
        Args: { p_payload: Json; p_revision: number; p_step: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
