// ─── Společnosti ─────────────────────────────────────────────────────────────

export type CompanyType = 'klient' | 'partner' | 'dodavatel' | 'ostatní'

export interface ContactPerson {
  name:     string
  email:    string
  phone:    string
  position: string
}

export interface Company {
  id: string
  ico: string
  name: string
  legalForm?: string
  street?: string
  city?: string
  zip?: string
  email?: string
  phone?: string
  web?: string
  type: CompanyType
  contacts: ContactPerson[]
  note?: string
  createdAt: number
}

// ─── CRM Candidates ──────────────────────────────────────────────────────────

export type CRMStage = 'new' | 'screening' | 'interview' | 'offer'

export interface CRMCandidate {
  id:        string
  firstName: string
  lastName:  string
  position:  string
  stage?:    CRMStage
  linkedIn?: string
  gitHub?:   string
  email?:    string
  phone?:    string
  note?:     string
  skills?:   string[]
  imsId?:    string
  cvUrl?:    string
  cvName?:   string
  createdAt: number
}

// ─── Project Candidates (pipeline) ───────────────────────────────────────────

export interface PhaseHistoryEntry {
  phase: ProjectPhase
  ts:    number
}

export interface ProjectCandidate {
  id:                string
  projectId:         string
  candidateId:       string
  candidateFirstName: string
  candidateLastName:  string
  candidatePosition:  string
  linkedIn?:         string
  gitHub?:           string
  phase:             ProjectPhase
  phaseHistory?:     PhaseHistoryEntry[]
  note?:             string
  addedAt:           number
}

// ─── Bodyshop ────────────────────────────────────────────────────────────────

export type ContractStatus = 'active' | 'ended'
export type Currency = 'CZK' | 'EUR'

export interface Contract {
  id: string
  contractorName: string
  clientName: string
  projectId?: string
  candidateId?: string
  startDate: string        // ISO date YYYY-MM-DD
  endDate?: string         // koniec objednávky
  mdRateContractor: number // nákladová sazba / den
  mdRateClient: number     // prodejní sazba / den
  currency: Currency
  status: ContractStatus
  invoiceDaysContractor?: number  // splatnosť faktúry — kandidát (dni)
  invoiceDaysClient?: number      // splatnosť faktúry — klient (dni)
  managerName?: string
  managerRole?: string
  note?: string
  createdAt: number
}

// ─── Meet Visualizer ─────────────────────────────────────────────────────────

export type MeetType = 'Planning' | 'Retrospective' | 'Standup' | 'Review' | '1:1' | 'Stakeholder' | 'Other'

export interface ActionItem {
  done:     boolean
  task:     string
  assignee: string
  deadline: string
}

export interface Meet {
  id:           string
  name:         string
  date:         string   // YYYY-MM-DD
  type:         MeetType
  tribe:        string
  participants: string   // comma-separated names
  agenda:       string
  transcript:   string
  actions:      string   // serialized action items
  notes:        string
  createdAt:    number
}

export interface Person {
  id:         string
  name:       string
  role:       string
  tribe:      string
  company:    string
  level:      string
  supervisor: string   // name of supervisor person
  email:      string
  phone:      string
  photo:      string   // base64 data URL
  createdAt:  number
}

export interface Tribe {
  id:        string
  name:      string
  color:     string
  createdAt: number
}

// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectPhase =
  | 'contacted'
  | 'presentation'
  | 'interview'
  | 'rejected'
  | 'onboarding'
  | 'closed'

export type ProjectType        = 'recruitment' | 'contracting' | 'other'
export type ProjectStatus      = 'active' | 'on-hold' | 'closed'
export type CooperationType    = 'HPP' | 'BS' | 'both'

export interface Project {
  id:              string
  positionName:    string
  companyId:       string
  companyName:     string
  phases:          ProjectPhase[]
  type:            ProjectType
  status:          ProjectStatus
  cooperationType: CooperationType
  salary?:         string
  requiredCount:   number
  responsible?:    string
  description?:    string
  jobDescription?: string
  createdAt:       number
}

// ─── IMS ─────────────────────────────────────────────────────────────────────

export type CandidateStatus = 'pending' | 'scheduled' | 'done' | 'second' | 'hired' | 'rejected'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'critical'

export interface AnswerOption {
  text: string
  checked: boolean
  wrong?: boolean
}

export interface QuestionAnswer {
  questionNumber: number
  questionTitle: string
  difficulty: Difficulty
  points: number
  earnedPoints: number
  maxPoints: number
  answers: AnswerOption[]
}

export interface CandidateRating {
  stars: number
  notes: string
  status: CandidateStatus
  ratedAt: number
  updatedAt: number
}

export interface Candidate {
  id: string
  name: string
  firstName?: string
  lastName?: string
  position: string
  experience: string
  email?: string
  phone?: string
  score: number
  totalPoints: number
  maxPoints: number
  easyScore: number
  mediumScore: number
  hardScore: number
  criticalScore?: number
  timestamp: number
  finalConclusion?: string
  conclusionUpdated?: number
  answers?: QuestionAnswer[]
  rating?: CandidateRating
}

// ─── Deal Radar ──────────────────────────────────────────────────────────────

export type DealStage =
  | 'lead'
  | 'qualified'
  | 'proposal'
  | 'search'
  | 'offer'
  | 'won'
  | 'lost'

export type FeeType = 'percentage' | 'fixed'
export type DealCurrency = 'CZK' | 'EUR'

export interface Deal {
  id:           string
  title:        string          // position name
  companyId?:   string
  companyName:  string
  stage:        DealStage
  feeType:      FeeType
  feeValue:     number          // % or fixed amount
  salaryCzk?:   number          // annual salary estimate (for % deals)
  currency:     DealCurrency
  probability:  number          // 0-100
  expectedClose?: string        // YYYY-MM-DD
  responsible?: string
  note?:        string
  createdAt:    number
}

// ─── Activity & Notifications ─────────────────────────────────────────────────

export interface ActorInfo {
  uid:         string
  displayName: string
  email:       string
}

export type ActivityEntityType = 'candidate' | 'project' | 'project_candidate'

export type ActivityAction =
  | 'candidate.created'
  | 'candidate.updated'
  | 'candidate.stage_changed'
  | 'candidate.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project_candidate.added'
  | 'project_candidate.phase_changed'
  | 'project_candidate.removed'

export interface ActivityLogEntry {
  id:         string
  action:     ActivityAction
  entityType: ActivityEntityType
  entityId:   string
  entityName: string
  actor:      ActorInfo
  metadata?:  Record<string, string | number | boolean | null>
  ts:         number
}

export type NotificationType = 'info' | 'success' | 'warning'

export interface AppNotification {
  id:         string
  userId:     string
  title:      string
  body:       string
  entityType: ActivityEntityType
  entityId:   string
  type:       NotificationType
  read:       boolean
  actorUid:   string
  ts:         number
}

export interface TeamMember {
  uid:         string
  displayName: string
  email:       string
  updatedAt:   number
}

// ─── Bodyshop ────────────────────────────────────────────────────────────────

export interface Worklog {
  id: string
  contractId: string
  month: string            // YYYY-MM
  daysWorked: number
  revenue: number          // daysWorked * mdRateClient
  cost: number             // daysWorked * mdRateContractor
  profit: number           // revenue - cost
  createdAt: number
}
