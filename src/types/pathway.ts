// Pathway system types
export interface Module {
  id: string;
  type: 'exam' | 'class' | 'courses' | 'activity' | 'custom';
  name: string;
  refId?: string; // Optional: reference to a subject, exam, etc.
}

export interface Stage {
  id: string;
  name: string;
  modules: Module[];
}

export interface Branch {
  id: string;
  name: string;
  stages: Stage[];
}

export interface Pathway {
  id: string;
  name: string;
  branches: Branch[];
  createdAt?: string;
  updatedAt?: string;
} 