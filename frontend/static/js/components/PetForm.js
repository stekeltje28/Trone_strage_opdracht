import { createPet, updatePet } from '/static/js/api/pets.js';

export function PetForm({ onSaved, pet = null } = {}) {
  const form = document.createElement('form');
  // Basisklassen (werken zonder Tailwind) + Tailwind utility-classes
  form.className = 'card form-grid bg-white border border-slate-200 rounded-lg p-4 gap-3';

  // datum max = vandaag (yyyy-mm-dd)
  const todayStr = new Date().toISOString().slice(0, 10);

  form.innerHTML = `
    <div class="col-span-full">
      <h3 class="m-0 text-base font-semibold">Huisdier ${pet ? 'bewerken' : 'toevoegen'}</h3>
      <p class="muted text-sm text-slate-500">Vul de gegevens in en sla op.</p>
    </div>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Naam</span>
      <input name="name" required
             class="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400" />
      <small id="err-name" class="text-xs text-red-600" style="display:none"></small>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Ras / Breed</span>
      <input name="breed" required
             class="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400" />
      <small id="err-breed" class="text-xs text-red-600" style="display:none"></small>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Grootte</span>
      <select name="size" required
              class="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400">
        <option value="small">small</option>
        <option value="medium">medium</option>
        <option value="large">large</option>
      </select>
      <small id="err-size" class="text-xs text-red-600" style="display:none"></small>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Geboortedatum</span>
      <input type="date" name="birthdate" required max="${todayStr}"
             class="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400" />
      <small id="err-birthdate" class="text-xs text-red-600" style="display:none"></small>
    </label>

    <div class="actions col-span-full flex justify-end">
      <button type="submit"
              class="rounded-md bg-slate-900 text-white px-4 py-2 text-sm hover:opacity-95">
        ${pet ? 'Opslaan' : 'Toevoegen'}
      </button>
    </div>
  `;

  // refs
  const btn = form.querySelector('button[type="submit"]');
  const inputs = {
    name: form.querySelector('input[name="name"]'),
    breed: form.querySelector('input[name="breed"]'),
    size: form.querySelector('select[name="size"]'),
    birthdate: form.querySelector('input[name="birthdate"]'),
  };
  const errs = {
    name: form.querySelector('#err-name'),
    breed: form.querySelector('#err-breed'),
    size: form.querySelector('#err-size'),
    birthdate: form.querySelector('#err-birthdate'),
  };

  // Voorvullen bij edit
  if (pet) {
    inputs.name.value = pet.name ?? '';
    inputs.breed.value = pet.breed ?? '';
    inputs.size.value = pet.size ?? 'small';
    inputs.birthdate.value = pet.birthdate ?? '';
  }

  // helpers
  function setLoading(isLoading) {
    btn.disabled = !!isLoading;
    inputs.name.disabled = !!isLoading;
    inputs.breed.disabled = !!isLoading;
    inputs.size.disabled = !!isLoading;
    inputs.birthdate.disabled = !!isLoading;

    if (isLoading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = pet ? 'Opslaan…' : 'Toevoegen…';
    } else if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  }

  function setFieldError(field, message) {
    const e = errs[field];
    const input = inputs[field];
    if (!e || !input) return;
    if (message) {
      e.textContent = message;
      e.style.display = '';
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', e.id);
      // optioneel: rode rand (werkt met Tailwind en zonder)
      input.classList.add('ring-2', 'ring-red-400');
    } else {
      e.textContent = '';
      e.style.display = 'none';
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      input.classList.remove('ring-2', 'ring-red-400');
    }
  }

  function clearErrors() {
    Object.keys(errs).forEach((k) => setFieldError(k, ''));
  }

  function validate() {
    clearErrors();
    const name = inputs.name.value.trim();
    const breed = inputs.breed.value.trim();
    const size = inputs.size.value;
    const birthdate = inputs.birthdate.value;

    let hasErr = false;

    if (!name) { setFieldError('name', 'Naam is verplicht.'); hasErr = true; }
    if (!breed) { setFieldError('breed', 'Ras/Breed is verplicht.'); hasErr = true; }
    if (!['small', 'medium', 'large'].includes(size)) {
      setFieldError('size', 'Ongeldige grootte.'); hasErr = true;
    }
    if (!birthdate) {
      setFieldError('birthdate', 'Geboortedatum is verplicht.'); hasErr = true;
    } else if (birthdate > todayStr) {
      setFieldError('birthdate', 'Geboortedatum kan niet in de toekomst liggen.'); hasErr = true;
    }

    return !hasErr;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: inputs.name.value.trim(),
      breed: inputs.breed.value.trim(),
      size: inputs.size.value,
      birthdate: inputs.birthdate.value, // yyyy-mm-dd
    };

    setLoading(true);
    try {
      const saved = pet
        ? await updatePet(pet.id, payload)
        : await createPet(payload);

      // Bij create: reset zodat je snel nog eentje kunt toevoegen
      if (!pet) form.reset();

      onSaved?.(saved);
    } catch (err) {
      // Toon serverfout op een logische plek (algemeen -> bovenaan name)
      setFieldError('name', err?.message || 'Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  });

  // Validatie bij het verlaten van velden (snellere feedback)
  Object.entries(inputs).forEach(([key, input]) => {
    input.addEventListener('blur', () => {
      // minimale per-veld validatie zonder servercall
      if (key === 'name' && !input.value.trim()) setFieldError('name', 'Naam is verplicht.');
      if (key === 'breed' && !input.value.trim()) setFieldError('breed', 'Ras/Breed is verplicht.');
      if (key === 'birthdate') {
        const v = input.value;
        if (!v) setFieldError('birthdate', 'Geboortedatum is verplicht.');
        else if (v > todayStr) setFieldError('birthdate', 'Geboortedatum kan niet in de toekomst liggen.');
        else setFieldError('birthdate', '');
      }
      if (key === 'size' && !['small','medium','large'].includes(input.value)) {
        setFieldError('size', 'Ongeldige grootte.');
      } else if (key === 'size') {
        setFieldError('size', '');
      }
    });

    input.addEventListener('input', () => {
      // verwijder fout zodra gebruiker corrigeert
      setFieldError(key, '');
    });
  });

  return form;
}
