import { api } from '../api.js';

const BASE = '/api/v1/appointments';

export async function listAppointments({ pet_id, date_from, date_to, limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams();
  if (pet_id != null && pet_id !== '') p.set('pet_id', String(pet_id));
  if (date_from) p.set('date_from', String(date_from));
  if (date_to) p.set('date_to', String(date_to));
  p.set('limit', String(limit));
  p.set('offset', String(offset));
  return api.get(`${BASE}?${p.toString()}`);
}

export async function createAppointment({ pet_id, sitter_name, sitting_date, sitting_time, duration_minutes }) {
  return api.post(BASE, { pet_id, sitter_name, sitting_date, sitting_time, duration_minutes });
}

export async function deleteAppointment(appointment_id) {
  return api.del(`${BASE}/${encodeURIComponent(appointment_id)}`);
}
