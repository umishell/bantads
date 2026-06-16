import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
export function signingKeyFromSecret(secret) {
  return crypto.createHash('sha512').update(secret, 'utf8').digest()
}
export function verifyAccessToken(token, secret) {
  if (!token || !secret) return null
  try {
    const key = signingKeyFromSecret(secret)
    return jwt.verify(token, key, { algorithms: ['HS512'] })
  } catch {
    return null
  }
}
