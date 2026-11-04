const bcrypt = require('bcryptjs') 
const jwt = require('jsonwebtoken') 
const MAX_PASSWORD_BYTES = 72 

class AuthError extends Error {
  constructor(code, message) {
    super(message) 
    this.name = 'AuthError' 
    this.code = code 
  }
}
function memoryStorage() {
  const data = {} 
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value  },
    removeItem: (key) => { delete data[key]  },
  } 
}

function createAuth({ secret, saltRounds = 12, expiresIn = '1h', storage = memoryStorage() } = {}) {
  if (!secret) {
    throw new AuthError('NO_SECRET', 'createAuth needs a secret') 
  }

  function checkPassword(password) {
    if (typeof password !== 'string' || password === '') {
      throw new AuthError('BAD_PASSWORD', 'Password must be a non-empty string') 
    }
    if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
      throw new AuthError('PASSWORD_TOO_LONG', 'Password must be 72 bytes or less') 
    }
  }

  function checkHash(hash) {
    if (typeof hash !== 'string' || !hash.startsWith('$2') || hash.length !== 60) {
      throw new AuthError('BAD_HASH', 'Not a valid bcrypt hash') 
    }
  }

  return {
    async hashPassword(password) {
      checkPassword(password) 
      return bcrypt.hash(password, saltRounds) 
    },

    async verifyPassword(password, hash) {
      checkPassword(password) 
      checkHash(hash) 
      return bcrypt.compare(password, hash) 
    },

    needsRehash(hash) {
      checkHash(hash) 
      return bcrypt.getRounds(hash) !== saltRounds 
    },

    signToken(payload) {
      return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn }) 
    },

    verifyToken(token) {
      try {
        return jwt.verify(token, secret, { algorithms: ['HS256'] }) 
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          throw new AuthError('TOKEN_EXPIRED', 'Token has expired') 
        }
        throw new AuthError('TOKEN_INVALID', 'Token is invalid') 
      }
    },

    setToken: (token) => storage.setItem('authToken', token),
    getToken: () => storage.getItem('authToken'),
    clearToken: () => storage.removeItem('authToken'),
  } 
}

module.exports = { createAuth, AuthError } 