import { getJobs, createJob, updateJob, deleteJob, publishJob, unpublishJob, submitApplication, getPublishedJobs } from '@/lib/jobs'

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockDocs = [
  { id: 'j1', data: () => ({ title: 'React Dev', slug: 'react-dev-abc', location: 'Prague', workMode: 'hybrid', type: 'full-time', currency: 'CZK', description: 'Build stuff.', tags: ['React'], status: 'published', createdAt: 1 }) },
  { id: 'j2', data: () => ({ title: 'QA Lead',   slug: 'qa-lead-xyz',  location: 'Brno',   workMode: 'remote', type: 'contract',  currency: 'CZK', description: 'Test stuff.', tags: ['QA'],    status: 'draft',     createdAt: 2 }) },
]

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  orderBy:    jest.fn(),
  where:      jest.fn(),
  getDocs:    jest.fn(() => Promise.resolve({ docs: mockDocs })),
  addDoc:     jest.fn(() => Promise.resolve({ id: 'new-job' })),
  updateDoc:  jest.fn(() => Promise.resolve()),
  deleteDoc:  jest.fn(() => Promise.resolve()),
  doc:        jest.fn(),
}))

const { addDoc, updateDoc, deleteDoc } = require('firebase/firestore')

describe('getJobs', () => {
  it('returns all jobs with id', async () => {
    const jobs = await getJobs()
    expect(jobs).toHaveLength(2)
    expect(jobs[0].id).toBe('j1')
    expect(jobs[0].title).toBe('React Dev')
  })
})

describe('getPublishedJobs', () => {
  it('returns only published jobs', async () => {
    const jobs = await getPublishedJobs()
    expect(jobs).toHaveLength(1)
    expect(jobs[0].status).toBe('published')
  })
})

describe('createJob', () => {
  it('returns new id', async () => {
    const id = await createJob({
      title: 'Dev', slug: 'dev-abc', location: 'Prague',
      workMode: 'remote', type: 'full-time', currency: 'CZK',
      description: 'Do dev things.', tags: [], status: 'draft',
    })
    expect(id).toBe('new-job')
  })

  it('includes createdAt', async () => {
    await createJob({
      title: 'Dev', slug: 'dev-abc2', location: 'Prague',
      workMode: 'remote', type: 'full-time', currency: 'CZK',
      description: 'Do dev things.', tags: [], status: 'draft',
    })
    const arg = addDoc.mock.calls.at(-1)?.[1]
    expect(typeof arg.createdAt).toBe('number')
  })
})

describe('updateJob', () => {
  it('calls updateDoc with data + updatedAt', async () => {
    await updateJob('j1', { title: 'Updated Dev' })
    const arg = updateDoc.mock.calls.at(-1)?.[1]
    expect(arg.title).toBe('Updated Dev')
    expect(typeof arg.updatedAt).toBe('number')
  })
})

describe('deleteJob', () => {
  it('calls deleteDoc', async () => {
    await deleteJob('j1')
    expect(deleteDoc).toHaveBeenCalled()
  })
})

describe('publishJob', () => {
  it('sets status to published and adds publishedAt', async () => {
    await publishJob('j1')
    const arg = updateDoc.mock.calls.at(-1)?.[1]
    expect(arg.status).toBe('published')
    expect(typeof arg.publishedAt).toBe('number')
  })
})

describe('unpublishJob', () => {
  it('sets status back to draft', async () => {
    await unpublishJob('j1')
    const arg = updateDoc.mock.calls.at(-1)?.[1]
    expect(arg.status).toBe('draft')
  })
})

describe('submitApplication', () => {
  it('returns new id', async () => {
    const id = await submitApplication({
      jobId: 'j1', jobTitle: 'React Dev',
      firstName: 'Jan', lastName: 'Novak', email: 'jan@example.com',
    })
    expect(id).toBe('new-job')
  })

  it('includes createdAt', async () => {
    await submitApplication({
      jobId: 'j1', jobTitle: 'React Dev',
      firstName: 'Eva', lastName: 'Nova', email: 'eva@example.com',
    })
    const arg = addDoc.mock.calls.at(-1)?.[1]
    expect(typeof arg.createdAt).toBe('number')
  })
})
