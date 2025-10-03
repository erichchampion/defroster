import '@testing-library/jest-dom'

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  Timestamp: {
    fromMillis: jest.fn((ms) => ({ toMillis: () => ms })),
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
  },
}))

jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(),
  onMessage: jest.fn(),
  isSupported: jest.fn(() => Promise.resolve(true)),
}))

// Mock geolocation
global.navigator.geolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}

// Mock GeolocationPositionError
global.GeolocationPositionError = class GeolocationPositionError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
    this.PERMISSION_DENIED = 1
    this.POSITION_UNAVAILABLE = 2
    this.TIMEOUT = 3
  }
}

// Mock Notification API
global.Notification = {
  requestPermission: jest.fn(() => Promise.resolve('granted')),
  permission: 'default',
}

// Mock IDBKeyRange for IndexedDB tests
global.IDBKeyRange = {
  upperBound: jest.fn((upper, open = false) => ({ upper, open, lowerOpen: false, upperOpen: open })),
  lowerBound: jest.fn((lower, open = false) => ({ lower, open, lowerOpen: open, upperOpen: false })),
  bound: jest.fn((lower, upper, lowerOpen = false, upperOpen = false) => ({ lower, upper, lowerOpen, upperOpen })),
  only: jest.fn((value) => ({ lower: value, upper: value, lowerOpen: false, upperOpen: false })),
}

// Mock Request/Response for Next.js API routes
global.Request = class Request {
  constructor(input, init) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init?.method || 'GET'
    this.headers = new Map(Object.entries(init?.headers || {}))
    this._body = init?.body
  }

  async json() {
    return JSON.parse(this._body)
  }
}

global.Response = class Response {
  constructor(body, init) {
    this._body = body || ''
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    this.headers = new Map(Object.entries(init?.headers || {}))
    this.ok = this.status >= 200 && this.status < 300
  }

  async json() {
    if (!this._body) return null
    return JSON.parse(this._body)
  }

  async text() {
    return this._body
  }

  static json(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
  }
}
