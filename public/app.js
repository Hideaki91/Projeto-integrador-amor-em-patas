var $ = (s) => document.querySelector(s);
const state = { animals: [], donors: [], adopters: [], adoptions: [], isAdmin: false };
const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

function formData(form) { return Object.fromEntries(new FormData(form).entries()); }

function setMessage(id, msg) {
  const el = $(id);
  if (el) el.textContent = msg;
}

async function loadAll() {
  try {
    [state.animals, state.donors, state.adopters, state.adoptions] = await Promise.all([
      api('/api/animals'),
      ...(state.isAdmin ? [api('/api/donors'), api('/api/adopters'), api('/api/adoptions')] : [Promise.resolve([]), Promise.resolve([]), Promise.resolve([])])
    ]);
    renderAnimals();
    renderPeople('donors');
    renderPeople('adopters');
    renderAdoptions();
    fillSelects();
  } catch (e) {
    toast(e.message);
  }
}

// ==========================================
// RENDERIZAÇÃO DOS ANIMAIS (COM FOTOS E BADGES)
// ==========================================
function renderAnimals() {
  const searchInput = $('#search');
  const term = (searchInput ? searchInput.value : '').toLowerCase();
  const items = state.animals.filter(a => `${a.name || a.nome || ''} ${a.species || a.especie || ''}`.toLowerCase().includes(term));
  const cardsContainer = $('#animal-cards');
  
  if (!cardsContainer) return;

  cardsContainer.innerHTML = items.length ? items.map(a => {
    const photos = (a.fotos && a.fotos.length) 
      ? a.fotos 
      : (a.photo ? String(a.photo).split(',').map(p => p.trim()).filter(Boolean) : []);
    
    const name = a.name || a.nome || 'Amigo sem nome';
    const species = a.species || a.especie || '';
    const sex = a.sex || a.sexo || '';
    const age = a.age ?? a.idade ?? '';
    const size = a.size || a.porte || '';
    const status = a.status || 'Disponível';
    const location = a.location || a.localizacao || 'Local não informado';
    const isVaccinated = a.vaccinated ?? a.vacinado;
    const isCastrated = a.castrated ?? a.castrado;
    const health = a.medical_conditions || a.condicoes_medicas;
    const microchip = a.microchip;

    return `<article class="animal-card">
      <div class="animal-photos" style="display:flex; overflow-x:auto; gap:6px; scroll-snap-type:x mandatory; padding-bottom:6px;">
        ${photos.length 
          ? photos.map((p, index) => `
              <img src="${escapeHtml(p)}" 
                   alt="Foto de ${escapeHtml(name)}" 
                   onclick="openGallery(${a.id}, ${index})"
                   style="height:190px; width:100%; object-fit:cover; border-radius:8px; flex-shrink:0; cursor:pointer;" 
                   title="Clique para ver foto ampliada">
            `).join('')
          : `<div class="no-photo" aria-label="Sem foto">🐾</div>`
        }
      </div>
      <div class="animal-info">
        <h3>${escapeHtml(name)}</h3>
        <p>🐾 ${escapeHtml(species)} · ${escapeHtml(sex)}</p>
        <p>◷ ${age} ${age == 1 ? 'ano' : 'anos'} · Porte ${escapeHtml(String(size).toLowerCase())}</p>
        <p class="loc">📍 ${escapeHtml(location)}</p>
        
        <div class="badges" style="display:flex; gap:6px; margin: 8px 0; flex-wrap:wrap;">
          <span class="badge ${isVaccinated ? 'ok' : 'no'}" style="font-size:0.8rem; padding:3px 8px; border-radius:4px; background:${isVaccinated ? '#e6f4ea' : '#fce8e6'}; color:${isVaccinated ? '#137333' : '#c5221f'};">
            💉 ${isVaccinated ? 'Vacinado(a)' : 'Não vacinado'}
          </span>
          <span class="badge ${isCastrated ? 'ok' : 'no'}" style="font-size:0.8rem; padding:3px 8px; border-radius:4px; background:${isCastrated ? '#e6f4ea' : '#fce8e6'}; color:${isCastrated ? '#137333' : '#c5221f'};">
            ✂️ ${isCastrated ? 'Castrado(a)' : 'Não castrado'}
          </span>
        </div>

        ${health ? `<p class="info-extra" style="font-size:0.85rem;">🩺 <strong>Saúde:</strong> ${escapeHtml(health)}</p>` : ''}
        ${microchip ? `<p class="info-extra" style="font-size:0.85rem;">🏷️ <strong>Microchip:</strong> ${escapeHtml(microchip)}</p>` : ''}

        <span class="status ${status === 'Disponível' ? '' : 'other'}">${escapeHtml(status)}</span>
        ${a.description ? `<p>${escapeHtml(a.description)}</p>` : ''}
        ${status === 'Disponível' ? `<a class="btn" href="#adocoes" onclick="prefillAnimal(${a.id})">Quero adotar →</a>` : ''}
        ${state.isAdmin ? `<div style="display:flex;gap:8px;margin-top:8px">
          <button class="action" style="flex:1" onclick="editAnimal(${a.id})">Editar animal</button>
          <button class="action danger" style="flex:1" onclick="deleteAnimal(${a.id})">Excluir animal</button>
        </div>` : ''}
      </div>
    </article>`;
  }).join('') : '<p class="empty">Nenhum animal encontrado. Cadastre um novo amigo acima.</p>';
}

