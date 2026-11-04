const jwt = require('jsonwebtoken')
const { createAuth } = require('../index')

const SECRET = 'test-secret'
const auth = createAuth({ secret: SECRET, saltRounds: 4 })

describe('setup', () => {
  test('throws without a secret', () => {
    expect(() => createAuth({})).toThrow(expect.objectContaining({ code: 'NO_SECRET' }))
  })
})

describe('passwords', () => {
  test('correct password verifies as true', async () => {
    const hash = await auth.hashPassword('hunter2')
    expect(await auth.verifyPassword('hunter2', hash)).toBe(true)
  })

  test('wrong password verifies as false', async () => {
    const hash = await auth.hashPassword('hunter2')
    expect(await auth.verifyPassword('wrong', hash)).toBe(false)
  })

  test('rejects an empty password', async () => {
    await expect(auth.hashPassword('')).rejects.toMatchObject({ code: 'BAD_PASSWORD' })
  })

  test('rejects a password over 72 bytes', async () => {
    await expect(auth.hashPassword('a'.repeat(73)))
      .rejects.toMatchObject({ code: 'PASSWORD_TOO_LONG' })
  })

  test('counts bytes, not characters', async () => {
    await expect(auth.hashPassword('😀'.repeat(19)))
      .rejects.toMatchObject({ code: 'PASSWORD_TOO_LONG' })
  })

  test('throws on a malformed hash', async () => {
    await expect(auth.verifyPassword('hunter2', 'not-a-hash'))
      .rejects.toMatchObject({ code: 'BAD_HASH' })
  })
})

describe('needsRehash', () => {
  test('false when cost is unchanged', async () => {
    const hash = await auth.hashPassword('hunter2')
    expect(auth.needsRehash(hash)).toBe(false)
  })

  test('true after cost is raised', async () => {
    const hash = await auth.hashPassword('hunter2')
    const stronger = createAuth({ secret: SECRET, saltRounds: 5 })
    expect(stronger.needsRehash(hash)).toBe(true)
  })
})

describe('tokens', () => {
  test('a signed token verifies and returns its payload', () => {
    const token = auth.signToken({ userId: '42' })
    expect(auth.verifyToken(token).userId).toBe('42')
  })

  test('an expired token throws TOKEN_EXPIRED', () => {
    const expired = jwt.sign({ userId: '42', exp: Math.floor(Date.now() / 1000) - 60 }, SECRET)
    expect(() => auth.verifyToken(expired)).toThrow(expect.objectContaining({ code: 'TOKEN_EXPIRED' }))
  })

  test('a token from a different secret throws TOKEN_INVALID', () => {
    const other = createAuth({ secret: 'other-secret' })
    const token = other.signToken({ userId: '42' })
    expect(() => auth.verifyToken(token)).toThrow(expect.objectContaining({ code: 'TOKEN_INVALID' }))
  })
})

describe('storage', () => {
  test('set, get, and clear a token', () => {
    const a = createAuth({ secret: SECRET })
    expect(a.getToken()).toBeNull()
    a.setToken('abc')
    expect(a.getToken()).toBe('abc')
    a.clearToken()
    expect(a.getToken()).toBeNull()
  })

  test('uses storage passed in by the caller', () => {
    const saved = {}
    const storage = {
      getItem: (k) => saved[k] ?? null,
      setItem: (k, v) => { saved[k] = v },
      removeItem: (k) => { delete saved[k] },
    }
    createAuth({ secret: SECRET, storage }).setToken('xyz')
    expect(saved.authToken).toBe('xyz')
  })
})