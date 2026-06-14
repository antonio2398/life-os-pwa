export type LifeAreaId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SwotType = "strength" | "weakness" | "opportunity" | "threat";
export type AssetType = "cash" | "investment" | "real_estate" | "business" | "crypto" | "other";
export type LiabilityType = "credit_card" | "personal_loan" | "mortgage" | "auto_loan" | "other";
export type TaskPriority = "high" | "medium" | "low";
export type HabitFrequency = "daily" | "weekly" | "monthly";

export interface LifeArea { id: number; name: string; weight: number; color: string; icon: string; }
export interface DiagnosticScore { id: string; user_id: string; life_area_id: number; score: number; notes: string | null; evaluated_at: string; target_90d: number | null; }
export interface IkigaiProfile { id: string; user_id: string; what_you_love: string[]; what_you_are_good_at: string[]; what_world_needs: string[]; what_you_can_be_paid_for: string[]; ikigai_statement: string | null; updated_at: string; }
export interface SwotItem { id: string; user_id: string; type: SwotType; content: string; source: "manual" | "ai"; created_at: string; }
export interface Dream { id: string; user_id: string; title: string; life_area_id: number; priority: string; status: string; estimated_progress: number; description: string | null; created_at: string; }
export interface Goal { id: string; user_id: string; dream_id: string | null; life_area_id: number; title: string; description: string | null; target_date: string; progress: number; status: string; created_at: string; }
export interface Task { id: string; user_id: string; project_id: string | null; life_area_id: number; title: string; priority: TaskPriority; status: string; due_date: string | null; completed_at: string | null; created_at: string; }
export interface Habit { id: string; user_id: string; life_area_id: number; title: string; frequency: HabitFrequency; target_per_week: number; color: string; is_active: boolean; created_at: string; }
export interface HabitLog { id: string; habit_id: string; user_id: string; logged_date: string; completed: boolean; }
export interface Asset { id: string; user_id: string; type: AssetType; name: string; current_value: number; role: string; notes: string | null; }
export interface Liability { id: string; user_id: string; type: LiabilityType; name: string; balance: number; interest_rate: number; monthly_payment: number; priority: string; }