function renderPeople(type) {
  const isDonor = type === 'donors';
  const rows = state[type] || [];
  const target = isDonor ? '#donor-rows' : '#adopter-rows';
  const el = $(target);
  if (!el) return;

  el.innerHTML = rows.length ? rows.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.email)}</td>
      <td>${escapeHtml(p.phone)}</td>
      <td>${escapeHtml(p.city)}</td>
      <td>
        <button class="action" onclick="editPerson('${type}',${p.id})">Editar</button> 
        <button class="action danger" onclick="deletePerson('${type}',${p.id})">Excluir</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="5" class="empty">Nenhum cadastro realizado.</td></tr>`;
}

function fillSelects() {
  const donor = $('#animal-donor');
  const animal = $('#adoption-animal');

  if (donor) {
    donor.innerHTML = '<option value="">Sem vínculo</option>' + (state.donors || []).map(x => `<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('');
  }
  if (animal) {
    animal.innerHTML = '<option value="">Selecione um animal</option>' + (state.animals || []).filter(a => a.status === 'Disponível').map(x => `<option value="${x.id}">${escapeHtml(x.name || x.nome)} — ${escapeHtml(x.species || x.especie)}</option>`).join('');
  }
}

function renderAdoptions() {
  const el = $('#adoption-rows');
  if (!el) return;

  el.innerHTML = state.adoptions.length ? state.adoptions.map(a => `
    <tr>
      <td>${escapeHtml(a.animal_name)}</td>
      <td>${escapeHtml(a.adopter_name)}</td>
      <td>${escapeHtml(a.created_at)}</td>
      <td><span class="status ${a.status === 'Pendente' ? 'other' : ''}">${escapeHtml(a.status)}</span></td>
      <td>
        ${state.isAdmin ? (a.status === 'Pendente' ? `<button class="action" onclick="updateAdoption(${a.id},'Aprovada')">Aprovar</button> <button class="action danger" onclick="updateAdoption(${a.id},'Recusada')">Recusar</button>` : '') + ` <button class="action danger" onclick="deleteAdoption(${a.id})">Excluir</button>` : 'Somente administrador'}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="empty">Ainda não há solicitações de adoção.</td></tr>';
}

window.prefillAnimal = (id) => { 
  const el = $('#adoption-animal');
  if (el) el.value = String(id); 
  const sec = $('#adocoes');
  if (sec) sec.scrollIntoView({ behavior: 'smooth' }); 
};

function updateAdminUI() {
  const setDisplay = (id, display) => { const el = $(id); if (el) el.style.display = display; };
  
  setDisplay('#admin-panel', 'block');
  setDisplay('#admin-login', state.isAdmin ? 'none' : 'grid');
  setDisplay('#admin-logout', state.isAdmin ? 'inline-block' : 'none');
  setDisplay('#cadastro-animal', state.isAdmin ? 'block' : 'none');
  setDisplay('#doadores', state.isAdmin ? 'block' : 'none');
  setDisplay('#nav-doadores', state.isAdmin ? 'inline' : 'none');
  setDisplay('#animal-form', state.isAdmin ? 'grid' : 'none');
  setDisplay('#donor-form', state.isAdmin ? 'grid' : 'none');
  setDisplay('#adopter-form', 'grid');
  setDisplay('#adoption-form', 'grid');

  const status = $('#admin-status');
  if (status) {
    status.textContent = state.isAdmin ? 'Sessão de administrador ativa. Você pode cadastrar animais e aprovar ou recusar adoções.' : 'Entre para gerenciar cadastros e decisões de adoção.';
  }
}

async function refreshAuth() {
  try {
    const r = await api('/api/auth/me');
    state.isAdmin = !!r.authenticated;
  } catch {
    state.isAdmin = false;
  }
  updateAdminUI();
}

// Configuração segura de formulários e botões
function setupEvents() {
  const addSafeEvent = (selector, event, handler) => {
    const el = $(selector);
    if (el) el.addEventListener(event, handler);
  };

  addSafeEvent('#admin-open', 'click', () => {
    const panel = $('#admin-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  addSafeEvent('#admin-login', 'submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData(form)) });
      state.isAdmin = true;
      form.reset();
      setMessage('#admin-msg', 'Login realizado.');
      updateAdminUI();
      await loadAll();
    } catch (err) {
      setMessage('#admin-msg', err.message);
    }
  });

  addSafeEvent('#admin-logout', 'click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      state.isAdmin = false;
      updateAdminUI();
      await loadAll();
    }
  });

  addSafeEvent('#search', 'input', renderAnimals);

  addSafeEvent('#animal-form', 'submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await api('/api/animals', { method: 'POST', body: fd });
      form.reset();
      setMessage('#animal-msg', 'Animal cadastrado com sucesso!');
      await loadAll();
      toast('Animal cadastrado com sucesso.');
    } catch (err) {
      setMessage('#animal-msg', err.message);
    }
  });

  const registerForm = (id, endpoint, type) => {
    const form = $(id);
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await api(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData(e.currentTarget)) });
        e.currentTarget.reset();
        setMessage(`#${type}-msg`, 'Cadastro realizado com sucesso!');
        await loadAll();
        toast('Cadastro realizado com sucesso.');
      } catch (err) {
        setMessage(`#${type}-msg`, err.message);
      }
    });
  };

  registerForm('#donor-form', '/api/donors', 'donor');
  registerForm('#adopter-form', '/api/adopters', 'adopter');

  addSafeEvent('#adoption-form', 'submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      const result = await api('/api/adoptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData(form)) });
      form.reset();
      setMessage('#adoption-msg', `Solicitação #${result.request_id} registrada! Status: ${result.status}. Guarde esse número para consultar com a equipe.`);
      await loadAll();
      toast('Solicitação de adoção registrada.');
    } catch (err) {
      setMessage('#adoption-msg', err.message);
    }
  });

  const photoDialog = document.getElementById('photo-dialog');
  if (photoDialog) {
    photoDialog.addEventListener('click', (e) => {
      if (e.target === photoDialog) photoDialog.close();
    });
  }
}

