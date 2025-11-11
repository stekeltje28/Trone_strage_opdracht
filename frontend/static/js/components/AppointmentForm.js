import { createAppointment } from '/static/js/api/appointments.js';

export function AppointmentForm({ pets = [], initial = null, onSaved } = {}) {
  const form = document.createElement('form');
  form.className = 'card form-grid';
  form.innerHTML = `
    <label>Huisdier
      <select name="pet_id" required></select>
    </label>
    <label>Oppasser (naam)
      <input name="sitter_name" required />
    </label>
    <label>Datum
      <input type="date" name="sitting_date" required />
    </label>
    <label>Tijd
      <input type="time" name="sitting_time" step="1" required />
    </label>
    <label>Duur (minuten)
      <input type="number" min="1" name="duration_minutes" required />
    </label>
    <div class="actions"><button type="submit">Opslaan</button></div>
  `;

  for (const p of pets) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (#${p.id})`;
    form.pet_id.append(opt);
  }

  if (initial) {
    form.pet_id.value = initial.pet_id;
    form.sitter_name.value = initial.sitter_name;
    form.sitting_date.value = initial.sitting_date;
    form.sitting_time.value = initial.sitting_time?.slice(0,8) || '09:00:00';
    form.duration_minutes.value = initial.duration_minutes ?? 60;
  } else {
    form.duration_minutes.value = 60;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      pet_id: Number(form.pet_id.value),
      sitter_name: form.sitter_name.value.trim(),
      sitting_date: form.sitting_date.value, // yyyy-mm-dd
      // API voorbeeld toont Z, maar we sturen HH:MM:SS (server kan dit normaliseren)
      sitting_time: normalizeTime(form.sitting_time.value),
      duration_minutes: Number(form.duration_minutes.value),
    };
    const saved = await createAppointment(payload);
    onSaved?.(saved);
  });

  return form;
}

function normalizeTime(t) {
  // browser kan 'HH:MM' of 'HH:MM:SS' geven
  const parts = t.split(':');
  const hh = parts[0]?.padStart(2,'0') ?? '00';
  const mm = parts[1]?.padStart(2,'0') ?? '00';
  const ss = (parts[2]?.padStart(2,'0')) || '00';
  return `${hh}:${mm}:${ss}`;
}
