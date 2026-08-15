import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'grizzly-dev-secret';
const EXPIRES = '12h';

export const signToken = (admin) =>
  jwt.sign(
    { id: admin.id, login: admin.login, role: admin.role, name: admin.name },
    SECRET,
    { expiresIn: EXPIRES }
  );

// Har bir himoyalangan so'rovda tokenni tekshiradi
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token yo\'q' });
  }

  try {
    req.admin = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz yoki muddati tugagan' });
  }
}

// Faqat ma'lum rollarga ruxsat
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin?.role)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
  next();
};
