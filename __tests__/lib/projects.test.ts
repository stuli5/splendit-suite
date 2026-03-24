import { getProjects, getProject, createProject, updateProject, deleteProject } from '@/lib/projects'

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockDocs = [
  { id: 'p1', data: () => ({ positionName: 'Dev', companyName: 'Acme', createdAt: 1 }) },
  { id: 'p2', data: () => ({ positionName: 'QA',  companyName: 'Beta', createdAt: 2 }) },
]

const mockAddDocRef = { id: 'new-id' }

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  orderBy:    jest.fn(),
  getDocs:    jest.fn(() => Promise.resolve({ docs: mockDocs })),
  getDoc:     jest.fn(),
  addDoc:     jest.fn(() => Promise.resolve(mockAddDocRef)),
  updateDoc:  jest.fn(() => Promise.resolve()),
  deleteDoc:  jest.fn(() => Promise.resolve()),
  doc:        jest.fn((_, __, id) => ({ id })),
}))

const { getDocs, getDoc, addDoc, updateDoc, deleteDoc } = require('firebase/firestore')

describe('getProjects', () => {
  it('returns mapped projects with id', async () => {
    const projects = await getProjects()
    expect(projects).toHaveLength(2)
    expect(projects[0].id).toBe('p1')
    expect(projects[0].positionName).toBe('Dev')
    expect(projects[1].id).toBe('p2')
  })
})

describe('getProject', () => {
  it('returns project when exists', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, id: 'p1', data: () => ({ positionName: 'Dev' }) })
    const project = await getProject('p1')
    expect(project).not.toBeNull()
    expect(project?.id).toBe('p1')
  })

  it('returns null when not found', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false })
    const project = await getProject('missing')
    expect(project).toBeNull()
  })
})

describe('createProject', () => {
  it('returns new document id', async () => {
    const id = await createProject({
      positionName: 'Dev', companyId: 'c1', companyName: 'Acme',
      phases: ['contacted'], type: 'recruitment', status: 'active',
      cooperationType: 'HPP', requiredCount: 1,
    })
    expect(id).toBe('new-id')
    expect(addDoc).toHaveBeenCalled()
  })

  it('includes createdAt timestamp', async () => {
    await createProject({
      positionName: 'Dev', companyId: 'c1', companyName: 'Acme',
      phases: [], type: 'recruitment', status: 'active',
      cooperationType: 'HPP', requiredCount: 1,
    })
    const callArg = addDoc.mock.calls.at(-1)?.[1]
    expect(callArg.createdAt).toBeDefined()
    expect(typeof callArg.createdAt).toBe('number')
  })
})

describe('updateProject', () => {
  it('calls updateDoc with correct data', async () => {
    await updateProject('p1', { positionName: 'Updated Dev' })
    expect(updateDoc).toHaveBeenCalled()
    const callArg = updateDoc.mock.calls.at(-1)?.[1]
    expect(callArg.positionName).toBe('Updated Dev')
  })
})

describe('deleteProject', () => {
  it('calls deleteDoc', async () => {
    await deleteProject('p1')
    expect(deleteDoc).toHaveBeenCalled()
  })
})
