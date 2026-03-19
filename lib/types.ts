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
