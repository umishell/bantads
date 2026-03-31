import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

/** Mesma derivação que ms-auth (JwtService): SHA-512 do segredo UTF-8 → chave HS512 */
export function signingKeyFromSecret(secret) {
  return crypto.createHash('sha512').update(secret, 'utf8').digest()
}

/**
 * Valida o JWT emitido pelo ms-auth (HS512).
 * @returns {import('jsonwebtoken').JwtPayload | null}
 */
export function verifyAccessToken(token, secret) {
  if (!token || !secret) return null
  try {
    const key = signingKeyFromSecret(secret)
    return jwt.verify(token, key, { algorithms: ['HS512'] })
  } catch {
    return null
  }
}
