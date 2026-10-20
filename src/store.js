// In-memory data layer; resets on restart.
const items = new Map();
let nextId = 1;

export const list = () => [...items.values()];
export const get = (id) => items.get(id);

export function create({ name, quantity }) {
  const item = { id: nextId++, name, quantity };
  items.set(item.id, item);
  return item;
}

export function reset() {
  items.clear();
  nextId = 1;
}
