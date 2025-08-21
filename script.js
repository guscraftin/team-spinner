// Data de base
const MEMBERS = ["Rohan", "Augustin", "Mailys", "Nathan", "Alban", "Tom"];
const ROLES = [
  { key: "scribe", label: "Scribe ✍️", color: "#ffbf69" },
  { key: "timekeeper", label: "Time Keeper ⏰", color: "#2ec4b6" },
  { key: "feedbacker", label: "Feedbacker 💬", color: "#ff3864" },
  { key: "leader", label: "Leader Éveilleur 🌟", color: "#8f44fd" }
];

const state = {
  exclusions: {},
  lastAssignment: null
};
ROLES.forEach(r => state.exclusions[r.key] = new Set());

// Références DOM
const rolesContainer = document.getElementById('roles');
const exclusionsContainer = document.getElementById('exclusions');
const drawBtn = document.getElementById('drawBtn');
const msgEl = document.getElementById('message');
const resetExBtn = document.getElementById('resetExclusions');
const yearEl = document.getElementById('year');
const confettiLayer = document.getElementById('confettiLayer');
const animDurationRange = document.getElementById('animDuration');
const animDurationValue = document.getElementById('animDurationValue');

if(yearEl) yearEl.textContent = new Date().getFullYear();
let revealMs = parseInt(animDurationRange?.value || '1500', 10);
if(animDurationRange){
  const updateRangeLabel = () => animDurationValue.textContent = (revealMs/1000).toFixed(2)+'s';
  updateRangeLabel();
  animDurationRange.addEventListener('input', () => { revealMs = parseInt(animDurationRange.value,10); updateRangeLabel(); });
}

// Rendu des cartes rôles
function renderRoleCards(assignment=null){
  rolesContainer.innerHTML = '';
  ROLES.forEach(role => {
    const card = document.createElement('div');
    card.className = 'role-card';
    card.innerHTML = `
      <h3><span class="role-pill" style="background:${role.color}33; color:${role.color}">${role.key.toUpperCase()}</span>${role.label}</h3>
      <div class="role-name" data-role="${role.key}">${assignment?.[role.key] || '—'}</div>
    `;
    rolesContainer.appendChild(card);
  });
}

// Rendu des exclusions
function renderExclusions(){
  exclusionsContainer.innerHTML = '';
  ROLES.forEach(role => {
    const block = document.createElement('div');
    block.className = 'ex-block';
    block.innerHTML = `<h4>${role.label}</h4>`;
    const ul = document.createElement('ul'); ul.className='member-list';
    MEMBERS.forEach(member => {
      const id = `ex-${role.key}-${member}`;
      const li = document.createElement('li');
      li.innerHTML = `
        <input type="checkbox" id="${id}" data-role="${role.key}" value="${member}" ${state.exclusions[role.key].has(member)?'checked':''} />
        <label for="${id}">${member}</label>
      `;
      ul.appendChild(li);
    });
    block.appendChild(ul);
    exclusionsContainer.appendChild(block);
  });
}

exclusionsContainer.addEventListener('change', e => {
  const t = e.target;
  if(t.matches('input[type="checkbox"][data-role]')){
    const roleKey = t.dataset.role;
    const member = t.value;
    if(t.checked) state.exclusions[roleKey].add(member); else state.exclusions[roleKey].delete(member);
  }
});

resetExBtn.addEventListener('click', () => {
  ROLES.forEach(r => state.exclusions[r.key].clear());
  renderExclusions();
  announce('Exclusions réinitialisées.', 'success');
});

// Attribution avec backtracking
function assignRoles(){
  const order = [...ROLES];
  shuffleArray(order);
  const available = new Set(MEMBERS);
  const result = {};
  function backtrack(i){
    if(i===order.length) return true;
    const role = order[i];
    const candidates = MEMBERS.filter(m => available.has(m) && !state.exclusions[role.key].has(m));
    shuffleArray(candidates);
    for(const c of candidates){
      result[role.key]=c; available.delete(c);
      if(backtrack(i+1)) return true;
      available.add(c); delete result[role.key];
    }
    return false;
  }
  if(!backtrack(0)) throw new Error('Impossible de générer une attribution respectant les exclusions.');
  return result;
}

