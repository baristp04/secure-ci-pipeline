import express from 'express';
import _ from 'lodash';
import * as store from './store.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/items', (req, res) => res.json(store.list()));

  app.get('/items/:id', (req, res) => {
    const item = store.get(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  });

  app.post('/items', (req, res) => {
    const { name, quantity } = _.pick(req.body ?? {}, ['name', 'quantity']);
    if (typeof name !== 'string' || !name.trim() || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'name (string) and quantity (integer >= 0) are required' });
    }
    res.status(201).json(store.create({ name: name.trim(), quantity }));
  });

  return app;
}
