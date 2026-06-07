import '@testing-library/jest-dom'
import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

vi.mock('@/lib/firebase', () => ({
  app: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(() => () => {}),
    signOut: vi.fn(() => Promise.resolve()),
  },
  db: {},
  googleProvider: {},
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: null) => void) => {
    callback(null)
    return () => {}
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  setDoc: vi.fn(() => Promise.resolve()),
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
  Toaster: () => null,
}))

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