function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

function announce(txt,type='info'){ msgEl.textContent = txt; msgEl.className = 'message '+(type==='error'?'error':type==='success'?'success':''); }

// Effet roulette --------------------------------------------------
let activeRoulette = null;
function rollingEffect(assignment){
  const lockThreshold = 0.85; // proportion du temps avant laquelle on ne force pas l'arrêt
  const rolesState = {}; // roleKey -> { allowed, idx, target, locked }

  ROLES.forEach(r => {
    const allowed = MEMBERS.filter(m => !state.exclusions[r.key].has(m));
    // Sécurité : si exclusion totale => on garde quand même tous pour éviter blocage visuel
    if(allowed.length === 0) allowed.push(...MEMBERS);
    // Mélange pour l'ordre de départ, mais pas de doublons car on boucle
    shuffleArray(allowed);
    const target = assignment[r.key];
    let idx = allowed.indexOf(target);
    if(idx === -1){
      // Le nom assigné doit être inclus (cas improbable) -> on l'insère
      allowed.push(target); idx = allowed.length -1;
    }
    // Choisir un point de départ aléatoire pour variety
    idx = Math.floor(Math.random()*allowed.length);
    rolesState[r.key] = { allowed, idx, target, locked: allowed.length === 1 };

    const container = document.querySelector(`.role-name[data-role="${r.key}"]`);
    if(!container) return;
    container.classList.add('rolling');
    container.innerHTML = '';
    if(allowed.length === 1){
      container.textContent = allowed[0];
      return;
    }
    const roller = document.createElement('div'); roller.className='role-roller';
    const line = document.createElement('div'); line.className='role-roller-line';
    // prev/current/next init
    const prevIdx = (rolesState[r.key].idx -1 + allowed.length)%allowed.length;
    const nextIdx = (rolesState[r.key].idx +1)%allowed.length;
    const prevEl = document.createElement('div'); prevEl.className='role-slot prev'; prevEl.textContent = allowed[prevIdx];
    const curEl = document.createElement('div'); curEl.className='role-slot current'; curEl.textContent = allowed[rolesState[r.key].idx];
    const nextEl = document.createElement('div'); nextEl.className='role-slot next'; nextEl.textContent = allowed[nextIdx];
    line.appendChild(prevEl); line.appendChild(curEl); line.appendChild(nextEl);
    roller.appendChild(line); container.appendChild(roller);
  });

  let rafId; const start = performance.now(); let lastSwitch = 0; const baseInterval = 70; // rapide au début

  function updateRole(r){
    const st = rolesState[r.key]; if(!st || st.locked) return;
    const container = document.querySelector(`.role-name[data-role="${r.key}"]`);
    const line = container?.querySelector('.role-roller-line'); if(!line) return;
    const slots = line.querySelectorAll('.role-slot'); if(slots.length!==3) return;
    // Avance index
    st.idx = (st.idx +1) % st.allowed.length;
    const curName = st.allowed[st.idx];
    // Recalcule prev/next indices
    const prevIdx = (st.idx -1 + st.allowed.length)%st.allowed.length;
    const nextIdx = (st.idx +1) % st.allowed.length;
    slots[0].textContent = st.allowed[prevIdx]; // prev
    slots[1].textContent = curName;            // current
    slots[2].textContent = st.allowed[nextIdx]; // next
  }

  function maybeLock(r, progress){
    const st = rolesState[r.key]; if(!st || st.locked) return;
    const container = document.querySelector(`.role-name[data-role="${r.key}"]`);
    if(!container) return;
    const currentName = container.querySelector('.role-slot.current')?.textContent;
    if(progress >= lockThreshold && currentName === st.target){
      st.locked = true;
    }
  }

  function finalizeRole(r){
    const st = rolesState[r.key];
    const container = document.querySelector(`.role-name[data-role="${r.key}"]`);
    if(!container) return;
    container.classList.remove('rolling');
    container.textContent = st ? st.target : assignment[r.key];
    container.classList.remove('spin'); void container.offsetWidth; container.classList.add('spin');
  }

  function step(now){
    const elapsed = now - start; const progress = Math.min(1, elapsed / revealMs);
    const curInterval = baseInterval * (1 + 10 * progress * progress);
    if(now - lastSwitch >= curInterval){
      ROLES.forEach(r => { updateRole(r); maybeLock(r, progress); });
      lastSwitch = now;
    }
    if(elapsed < revealMs){
      rafId = requestAnimationFrame(step);
    } else {
      // Forcer l'arrêt sur la cible pour chaque rôle
      ROLES.forEach(r => finalizeRole(r));
    }
  }

  rafId = requestAnimationFrame(step);
  activeRoulette = { cancel: () => cancelAnimationFrame(rafId), rolesState };
  return activeRoulette;
}

