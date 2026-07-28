const grid = document.getElementById('grid');
const overlay = document.getElementById('overlay');
const detailOverlay = document.getElementById('detailOverlay');
const loginOverlay = document.getElementById('loginOverlay');
const searchInput = document.getElementById('searchInput');

let recipes = [];
let editingId = null;
let pendingPicture = null;
let searchTerm = '';

// The admin token only lives in sessionStorage — it just keeps the admin
// signed in if they refresh the page, and clears when the tab is closed.
// It is NOT how recipes are stored; those live on the server.
let favorites = JSON.parse(localStorage.getItem('recipeFavorites') || '[]');
let showingFavoritesOnly = false;
let currentDetailId = null;

function saveFavorites(){
  localStorage.setItem('recipeFavorites', JSON.stringify(favorites));
}
function isFav(id){ return favorites.includes(id); }
function toggleFav(id){
  favorites = isFav(id) ? favorites.filter(f => f !== id) : [...favorites, id];
  saveFavorites();
}
let authToken = sessionStorage.getItem('recipeBoxToken') || null;

function esc(s){
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function setAdminUI(isAdmin){
  document.body.classList.toggle('is-admin', isAdmin);
  const adminBtn = document.getElementById('adminBtn');
  adminBtn.textContent = isAdmin ? 'log out (anja)' : 'edit';
  adminBtn.classList.toggle('logged-in', isAdmin);
}

function matchesSearch(r, term){
  if(!term) return true;
  const t = term.toLowerCase();
  return (r.name || '').toLowerCase().includes(t) ||
         (r.ingredients || '').toLowerCase().includes(t);
}

function render(){
  grid.innerHTML = '';
  const visible = recipes.filter(r => matchesSearch(r, searchTerm) && (!showingFavoritesOnly || isFav(r.id)));

  if(visible.length === 0){
    grid.innerHTML = `<div class="empty">${recipes.length === 0 ? 'No recipes yet.' : 'Nothing matches your search.'}</div>`;
    return;
  }

  visible.slice().reverse().forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', r.id);
    const imgHtml = r.picture
      ? `<img src="${r.picture}" alt="${esc(r.name)}" onerror="this.parentElement.classList.add('placeholder'); this.remove();">`
      : '';
    card.innerHTML = `
      <div class="hover-actions">
        <button class="edit-btn" data-id="${r.id}">Edit</button>
        <button class="del-btn" data-id="${r.id}">Delete</button>
      </div>
      <div class="imgwrap ${r.picture ? '' : 'placeholder'}">
        ${imgHtml || 'no photo'}
        ${r.time ? `<div class="time-pill">${esc(r.time)}</div>` : ''}
      </div>
      <div class="info">
        <h3>${esc(r.name)}</h3>
        <p class="ingredients">${esc(r.ingredients)}</p>
      </div>
    `;
    grid.appendChild(card);
  });
  document.getElementById('favBtn').addEventListener('click', ()=>{
  showingFavoritesOnly = !showingFavoritesOnly;
  document.getElementById('favBtn').classList.toggle('active', showingFavoritesOnly);
  render();
});

document.getElementById('detailFavBtn').addEventListener('click', ()=>{
  if(!currentDetailId) return;
  toggleFav(currentDetailId);
  document.getElementById('detailFavBtn').classList.toggle('faved', isFav(currentDetailId));
  if(showingFavoritesOnly) render();
});
  document.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if(e.target.closest('.hover-actions')) return;
      openDetail(card.getAttribute('data-id'));
    });
  });
  document.querySelectorAll('.edit-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openModal(e.currentTarget.getAttribute('data-id'));
    });
  });
  document.querySelectorAll('.del-btn').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      if(!confirm('Delete this recipe?')) return;
      const res = await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if(res && res.ok){
        recipes = recipes.filter(r=>r.id !== id);
        render();
      }
    });
  });
}

searchInput.addEventListener('input', (e)=>{
  searchTerm = e.target.value;
  render();
});

async function loadRecipes(){
  try{
    const res = await fetch('/api/recipes');
    recipes = await res.json();
  }catch(err){
    console.error('Could not load recipes', err);
    recipes = [];
  }
  render();
}

// Wrapper that attaches the admin token and handles 401s uniformly.
async function apiFetch(url, options = {}){
  options.headers = options.headers || {};
  if(authToken) options.headers['Authorization'] = `Bearer ${authToken}`;
  if(options.body && !options.headers['Content-Type']){
    options.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, options);
  if(res.status === 401){
    alert('Your admin session expired. Please sign in again.');
    logOut();
    return null;
  }
  return res;
}

function openDetail(id){
  const r = recipes.find(x=>x.id === id);
  currentDetailId = id;
  document.getElementById('detailFavBtn').classList.toggle('faved', isFav(id));
  if(!r) return;
  document.getElementById('dName').textContent = r.name;
  document.getElementById('dTime').textContent = r.time || '';
  document.getElementById('dIngredients').textContent = r.ingredients || 'Not listed.';
  document.getElementById('dInstructions').textContent = r.instructions || 'Not listed.';
  const imgWrap = document.getElementById('dImgWrap');
  imgWrap.innerHTML = r.picture ? `<img src="${r.picture}" alt="${esc(r.name)}">` : '';
  imgWrap.style.display = r.picture ? 'block' : 'none';
  detailOverlay.classList.add('open');
}
function closeDetail(){ detailOverlay.classList.remove('open'); }
document.getElementById('detailClose').addEventListener('click', closeDetail);
detailOverlay.addEventListener('click', (e)=>{ if(e.target === detailOverlay) closeDetail(); });

