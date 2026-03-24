import { getDeals, createDeal, updateDeal, deleteDeal } from '@/lib/deals'

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockDocs = [
  { id: 'd1', data: () => ({ title: 'React Dev', companyName: 'Acme', stage: 'lead', feeType: 'percentage', feeValue: 18, currency: 'CZK', probability: 50, createdAt: 1 }) },
  { id: 'd2', data: () => ({ title: 'QA Lead',   companyName: 'Beta', stage: 'won',  feeType: 'fixed', feeValue: 80000, currency: 'CZK', probability: 100, createdAt: 2 }) },
]

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  orderBy:    jest.fn(),
  getDocs:    jest.fn(() => Promise.resolve({ docs: mockDocs })),
  addDoc:     jest.fn(() => Promise.resolve({ id: 'new-deal' })),
  updateDoc:  jest.fn(() => Promise.resolve()),
  deleteDoc:  jest.fn(() => Promise.resolve()),
  doc:        jest.fn(),
}))

const { addDoc, updateDoc, deleteDoc } = require('firebase/firestore')

describe('getDeals', () => {
  it('returns mapped deals with id', async () => {
    const deals = await getDeals()
    expect(deals).toHaveLength(2)
    expect(deals[0].id).toBe('d1')
    expect(deals[0].title).toBe('React Dev')
  })
})

describe('createDeal', () => {
  it('returns new id', async () => {
    const id = await createDeal({
      title: 'Senior Dev', companyName: 'Acme',
      stage: 'lead', feeType: 'percentage', feeValue: 18,
      currency: 'CZK', probability: 50,
    })
    expect(id).toBe('new-deal')
  })

  it('includes createdAt timestamp', async () => {
    await createDeal({ title: 'Dev', companyName: 'X', stage: 'qualified', feeType: 'fixed', feeValue: 50000, currency: 'CZK', probability: 60 })
    const callArg = addDoc.mock.calls.at(-1)?.[1]
    expect(typeof callArg.createdAt).toBe('number')
  })
})

describe('updateDeal', () => {
  it('calls updateDoc with correct data', async () => {
    await updateDeal('d1', { stage: 'proposal' })
    expect(updateDoc).toHaveBeenCalled()
    expect(updateDoc.mock.calls.at(-1)?.[1].stage).toBe('proposal')
  })
})

describe('deleteDeal', () => {
  it('calls deleteDoc', async () => {
    await deleteDeal('d1')
    expect(deleteDoc).toHaveBeenCalled()
  })
})