function stopRolling(handler){
  handler?.cancel?.();
  // Finalisation déjà faite dans step lorsque le temps est écoulé; si arrêt anticipé, on force
  if(handler && handler.rolesState){
    ROLES.forEach(r => {
      const st = handler.rolesState[r.key];
      const container = document.querySelector(`.role-name[data-role="${r.key}"]`);
      if(container && container.classList.contains('rolling')){
        container.classList.remove('rolling');
        container.textContent = st ? st.target : container.textContent;
      }
    });
  }
}

// Affichage final noms + confettis
function animateNames(assignment){
  ROLES.forEach(r => {
    const el = document.querySelector(`.role-name[data-role="${r.key}"]`);
    if(!el) return;
    el.classList.remove('spin');
    // Remplacer tout par le nom final
    el.textContent = assignment[r.key];
    void el.offsetWidth; // reflow
    el.classList.add('spin');
  });
  launchConfetti();
}

function launchConfetti(){
  if(!confettiLayer) return;
  const colors = ['#ffbf69','#2ec4b6','#ff3864','#8f44fd','#ff9f1c','#ffffff'];
  const pieces = 70;
  for(let i=0;i<pieces;i++){
    const d = document.createElement('div'); d.className='confetti-piece';
    const size = 6 + Math.random()*8;
    d.style.width=size+'px'; d.style.height=(size*1.3)+'px';
    d.style.background = colors[Math.floor(Math.random()*colors.length)];
    d.style.left = (Math.random()*100)+'%';
    const delay = Math.random()*0.3; const fall = 2.4 + Math.random()*2.4; 
    const rotStart = (Math.random()*360)+'deg'; const rotEnd = (Math.random()*720 - 360)+'deg';
    d.style.transform = `rotate(${rotStart})`;
    d.style.animationDuration = fall+'s';
    d.style.animationDelay = delay+'s';
    d.style.setProperty('--rotEnd', rotEnd);
    confettiLayer.appendChild(d);
    setTimeout(()=>d.remove(), (fall+delay)*1000 + 400);
  }
}

// Gestion tirage --------------------------------------------------
let drawing = false;

drawBtn.addEventListener('click', () => {
  if(drawing) return;
  let assignment;
  try { assignment = assignRoles(); } catch(e){ announce(e.message,'error'); return; }
  drawing = true; drawBtn.disabled = true; disableExclusions(true); announce('Tirage en cours...');
  const handler = rollingEffect(assignment);
  setTimeout(() => {
    requestAnimationFrame(() => {
      try {
        state.lastAssignment = assignment;
        // Le step final a déjà figé les noms; juste confettis
        launchConfetti();
        announce('Attribution réussie !', 'success');
      } catch(e){ console.error(e); announce('Erreur inattendue.','error'); }
      finally { drawing = false; drawBtn.disabled = false; disableExclusions(false); }
    });
  }, revealMs + 30); // léger buffer
});

function disableExclusions(disabled){
  exclusionsContainer.querySelectorAll('input[type="checkbox"][data-role]').forEach(cb => { cb.disabled = disabled; });
}

// Raccourci clavier
window.addEventListener('keydown', e => { if(e.key.toLowerCase()==='t') drawBtn.click(); });

// Initialisation
renderRoleCards();
renderExclusions();
announce('Prêt pour un tirage.');
