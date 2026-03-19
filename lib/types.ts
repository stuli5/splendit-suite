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
  endDate?: string
  mdRateContractor: number // nákladová sazba / den
  mdRateClient: number     // prodejní sazba / den
  currency: Currency
  status: ContractStatus
  note?: string
  createdAt: number
}

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
