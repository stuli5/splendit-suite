import { getCRMCandidates, createCRMCandidate, updateCRMCandidate, deleteCRMCandidate } from '@/lib/crm-candidates'

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockDocs = [
  { id: 'c1', data: () => ({ firstName: 'Jan', lastName: 'Novak', position: 'Dev', createdAt: 1 }) },
  { id: 'c2', data: () => ({ firstName: 'Eva', lastName: 'Kovar', position: 'QA',  createdAt: 2 }) },
]

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  orderBy:    jest.fn(),
  getDocs:    jest.fn(() => Promise.resolve({ docs: mockDocs })),
  addDoc:     jest.fn(() => Promise.resolve({ id: 'new-candidate' })),
  updateDoc:  jest.fn(() => Promise.resolve()),
  deleteDoc:  jest.fn(() => Promise.resolve()),
  doc:        jest.fn(),
}))

const { addDoc, updateDoc, deleteDoc } = require('firebase/firestore')

describe('getCRMCandidates', () => {
  it('returns candidates with id', async () => {
    const candidates = await getCRMCandidates()
    expect(candidates).toHaveLength(2)
    expect(candidates[0].id).toBe('c1')
    expect(candidates[0].firstName).toBe('Jan')
  })
})

describe('createCRMCandidate', () => {
  it('returns new id', async () => {
    const id = await createCRMCandidate({ firstName: 'Peter', lastName: 'Beno', position: 'Dev' })
    expect(id).toBe('new-candidate')
  })

  it('includes createdAt', async () => {
    await createCRMCandidate({ firstName: 'Peter', lastName: 'Beno', position: 'Dev' })
    const callArg = addDoc.mock.calls.at(-1)?.[1]
    expect(callArg.createdAt).toBeDefined()
  })
})

describe('updateCRMCandidate', () => {
  it('calls updateDoc', async () => {
    await updateCRMCandidate('c1', { position: 'Senior Dev' })
    expect(updateDoc).toHaveBeenCalled()
  })
})

describe('deleteCRMCandidate', () => {
  it('calls deleteDoc', async () => {
    await deleteCRMCandidate('c1')
    expect(deleteDoc).toHaveBeenCalled()
  })
})
