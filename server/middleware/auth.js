import jwt from 'jsonwebtoken'

export const authRequired = (jwtSecret) => (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  const token = header.slice('Bearer '.length)

  try {
    const payload = jwt.verify(token, jwtSecret)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}
