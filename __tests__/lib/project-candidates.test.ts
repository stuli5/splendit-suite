import { getProjectCandidates, addCandidateToProject, updateCandidatePhase, removeCandidateFromProject } from '@/lib/project-candidates'

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockDocs = [
  { id: 'pc1', data: () => ({ projectId: 'p1', candidateId: 'c1', candidateFirstName: 'Jan', candidateLastName: 'Novak', candidatePosition: 'Dev', phase: 'contacted', addedAt: 1 }) },
]

jest.mock('firebase/firestore', () => ({
  collection:  jest.fn(),
  query:       jest.fn(),
  where:       jest.fn(),
  getDocs:     jest.fn(() => Promise.resolve({ docs: mockDocs })),
  addDoc:      jest.fn(() => Promise.resolve({ id: 'new-pc' })),
  updateDoc:   jest.fn(() => Promise.resolve()),
  deleteDoc:   jest.fn(() => Promise.resolve()),
  doc:         jest.fn(),
  arrayUnion:  jest.fn((...args: unknown[]) => args[0]),
}))

const { addDoc, updateDoc, deleteDoc } = require('firebase/firestore')

describe('getProjectCandidates', () => {
  it('returns candidates for a project', async () => {
    const pcs = await getProjectCandidates('p1')
    expect(pcs).toHaveLength(1)
    expect(pcs[0].candidateFirstName).toBe('Jan')
  })
})

describe('addCandidateToProject', () => {
  it('returns new id and seeds phaseHistory', async () => {
    const id = await addCandidateToProject({
      projectId: 'p1', candidateId: 'c2',
      candidateFirstName: 'Eva', candidateLastName: 'Kova',
      candidatePosition: 'QA', phase: 'contacted',
    })
    expect(id).toBe('new-pc')
    const callArg = addDoc.mock.calls.at(-1)?.[1]
    expect(Array.isArray(callArg.phaseHistory)).toBe(true)
    expect(callArg.phaseHistory[0].phase).toBe('contacted')
    expect(typeof callArg.phaseHistory[0].ts).toBe('number')
  })
})

describe('updateCandidatePhase', () => {
  it('calls updateDoc with new phase and appends phaseHistory entry', async () => {
    await updateCandidatePhase('pc1', 'interview')
    expect(updateDoc).toHaveBeenCalled()
    const callArg = updateDoc.mock.calls.at(-1)?.[1]
    expect(callArg.phase).toBe('interview')
    // arrayUnion mock returns the first arg — check it's a history entry object
    expect(callArg.phaseHistory).toBeDefined()
  })
})

describe('removeCandidateFromProject', () => {
  it('calls deleteDoc', async () => {
    await removeCandidateFromProject('pc1')
    expect(deleteDoc).toHaveBeenCalled()
  })
})
