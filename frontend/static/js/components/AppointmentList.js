import { listAppointments, deleteAppointment } from '/static/js/api/appointments.js';
import { toast } from '/static/js/components/Toast.js';

export function AppointmentList({ mount, getPetsQuick } = {}) {
  const root = mount || document.createElement('div');
  root.innerHTML = `
    <div class="toolbar">
      <label>Filter pet-id <input type="number" min="1" step="1" data-pet /></label>
      <label>Vanaf <input type="date" data-from /></label>
      <label>Tot <input type="date" data-to /></label>
      <button data-load>Laden</button>
    </div>
    <div class="list" data-list></div>
  `;

  const elList = root.querySelector('[data-list]');
  const elPet = root.querySelector('[data-pet]');
  const elFrom = root.querySelector('[data-from]');
  const elTo = root.querySelector('[data-to]');
  const elLoad = root.querySelector('[data-load]');

  async function load() {
    const pet_id = elPet.value ? Number(elPet.value) : undefined;
    const date_from = elFrom.value || undefined;
    const date_to = elTo.value || undefined;
    const rows = await listAppointments({ pet_id, date_from, date_to, limit: 50, offset: 0 });
    render(rows);
  }

  function render(rows) {
    elList.innerHTML = '';
    if (!rows.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Geen afspraken gevonden.';
      elList.append(p);
      return;
    }
    const petsById = new Map((getPetsQuick?.() || []).map(p => [p.id, p]));
    for (const a of rows) {
      const petName = petsById.get(a.pet_id)?.name || `#${a.pet_id}`;
      const row = document.createElement('div');
      row.className = 'row card';
      row.innerHTML = `
        <div>
          <strong>${petName}</strong> — ${a.sitter_name}<br/>
          ${a.sitting_date} om ${a.sitting_time?.slice(0,8) ?? '??:??'} (${a.duration_minutes} min)
          <div class="muted">#${a.id} aangemaakt ${a.created_at?.slice(0,10) ?? ''}</div>
        </div>
        <div class="row-actions">
          <button data-del="${a.id}">Verwijderen</button>
        </div>
      `;
      elList.append(row);
    }
    elList.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', onDel));
  }

  async function onDel(e) {
    const id = Number(e.currentTarget.dataset.del);
    if (!confirm('Afspraak verwijderen?')) return;
    await deleteAppointment(id);
    toast('Afspraak verwijderd', 'success');
    load();
  }

  elLoad.addEventListener('click', load);
  load();
  return { root, reload: load };
}
