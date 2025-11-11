import { createPet, updatePet } from '/static/js/api/pets.js';

export function PetForm({ onSaved, pet = null } = {}) {
  const form = document.createElement('form');
  form.setAttribute('novalidate', '');
  form.className = 'card form-grid bg-white border border-slate-200 rounded-lg p-4 gap-4';

  // datum max = vandaag (yyyy-mm-dd)
  const todayStr = new Date().toISOString().slice(0, 10);
  const minBirthStr = '1990-01-01';

  // UI: foutensamenvatting / status
  const alertId = `alert-${Math.random().toString(36).slice(2)}`;

  form.innerHTML = `
    <div class="col-span-full flex items-start justify-between">
      <div>
        <h3 class="m-0 text-base font-semibold">
          Huisdier ${pet ? 'bewerken' : 'toevoegen'}
        </h3>
        <p class="muted text-sm text-slate-500 m-0">
          Vul de gegevens in en sla op.
        </p>
      </div>
      ${
        pet
          ? ''
          : `<button type="button" data-reset
               class="text-sm text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline">
               Formulier resetten
             </button>`
      }
    </div>

    <!-- Form-level alert -->
    <div id="${alertId}" role="alert" aria-live="polite"
         class="col-span-full hidden rounded-md border border-red-200 bg-red-50 text-red-800 text-sm px-3 py-2"></div>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">
        Naam <span aria-hidden="true" class="text-red-600">*</span>
      </span>
      <input name="name" required autocomplete="name" maxlength="60"
             inputmode="text"
             class="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
             placeholder="Bijv. Luna" />
      <small id="err-name" class="text-xs text-red-600" style="display:none"></small>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">
        Ras / Breed <span aria-hidden="true" class="text-red-600">*</span>
      </span>
      <input name="breed" required maxlength="60" autocomplete="off"
             class="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
             placeholder="Bijv. Labrador" />
      <small id="err-breed" class="text-xs text-red-600" style="display:none"></small>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">
        Grootte <span aria-hidden="true" class="text-red-600">*</span>
      </span>
      <select name="size" required
              class="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400">
        <option value="">Kies een grootte…</option>
        <option value="small">small</option>
        <option value="medium">medium</option>
        <option value="large">large</option>
      </select>
      <small class="text-xs text-slate-500">Gebruik small, medium of large.</small>
      <small id="err-size" class="text-xs text-red-600" style="display:none"></small>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">
        Geboortedatum <span aria-hidden="true" class="text-red-600">*</span>
      </span>
      <input type="date" name="birthdate" required max="${todayStr}" min="${minBirthStr}"
             class="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400" />
      <small class="text-xs text-slate-500">Datum tussen ${minBirthStr} en ${todayStr}.</small>
      <small id="err-birthdate" class="text-xs text-red-600" style="display:none"></small>
    </label>

    <div class="actions col-span-full flex items-center justify-end gap-2">
      <button type="submit"
              class="inline-flex items-center gap-2 rounded-md bg-slate-900 text-white px-4 py-2 text-sm hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed">
        <svg class="spinner hidden h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span class="btn-text">${pet ? 'Opslaan' : 'Toevoegen'}</span>
      </button>
    </div>
  `;

  // refs
  const btn = form.querySelector('button[type="submit"]');
  const btnText = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');
  const alertBox = form.querySelector(`#${alertId}`);
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
    inputs.size.value = pet.size ?? '';
    inputs.birthdate.value = pet.birthdate ?? '';
  } else {
    // autofocus op eerste veld bij create
    queueMicrotask(() => inputs.name?.focus());
  }

  function showAlert(message = '', tone = 'error') {
    if (!message) {
      alertBox.classList.add('hidden');
      alertBox.textContent = '';
      return;
    }
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.classList.toggle('bg-red-50', tone === 'error');
    alertBox.classList.toggle('border-red-200', tone === 'error');
    alertBox.classList.toggle('text-red-800', tone === 'error');
    alertBox.classList.toggle('bg-emerald-50', tone === 'success');
    alertBox.classList.toggle('border-emerald-200', tone === 'success');
    alertBox.classList.toggle('text-emerald-800', tone === 'success');
  }

  function setLoading(isLoading) {
    const loadingText = pet ? 'Opslaan…' : 'Toevoegen…';
    btn.disabled = !!isLoading;
    form.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    Object.values(inputs).forEach((el) => (el.disabled = !!isLoading));

    if (isLoading) {
      btn.dataset.originalText = btnText.textContent;
      btnText.textContent = loadingText;
      spinner.classList.remove('hidden');
    } else if (btn.dataset.originalText) {
      btnText.textContent = btn.dataset.originalText;
      spinner.classList.add('hidden');
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
    showAlert('');
    Object.keys(errs).forEach((k) => setFieldError(k, ''));
  }

  function validate() {
    clearErrors();
    const name = inputs.name.value.trim();
    const breed = inputs.breed.value.trim();
    const size = inputs.size.value;
    const birthdate = inputs.birthdate.value;

    let hasErr = false;
    const messages = [];

    if (!name) { setFieldError('name', 'Naam is verplicht.'); hasErr = true; messages.push('Naam is verplicht.'); }
    if (!breed) { setFieldError('breed', 'Ras/Breed is verplicht.'); hasErr = true; messages.push('Ras/Breed is verplicht.'); }
    if (!['small', 'medium', 'large'].includes(size)) {
      setFieldError('size', 'Kies small, medium of large.'); hasErr = true; messages.push('Kies small, medium of large.');
    }
    if (!birthdate) {
      setFieldError('birthdate', 'Geboortedatum is verplicht.'); hasErr = true; messages.push('Geboortedatum is verplicht.');
    } else if (birthdate > todayStr) {
      setFieldError('birthdate', 'Geboortedatum kan niet in de toekomst liggen.'); hasErr = true; messages.push('Geboortedatum kan niet in de toekomst liggen.');
    } else if (birthdate < minBirthStr) {
      setFieldError('birthdate', `Geboortedatum moet na ${minBirthStr} liggen.`); hasErr = true; messages.push(`Geboortedatum moet na ${minBirthStr} liggen.`);
    }

    if (hasErr) {
      // Focus naar eerste fout
      const firstKey = Object.keys(errs).find((k) => errs[k].textContent);
      if (firstKey) inputs[firstKey].focus();
      showAlert(messages.join(' '), 'error');
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

      if (!pet) {
        form.reset();
        showAlert('Huisdier toegevoegd.', 'success');
        inputs.name.focus();
      } else {
        showAlert('Wijzigingen opgeslagen.', 'success');
      }

      onSaved?.(saved);
    } catch (err) {
      // Form-level error + markeer eerste veld
      showAlert(err?.message || 'Opslaan mislukt', 'error');
      setFieldError('name', err?.message || 'Opslaan mislukt');
      inputs.name.focus();
    } finally {
      setLoading(false);
    }
  });

  // Inline validatie & snelle feedback
  Object.entries(inputs).forEach(([key, input]) => {
    input.addEventListener('blur', () => {
      if (key === 'name' && !input.value.trim()) setFieldError('name', 'Naam is verplicht.');
      if (key === 'breed' && !input.value.trim()) setFieldError('breed', 'Ras/Breed is verplicht.');
      if (key === 'birthdate') {
        const v = input.value;
        if (!v) setFieldError('birthdate', 'Geboortedatum is verplicht.');
        else if (v > todayStr) setFieldError('birthdate', 'Geboortedatum kan niet in de toekomst liggen.');
        else if (v < minBirthStr) setFieldError('birthdate', `Geboortedatum moet na ${minBirthStr} liggen.`);
        else setFieldError('birthdate', '');
      }
      if (key === 'size') {
        if (!['small','medium','large'].includes(input.value)) {
          setFieldError('size', 'Kies small, medium of large.');
        } else {
          setFieldError('size', '');
        }
      }
    });

    input.addEventListener('input', () => {
      setFieldError(key, '');
      showAlert(''); // verberg algemene fout zodra gebruiker corrigeert
    });
  });

  // Resetknop (alleen bij create)
  form.querySelector('[data-reset]')?.addEventListener('click', () => {
    form.reset();
    clearErrors();
    inputs.name.focus();
    showAlert('');
  });

  // Toetsenbord: Esc om te resetten (alleen bij create)
  if (!pet) {
    form.addEventListener('keydown', (e) => {

      if (e.key === 'Escape') {
        form.reset();
        clearErrors();
        inputs.name.focus();
        showAlert('');
      }
    });
  }

  return form;
}
