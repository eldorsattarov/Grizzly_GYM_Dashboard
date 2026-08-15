import { Router } from 'express';
import { getPrices, setSetting } from '../db.js';
import { requireRole } from '../auth.js';

const r = Router();

r.get('/prices', (_req, res) => res.json(getPrices()));

r.put('/prices', requireRole('owner'), (req, res) => {
  const daily = Math.round(Number(req.body?.daily));
  const alternate = Math.round(Number(req.body?.alternate));
  if (!(daily > 0) || !(alternate > 0)) {
    return res.status(400).json({ error: 'Narxlar noto\'g\'ri' });
  }
  setSetting('price_daily', daily);
  setSetting('price_alternate', alternate);
  res.json(getPrices());
});

export default r;
