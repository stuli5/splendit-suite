import {
  getContracts, createContract, updateContract, deleteContract,
  getWorklogs, getAllWorklogs, upsertWorklog, deleteWorklog,
} from '@/lib/bodyshop'

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockContractDocs = [
  { id: 'ct1', data: () => ({ contractorName: 'Jan Novak', clientName: 'Acme', mdRateContractor: 800, mdRateClient: 1100, currency: 'CZK', status: 'active', startDate: '2024-01-01', createdAt: 1 }) },
]
const mockWorklogDocs = [
  { id: 'wl1', data: () => ({ contractId: 'ct1', month: '2024-03', daysWorked: 20, revenue: 22000, cost: 16000, profit: 6000, createdAt: 1 }) },
]

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  where:      jest.fn(),
  orderBy:    jest.fn(),
  getDocs:    jest.fn(),
  addDoc:     jest.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc:  jest.fn(() => Promise.resolve()),
  deleteDoc:  jest.fn(() => Promise.resolve()),
  doc:        jest.fn(),
}))

const { getDocs, addDoc, updateDoc, deleteDoc } = require('firebase/firestore')

describe('getContracts', () => {
  it('returns mapped contracts', async () => {
    getDocs.mockResolvedValueOnce({ docs: mockContractDocs })
    const contracts = await getContracts()
    expect(contracts).toHaveLength(1)
    expect(contracts[0].id).toBe('ct1')
    expect(contracts[0].contractorName).toBe('Jan Novak')
  })
})

describe('createContract', () => {
  it('returns new id with createdAt', async () => {
    const id = await createContract({
      contractorName: 'Eva Kova', clientName: 'Beta',
      mdRateContractor: 700, mdRateClient: 1000,
      currency: 'CZK', status: 'active', startDate: '2024-03-01',
    })
    expect(id).toBe('new-id')
    const callArg = addDoc.mock.calls.at(-1)?.[1]
    expect(typeof callArg.createdAt).toBe('number')
  })
})

describe('updateContract', () => {
  it('calls updateDoc, strips undefined fields', async () => {
    await updateContract('ct1', { status: 'ended', endDate: undefined })
    expect(updateDoc).toHaveBeenCalled()
    const callArg = updateDoc.mock.calls.at(-1)?.[1]
    expect(callArg.status).toBe('ended')
    expect('endDate' in callArg).toBe(false)
  })
})

describe('deleteContract', () => {
  it('calls deleteDoc', async () => {
    await deleteContract('ct1')
    expect(deleteDoc).toHaveBeenCalled()
  })
})

describe('getWorklogs', () => {
  it('returns worklogs sorted by month desc', async () => {
    getDocs.mockResolvedValueOnce({ docs: mockWorklogDocs })
    const logs = await getWorklogs('ct1')
    expect(logs).toHaveLength(1)
    expect(logs[0].month).toBe('2024-03')
  })
})

describe('getAllWorklogs', () => {
  it('returns all worklogs', async () => {
    getDocs.mockResolvedValueOnce({ docs: mockWorklogDocs })
    const logs = await getAllWorklogs()
    expect(logs).toHaveLength(1)
  })
})

describe('upsertWorklog', () => {
  it('creates new worklog when no existingId', async () => {
    await upsertWorklog('ct1', '2024-04', 20, 1100, 800)
    expect(addDoc).toHaveBeenCalled()
    const callArg = addDoc.mock.calls.at(-1)?.[1]
    expect(callArg.revenue).toBe(22000)  // 20 × 1100
    expect(callArg.cost).toBe(16000)     // 20 × 800
    expect(callArg.profit).toBe(6000)    // 22000 - 16000
  })

  it('updates existing worklog when existingId provided', async () => {
    await upsertWorklog('ct1', '2024-03', 18, 1100, 800, 'wl1')
    expect(updateDoc).toHaveBeenCalled()
    const callArg = updateDoc.mock.calls.at(-1)?.[1]
    expect(callArg.daysWorked).toBe(18)
  })
})

describe('deleteWorklog', () => {
  it('calls deleteDoc', async () => {
    await deleteWorklog('wl1')
    expect(deleteDoc).toHaveBeenCalled()
  })
})
