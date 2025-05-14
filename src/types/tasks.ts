import { Customer, Profile } from './database';

export interface TaskProject {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  chat_id: string | null;
}

export type ProjectRole = 'reader' | 'editor' | 'admin';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface TaskStage {
  id: string;
  name: string;
  organization_id: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  project?: TaskProject;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskWithRelations {
  id: string;
  title: string;
  description: string;
  due_date: string;
  due_time?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  user_id: string | null;
  customer_id: string | null;
  chat_id: string | null;
  appointment_id: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  stage_id: string | null;
  stage?: TaskStage;
  stage_order: number;
  is_archived: boolean;
  checklist: ChecklistItem[];
  customer?: Customer;
  assignees?: TaskAssignee[];
  labels?: TaskLabel[];
  project_id: string | null;
  project?: TaskProject;
}

// Tipo para agrupar tarefas por estágio
export interface TasksByStage {
  [stageId: string]: TaskWithRelations[];
} 