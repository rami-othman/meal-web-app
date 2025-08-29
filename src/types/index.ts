export interface Project {
  id: string;
  code: string;
  name: string;
  status: 'draft' | 'paused' | 'completed' | 'closed' | 'cancelled';
  lastRefresh: string;
  dateRange: string;
  country?: string;
  sector?: string;
  tags?: string[];
  donor?: string;
  implementingOrgs?: string[];
  sites?: string[];
  startDate?: string;
  endDate?: string;
  primaryManager?: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Charity Manager' | 'Monitoring Team' | 'Project Manager';
  status: 'active' | 'invited';
  projectCodes?: string[];
}

export interface Feedback {
  id: string;
  type: 'beneficiary' | 'monitoring';
  projectCode: string;
  summary: string;
  tags: ('quality' | 'access' | 'safety' | 'responsiveness')[];
  priority: 'low' | 'med' | 'high';
  status: 'new' | 'in_progress' | 'resolved';
  timestamp: string;
}

export type Page = 'home' | 'new-project' | 'feedback' | 'user-management' | 'archive';