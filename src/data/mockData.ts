import { Project, User, Feedback } from '../types';

export const mockProjects: Project[] = [
  {
    id: '1',
    code: 'WFP-2024-001',
    name: 'Emergency Food Distribution Program',
    status: 'completed',
    lastRefresh: '2 hours ago',
    dateRange: 'Jan 2024 - Mar 2024',
    country: 'Syria',
    sector: 'Food Security',
    tags: ['emergency', 'food'],
    donor: 'WFP',
    primaryManager: 'Sarah Johnson'
  },
  {
    id: '2',
    code: 'UNICEF-2024-002',
    name: 'Child Education Initiative',
    status: 'paused',
    lastRefresh: '1 day ago',
    dateRange: 'Feb 2024 - Jun 2024',
    country: 'Lebanon',
    sector: 'Education',
    tags: ['education', 'children'],
    donor: 'UNICEF',
    primaryManager: 'Ahmed Hassan'
  },
  {
    id: '3',
    code: 'UNHCR-2024-003',
    name: 'Refugee Shelter Construction',
    status: 'draft',
    lastRefresh: '3 hours ago',
    dateRange: 'Mar 2024 - Aug 2024',
    country: 'Jordan',
    sector: 'Shelter',
    tags: ['shelter', 'construction'],
    donor: 'UNHCR',
    primaryManager: 'Maria Rodriguez'
  },
  {
    id: '4',
    code: 'WHO-2024-004',
    name: 'Healthcare Access Program',
    status: 'closed',
    lastRefresh: '5 hours ago',
    dateRange: 'Jan 2024 - Dec 2024',
    country: 'Yemen',
    sector: 'Health',
    tags: ['health', 'access'],
    donor: 'WHO',
    primaryManager: 'Dr. James Wilson'
  },
  {
    id: '5',
    code: 'EU-2024-005',
    name: 'Water Infrastructure Development',
    status: 'cancelled',
    lastRefresh: '1 week ago',
    dateRange: 'Apr 2024 - Oct 2024',
    country: 'Iraq',
    sector: 'WASH',
    tags: ['water', 'infrastructure'],
    donor: 'European Union',
    primaryManager: 'Lisa Chen'
  },
  {
    id: '6',
    code: 'USAID-2024-006',
    name: 'Livelihood Support Program',
    status: 'completed',
    lastRefresh: '2 days ago',
    dateRange: 'May 2024 - Sep 2024',
    country: 'Afghanistan',
    sector: 'Livelihoods',
    tags: ['livelihoods', 'support'],
    donor: 'USAID',
    primaryManager: 'Michael Brown'
  }
];

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@charity.org',
    role: 'Project Manager',
    status: 'active',
    projectCodes: ['WFP-2024-001', 'UNICEF-2024-002']
  },
  {
    id: '2',
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@charity.org',
    role: 'Monitoring Team',
    status: 'active',
    projectCodes: ['UNICEF-2024-002']
  },
  {
    id: '3',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@charity.org',
    role: 'Charity Manager',
    status: 'invited'
  },
  {
    id: '4',
    name: 'Dr. James Wilson',
    email: 'james.wilson@charity.org',
    role: 'Project Manager',
    status: 'active',
    projectCodes: ['WHO-2024-004']
  }
];

export const mockFeedback: Feedback[] = [
  {
    id: '1',
    type: 'beneficiary',
    projectCode: 'WFP-2024-001',
    summary: 'Food distribution was delayed by 2 days in Aleppo region',
    tags: ['access', 'responsiveness'],
    priority: 'high',
    status: 'in_progress',
    timestamp: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    type: 'monitoring',
    projectCode: 'UNICEF-2024-002',
    summary: 'School supplies quality below expected standards',
    tags: ['quality'],
    priority: 'med',
    status: 'new',
    timestamp: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    type: 'beneficiary',
    projectCode: 'WHO-2024-004',
    summary: 'Safety concerns at clinic location in Sana\'a',
    tags: ['safety'],
    priority: 'high',
    status: 'resolved',
    timestamp: '2024-01-13T09:15:00Z'
  },
  {
    id: '4',
    type: 'monitoring',
    projectCode: 'USAID-2024-006',
    summary: 'Training materials missing from distribution package',
    tags: ['quality', 'access'],
    priority: 'low',
    status: 'new',
    timestamp: '2024-01-12T16:45:00Z'
  }
];