// Ações Globais
window.editAnimal = async (id) => {
  if (!state.isAdmin) { toast('Somente administradores podem editar animais.'); return; }
  const a = state.animals.find(x => x.id === id);
  if (!a) return;
  const name = prompt('Nome do animal:', a.name || a.nome); if (name === null) return;
  const species = prompt('Espécie (Cachorro, Gato ou Outro):', a.species || a.especie); if (species === null) return;
  const sex = prompt('Sexo:', a.sex || a.sexo); if (sex === null) return;
  const age = prompt('Idade aproximada em anos:', String(a.age ?? a.idade)); if (age === null) return;
  const size = prompt('Porte (Pequeno, Médio ou Grande):', a.size || a.porte); if (size === null) return;
  const description = prompt('Descrição:', a.description || ''); if (description === null) return;
  const status = prompt('Status (Disponível, Em processo ou Adotado):', a.status); if (status === null) return;
  try {
    await api(`/api/animals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, species, sex, age, size, description, status }) });
    await loadAll();
    toast('Animal atualizado com sucesso.');
  } catch (e) {
    toast(e.message);
  }
};

window.deleteAnimal = async (id) => {
  const animal = state.animals.find(a => a.id === id);
  if (!animal) return;
  if (!confirm(`Deseja realmente excluir ${animal.name || animal.nome}? As solicitações de adoção relacionadas também serão excluídas.`)) return;
  try {
    await api(`/api/animals/${id}`, { method: 'DELETE' });
    await loadAll();
    toast('Animal excluído com sucesso.');
  } catch (e) {
    toast(e.message);
  }
};

window.deletePerson = async (type, id) => {
  if (!confirm('Deseja realmente excluir este cadastro?')) return;
  try {
    await api(`/api/${type}/${id}`, { method: 'DELETE' });
    await loadAll();
    toast('Cadastro excluído.');
  } catch (e) {
    toast(e.message);
  }
};

window.editPerson = async (type, id) => {
  const p = state[type].find(x => x.id === id);
  if (!p) return;
  const name = prompt('Nome completo:', p.name); if (name === null) return;
  const email = prompt('E-mail:', p.email); if (email === null) return;
  const phone = prompt('Telefone:', p.phone); if (phone === null) return;
  const city = prompt('Cidade:', p.city); if (city === null) return;
  try {
    await api(`/api/${type}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, name, email, phone, city }) });
    await loadAll();
    toast('Cadastro atualizado.');
  } catch (e) {
    toast(e.message);
  }
};