function setPicPreview(src){
  const wrap = document.getElementById('picPreviewWrap');
  const img = document.getElementById('picPreview');
  if(src){
    img.src = src;
    wrap.classList.add('show');
  } else {
    img.src = '';
    wrap.classList.remove('show');
  }
}

document.getElementById('fPicture').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    pendingPicture = ev.target.result;
    setPicPreview(pendingPicture);
  };
  reader.readAsDataURL(file);
});

function openModal(id){
  if(!authToken) return; // safety net — admin-only action
  editingId = id || null;
  const modalTitle = document.querySelector('#modal h2');
  const saveBtn = document.getElementById('saveBtn');
  pendingPicture = null;
  document.getElementById('fPicture').value = '';
  if(editingId){
    const r = recipes.find(x=>x.id === editingId);
    document.getElementById('fName').value = r.name || '';
    document.getElementById('fIngredients').value = r.ingredients || '';
    document.getElementById('fInstructions').value = r.instructions || '';
    document.getElementById('fTime').value = r.time || '';
    pendingPicture = r.picture || null;
    setPicPreview(pendingPicture);
    modalTitle.textContent = 'Edit recipe';
    saveBtn.textContent = 'Save changes';
  } else {
    modalTitle.textContent = 'Add a recipe';
    saveBtn.textContent = 'Save recipe';
    setPicPreview(null);
  }
  overlay.classList.add('open');
  document.getElementById('fName').focus();
}
function closeModal(){
  overlay.classList.remove('open');
  editingId = null;
  pendingPicture = null;
  ['fName','fIngredients','fInstructions','fTime'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fPicture').value = '';
  setPicPreview(null);
}

document.getElementById('addBtn').addEventListener('click', ()=>openModal(null));
document.getElementById('closeX').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeModal(); });

document.getElementById('saveBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('fName').value.trim();
  const ingredients = document.getElementById('fIngredients').value.trim();
  const instructions = document.getElementById('fInstructions').value.trim();
  const time = document.getElementById('fTime').value.trim();
  const picture = pendingPicture;
  if(!name){
    document.getElementById('fName').focus();
    return;
  }
  const payload = { name, ingredients, instructions, time, picture };

  let res;
  if(editingId){
    res = await apiFetch(`/api/recipes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    res = await apiFetch('/api/recipes', { method: 'POST', body: JSON.stringify(payload) });
  }
  if(res && res.ok){
    await loadRecipes();
    closeModal();
  } else if(res){
    alert('Could not save the recipe.');
  }
});

// --- Export / Import (admin only) --------------------------------------
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(recipes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'recipes.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', ()=>{
  document.getElementById('importInput').click();
});
document.getElementById('importInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (ev)=>{
    try{
      const imported = JSON.parse(ev.target.result);
      if(!Array.isArray(imported)) return;
      const res = await apiFetch('/api/recipes', { method: 'PUT', body: JSON.stringify(imported) });
      if(res && res.ok){
        await loadRecipes();
      }
    }catch(err){ console.error('Invalid recipes file', err); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// --- Admin login ---------------------------------------------------------
const adminBtn = document.getElementById('adminBtn');
const loginError = document.getElementById('loginError');

adminBtn.addEventListener('click', ()=>{
  if(authToken){
    logOut();
  } else {
    openLogin();
  }
});

function openLogin(){
  loginError.classList.remove('show');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  loginOverlay.classList.add('open');
  document.getElementById('loginUser').focus();
}
function closeLogin(){ loginOverlay.classList.remove('open'); }
document.getElementById('loginClose').addEventListener('click', closeLogin);
document.getElementById('loginCancelBtn').addEventListener('click', closeLogin);
loginOverlay.addEventListener('click', (e)=>{ if(e.target === loginOverlay) closeLogin(); });

async function signIn(){
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  try{
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if(res.ok){
      const data = await res.json();
      authToken = data.token;
      sessionStorage.setItem('recipeBoxToken', authToken);
      setAdminUI(true);
      closeLogin();
      render();
    } else {
      loginError.classList.add('show');
    }
  }catch(err){
    loginError.textContent = 'Could not reach the server.';
    loginError.classList.add('show');
  }
}
document.getElementById('loginSubmitBtn').addEventListener('click', signIn);
document.getElementById('loginPass').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') signIn();
});

async function logOut(){
  if(authToken){
    try{ await apiFetch('/api/logout', { method: 'POST' }); }catch(err){}
  }
  authToken = null;
  sessionStorage.removeItem('recipeBoxToken');
  setAdminUI(false);
  render();
}

// --- Init -----------------------------------------------------------------
setAdminUI(!!authToken);
loadRecipes();
