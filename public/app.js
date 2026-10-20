const $ = (s) => document.querySelector(s);
const state = { animals: [], donors: [], adopters: [], adoptions: [], isAdmin:false };
const escapeHtml = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url, options={}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3500); }
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
function setMessage(id,msg){ $(id).textContent=msg; }
async function loadAll() {
  try {
    [state.animals,state.donors,state.adopters,state.adoptions] = await Promise.all([
      api('/api/animals'),...(state.isAdmin?[api('/api/donors'),api('/api/adopters'),api('/api/adoptions')]:[Promise.resolve([]),Promise.resolve([]),Promise.resolve([])])
    ]);
    renderAnimals(); renderPeople('donors'); renderPeople('adopters'); renderAdoptions(); fillSelects();
  } catch(e) { toast(e.message); }
}
function renderAnimals() {
  const term=($('#search').value||'').toLowerCase();
  const items=state.animals.filter(a=>`${a.name} ${a.species}`.toLowerCase().includes(term));
  $('#animal-cards').innerHTML=items.length?items.map(a=>`<article class="animal-card">
    ${a.photo?`<img src="${escapeHtml(a.photo)}" alt="Foto de ${escapeHtml(a.name)}">`:`<div class="no-photo" aria-label="Sem foto">🐾</div>`}
    <div class="animal-info"><h3>${escapeHtml(a.name)}</h3><p>🐾 ${escapeHtml(a.species)} · ${escapeHtml(a.sex)}</p><p>◷ ${a.age} ${a.age==1?'ano':'anos'} · Porte ${escapeHtml(a.size.toLowerCase())}</p>
    <span class="status ${a.status==='Disponível'?'':'other'}">${escapeHtml(a.status)}</span>${a.description?`<p>${escapeHtml(a.description)}</p>`:''}
    ${a.status==='Disponível'?`<a class="btn" href="#adocoes" onclick="prefillAnimal(${a.id})">Quero adotar →</a>`:''}${state.isAdmin?`<div style="display:flex;gap:8px;margin-top:8px"><button class="action" style="flex:1" onclick="editAnimal(${a.id})">Editar animal</button><button class="action danger" style="flex:1" onclick="deleteAnimal(${a.id})">Excluir animal</button></div>`:''}</div></article>`).join(''):'<p class="empty">Nenhum animal encontrado. Cadastre um novo amigo acima.</p>';
}
function renderPeople(type) {
  const isDonor=type==='donors', rows=state[type], target=isDonor?'#donor-rows':'#adopter-rows';
  $(target).innerHTML=rows.length?rows.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.email)}</td><td>${escapeHtml(p.phone)}</td><td>${escapeHtml(p.city)}</td><td><button class="action" onclick="editPerson('${type}',${p.id})">Editar</button> <button class="action danger" onclick="deletePerson('${type}',${p.id})">Excluir</button></td></tr>`).join(''):`<tr><td colspan="5" class="empty">Nenhum cadastro realizado.</td></tr>`;
}
function fillSelects() {
  const donor=$('#animal-donor'), animal=$('#adoption-animal');
  donor.innerHTML='<option value="">Sem vínculo</option>'+state.donors.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('');
  animal.innerHTML='<option value="">Selecione um animal</option>'+state.animals.filter(a=>a.status==='Disponível').map(x=>`<option value="${x.id}">${escapeHtml(x.name)} — ${escapeHtml(x.species)}</option>`).join('');
}
function renderAdoptions(){
  $('#adoption-rows').innerHTML=state.adoptions.length?state.adoptions.map(a=>`<tr><td>${escapeHtml(a.animal_name)}</td><td>${escapeHtml(a.adopter_name)}</td><td>${escapeHtml(a.created_at)}</td><td><span class="status ${a.status==='Pendente'?'other':''}">${escapeHtml(a.status)}</span></td><td>${state.isAdmin?(a.status==='Pendente'?`<button class="action" onclick="updateAdoption(${a.id},'Aprovada')">Aprovar</button> <button class="action danger" onclick="updateAdoption(${a.id},'Recusada')">Recusar</button>`:'')+` <button class="action danger" onclick="deleteAdoption(${a.id})">Excluir</button>`:'Somente administrador'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Ainda não há solicitações de adoção.</td></tr>';
}
window.prefillAnimal=(id)=>{ $('#adoption-animal').value=String(id); $('#adocoes').scrollIntoView({behavior:'smooth'}); };
function updateAdminUI(){
  $('#admin-panel').style.display='block';
  $('#admin-login').style.display=state.isAdmin?'none':'grid';
  $('#admin-logout').style.display=state.isAdmin?'inline-block':'none';
  $('#admin-status').textContent=state.isAdmin?'Sessão de administrador ativa. Você pode cadastrar animais e aprovar ou recusar adoções.':'Entre para gerenciar cadastros e decisões de adoção.';
  $('#cadastro-animal').style.display=state.isAdmin?'block':'none';
  $('#doadores').style.display=state.isAdmin?'block':'none';
  $('#nav-doadores').style.display=state.isAdmin?'inline':'none';
  $('#animal-form').style.display=state.isAdmin?'grid':'none';
  $('#donor-form').style.display=state.isAdmin?'grid':'none';
  $('#adopter-form').style.display='grid';
  $('#adoption-form').style.display='grid';
}
async function refreshAuth(){try{const r=await api('/api/auth/me');state.isAdmin=!!r.authenticated;}catch{state.isAdmin=false;}updateAdminUI();}
$('#admin-open').addEventListener('click',()=>{const panel=$('#admin-panel');panel.style.display=panel.style.display==='none'?'block':'none';panel.scrollIntoView({behavior:'smooth',block:'start'});});
$('#admin-login').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;try{await api('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData(form))});state.isAdmin=true;form.reset();setMessage('#admin-msg','Login realizado.');updateAdminUI();await loadAll();}catch(err){setMessage('#admin-msg',err.message);}});
$('#admin-logout').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST'});}finally{state.isAdmin=false;updateAdminUI();await loadAll();}});
$('#search').addEventListener('input',renderAnimals);
$('#animal-form').addEventListener('submit',async e=>{
  e.preventDefault(); const form=e.currentTarget; const fd=new FormData(form);
  try{await api('/api/animals',{method:'POST',body:fd});form.reset();setMessage('#animal-msg','Animal cadastrado com sucesso!');await loadAll();toast('Animal cadastrado com sucesso.');}
  catch(err){setMessage('#animal-msg',err.message);}
});
async function registerForm(id, endpoint, type) {
  $(id).addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;try{await api(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData(form))});form.reset();setMessage(`#${type}-msg`,'Cadastro realizado com sucesso!');await loadAll();toast('Cadastro realizado com sucesso.');}catch(err){setMessage(`#${type}-msg`,err.message);}});
}
registerForm('#donor-form','/api/donors','donor');
registerForm('#adopter-form','/api/adopters','adopter');
$('#adoption-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;try{const result=await api('/api/adoptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData(form))});form.reset();setMessage('#adoption-msg',`Solicitação #${result.request_id} registrada! Status: ${result.status}. Guarde esse número para consultar com a equipe.`);await loadAll();toast('Solicitação de adoção registrada.');}catch(err){setMessage('#adoption-msg',err.message);}});
window.editAnimal=async(id)=>{
  if(!state.isAdmin){toast('Somente administradores podem editar animais.');return;}
  const a=state.animals.find(x=>x.id===id);
  if(!a)return;
  const name=prompt('Nome do animal:',a.name); if(name===null)return;
  const species=prompt('Espécie (Cachorro, Gato ou Outro):',a.species); if(species===null)return;
  const sex=prompt('Sexo:',a.sex); if(sex===null)return;
  const age=prompt('Idade aproximada em anos:',String(a.age)); if(age===null)return;
  const size=prompt('Porte (Pequeno, Médio ou Grande):',a.size); if(size===null)return;
  const description=prompt('Descrição:',a.description||''); if(description===null)return;
  const status=prompt('Status (Disponível, Em processo ou Adotado):',a.status); if(status===null)return;
  try{
    await api(`/api/animals/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,species,sex,age,size,description,status})});
    await loadAll(); toast('Animal atualizado com sucesso.');
  }catch(e){toast(e.message);}
};
window.deleteAnimal=async(id)=>{
  const animal=state.animals.find(a=>a.id===id);
  if(!animal)return;
  if(!confirm(`Deseja realmente excluir ${animal.name}? As solicitações de adoção relacionadas também serão excluídas.`))return;
  try{await api(`/api/animals/${id}`,{method:'DELETE'});await loadAll();toast('Animal excluído com sucesso.');}
  catch(e){toast(e.message);}
};
window.deletePerson=async(type,id)=>{if(!confirm('Deseja realmente excluir este cadastro?'))return;try{await api(`/api/${type}/${id}`,{method:'DELETE'});await loadAll();toast('Cadastro excluído.');}catch(e){toast(e.message);}};
window.editPerson=async(type,id)=>{const p=state[type].find(x=>x.id===id);if(!p)return;const name=prompt('Nome completo:',p.name);if(name===null)return;const email=prompt('E-mail:',p.email);if(email===null)return;const phone=prompt('Telefone:',p.phone);if(phone===null)return;const city=prompt('Cidade:',p.city);if(city===null)return;try{await api(`/api/${type}/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,name,email,phone,city})});await loadAll();toast('Cadastro atualizado.');}catch(e){toast(e.message);}};
window.updateAdoption=async(id,status)=>{try{await api(`/api/adoptions/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});await loadAll();toast('Status da adoção atualizado.');}catch(e){toast(e.message);}};
window.deleteAdoption=async(id)=>{if(!confirm('Excluir esta solicitação?'))return;try{await api(`/api/adoptions/${id}`,{method:'DELETE'});await loadAll();toast('Solicitação excluída.');}catch(e){toast(e.message);}};
refreshAuth().then(loadAll);