window.updateAdoption = async (id, status) => {
  try {
    await api(`/api/adoptions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    await loadAll();
    toast('Status da adoção atualizado.');
  } catch (e) {
    toast(e.message);
  }
};

window.deleteAdoption = async (id) => {
  if (!confirm('Excluir esta solicitação?')) return;
  try {
    await api(`/api/adoptions/${id}`, { method: 'DELETE' });
    await loadAll();
    toast('Solicitação excluída.');
  } catch (e) {
    toast(e.message);
  }
};

// ==========================================
// MODAL / ÁLBUM DE FOTOS (LIGHTBOX)
// ==========================================
let albumPhotos = [];
let albumIndex = 0;
let albumPetName = '';

window.openGallery = (animalId, startIndex = 0) => {
  const animal = state.animals.find(a => a.id === animalId);
  if (!animal) return;

  albumPhotos = (animal.fotos && animal.fotos.length) 
    ? animal.fotos 
    : (animal.photo ? String(animal.photo).split(',').map(p => p.trim()).filter(Boolean) : []);

  if (!albumPhotos.length) return;

  albumPetName = animal.name || animal.nome;
  albumIndex = startIndex;

  atualizarVisualizacao();
  const dialog = document.getElementById('photo-dialog');
  if (dialog) dialog.showModal();
};

window.closeGallery = () => {
  const dialog = document.getElementById('photo-dialog');
  if (dialog) dialog.close();
};

window.trocarFoto = (direcao) => {
  albumIndex += direcao;
  if (albumIndex >= albumPhotos.length) albumIndex = 0;
  if (albumIndex < 0) albumIndex = albumPhotos.length - 1;
  atualizarVisualizacao();
};

function atualizarVisualizacao() {
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  const btnPrev = document.getElementById('album-prev');
  const btnNext = document.getElementById('album-next');

  if (img) img.src = albumPhotos[albumIndex];
  if (caption) caption.textContent = `${albumPetName} (${albumIndex + 1} de ${albumPhotos.length})`;

  const displayNav = albumPhotos.length > 1 ? 'block' : 'none';
  if (btnPrev) btnPrev.style.display = displayNav;
  if (btnNext) btnNext.style.display = displayNav;
}

// Inicialização segura
document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  refreshAuth().then(loadAll);
});

// Caso o DOM já esteja carregado
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setupEvents();
  refreshAuth().then(loadAll);
}
