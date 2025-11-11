import { api } from '../api.js';

const BASE = '/api/v1/pets';

export async function listPets({ limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return api.get(`${BASE}?${p.toString()}`);
}

export async function createPet({ name, breed, size, birthdate }) {
  if (!name) throw new Error('Naam is verplicht');
  if (!breed) throw new Error('Ras is verplicht');
  if (!['small','medium','large'].includes(size)) throw new Error('Grootte moet small/medium/large zijn');
  if (!birthdate) throw new Error('Geboortedatum is verplicht');
  return api.post(BASE, { name, breed, size, birthdate });
}

export async function updatePet(id, patch) {
  if (!id) throw new Error('id ontbreekt');
  return api.patch(`${BASE}/${encodeURIComponent(id)}`, patch);
}

export async function deletePet(id) {
  if (!id) throw new Error('id ontbreekt');
  return api.del(`${BASE}/${encodeURIComponent(id)}`);
}
