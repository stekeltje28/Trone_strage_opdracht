import { listPets, deletePet, getPet } from '/static/js/api/pets.js';
import { PetForm } from '/static/js/components/PetForm.js';
import { modal } from '/static/js/components/Modal.js';
import { toast } from '/static/js/components/Toast.js';

export function PetList({ mount, onSelected } = {}) {
  const root = mount || document.createElement('div');
  root.innerHTML = `
    <div class="toolbar">
      <input type="search" placeholder="Zoek op naam/ras..." data-q />
      <button data-add>Nieuw huisdier</button>
    </div>
    <div class="list" data-list></div>
    <div class="pager" data-pager>
      <button data-prev disabled>Vorige</button>
      <span data-pageinfo></span>
      <button data-next disabled>Volgende</button>
    </div>
  `;

  const elList = root.querySelector('[data-list]');
  const elQ = root.querySelector('[data-q]');
  const elAdd = root.querySelector('[data-add]');
  const elPrev = root.querySelector('[data-prev]');
  const elNext = root.querySelector('[data-next]');
  const elInfo = root.querySelector('[data-pageinfo]');

  const state = { q: '', limit: 10, offset: 0, items: [], loading: false };

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function setLoading(isLoading) {
    state.loading = !!isLoading;
    elPrev.disabled = isLoading || state.offset === 0;
    elNext.disabled = isLoading; // definitief in load() bijwerken
    elAdd.disabled = isLoading;
    elQ.disabled = isLoading;
    elInfo.textContent = isLoading ? 'Laden…' : elInfo.textContent;
  }

  async function load() {
    setLoading(true);
    try {
      const data = await listPets({ q: state.q, limit: state.limit, offset: state.offset });
      state.items = Array.isArray(data) ? data : [];
      renderList();
      // Pager
      elPrev.disabled = state.offset === 0;
      elNext.disabled = state.items.length < state.limit;
      elInfo.textContent = `Offset ${state.offset} • ${state.items.length} items`;
    } catch (err) {
      toast(err?.message || 'Laden mislukt', 'error');
      // bij fout: maak lijst leeg, pager uit
      state.items = [];
      renderList();
      elPrev.disabled = true;
      elNext.disabled = true;
      elInfo.textContent = 'Fout bij laden';
    } finally {
      setLoading(false);
    }
  }

  function renderList() {
    elList.innerHTML = '';
    if (!state.items.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Geen huisdieren gevonden.';
      elList.append(p);
      return;
    }
    for (const p of state.items) {
      const row = document.createElement('div');
      row.className = 'row card';
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(p.breed)} • ${escapeHtml(p.size)} • geb. ${escapeHtml(p.birthdate)}
          <div class="muted">#${p.id} aangemaakt ${p.created_at ? escapeHtml(p.created_at.slice(0,10)) : ''}</div>
        </div>
        <div class="row-actions">
          <button data-edit="${p.id}">Bewerken</button>
          <button data-del="${p.id}">Verwijderen</button>
          <button data-select="${p.id}">Selecteer</button>
        </div>
      `;
      elList.append(row);
    }
  }

  // Event delegation: één listener voor de hele lijst
  elList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (state.loading) return;

    // Bewerken
    if (btn.dataset.edit) {
      const id = Number(btn.dataset.edit);
      try {
        const pet = await getPet(id);
        // Maak modal eerst, dan form zodat onSaved modal kan sluiten
        const m = modal({ title: `Bewerken: ${escapeHtml(pet.name)}`, content: document.createElement('div') });
        const form = PetForm({
          pet,
          onSaved: async () => {
            m.close();
            toast('Huisdier opgeslagen', 'success');
            await load();
          }
        });
        m.body.innerHTML = '';
        m.body.append(form);
      } catch (err) {
        toast(err?.message || 'Huisdier ophalen mislukt', 'error');
      }
      return;
    }

    // Verwijderen
    if (btn.dataset.del) {
      const id = Number(btn.dataset.del);
      if (!confirm('Weet je zeker dat je dit huisdier wilt verwijderen?')) return;
      try {
        await deletePet(id);
        toast('Huisdier verwijderd', 'success');
        await load();
      } catch (err) {
        toast(err?.message || 'Verwijderen mislukt', 'error');
      }
      return;
    }

    // Selecteer
    if (btn.dataset.select) {
      const id = Number(btn.dataset.select);
      const pet = state.items.find(x => x.id === id);
      if (pet) onSelected?.(pet);
    }
  });

  // Zoek (debounced)
  let qTimer = null;
  elQ.addEventListener('input', () => {
    const val = elQ.value.trim();
    if (val === state.q) return;
    state.q = val;
    state.offset = 0;
    clearTimeout(qTimer);
    qTimer = setTimeout(load, 300);
  });

  // Nieuw
  elAdd.addEventListener('click', () => {
    const m = modal({ title: 'Nieuw huisdier', content: document.createElement('div') });
    const form = PetForm({
      onSaved: async () => {
        m.close();
        toast('Huisdier toegevoegd', 'success');
        await load();
      }
    });
    m.body.innerHTML = '';
    m.body.append(form);
  });

  // Paginering
  elPrev.addEventListener('click', () => {
    if (state.loading) return;
    state.offset = Math.max(0, state.offset - state.limit);
    load();
  });
  elNext.addEventListener('click', () => {
    if (state.loading) return;
    state.offset += state.limit;
    load();
  });

  // Init
  load();
  return { root, reload: load };
}
