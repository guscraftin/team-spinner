// Data de base
const MEMBERS = ["Alban", "Augustin", "Mailys", "Nathan", "Rohan", "Tom"];
const ROLES = [
  { key: "scribe", label: "Scribe ✍️", color: "#ffbf69" },
  { key: "feedbacker", label: "Meta Feedbacker 💬", color: "#ff3864" },
  { key: "leader", label: "Leader Éveilleur 🌟", color: "#8f44fd" },
  { key: "timekeeper", label: "Time Keeper ⏰", color: "#2ec4b6" }
];
// Webhook Discord (laisser vide si non utilisé) — ATTENTION : exposé côté client.
const WEBHOOK_URL = (window.APP_CONFIG && window.APP_CONFIG.WEBHOOK_URL) || '';

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
const globalExclusionsContainer = document.getElementById('globalExclusions');
const assignModeSelect = document.getElementById('assignMode');
const assignModeLabel = document.getElementById('assignModeLabel');
const assignModeDesc = document.getElementById('assignModeDesc');
const statsBar = document.getElementById('statsBar');

const MODE_DESCS = {
  default: 'Aléatoire simple : distribution rapide, légère préférence structurelle possible mais acceptable en pratique.',
  uniform: 'Uniforme parfaite : calcule toutes les distributions valides et choisit l’une d’elles au hasard (répartition mathématiquement équitable).',
  weighted: 'Équilibrage progressif : réduit les écarts historiques en augmentant les chances des membres moins servis pour chaque rôle.'
};
function updateModeDesc(mode){ if(assignModeDesc) assignModeDesc.textContent = MODE_DESCS[mode] || ''; }
// Initialiser libellé + description si le select existe
if(assignModeSelect){
  const opt = assignModeSelect.options[assignModeSelect.selectedIndex];
  if(assignModeLabel && opt) assignModeLabel.textContent = opt.text;
  updateModeDesc(assignModeSelect.value);
}

if(yearEl) yearEl.textContent = new Date().getFullYear();
let revealMs = parseInt(animDurationRange?.value || '4000', 10);
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
  renderGlobalExclusions();
}

function renderGlobalExclusions(){
  if(!globalExclusionsContainer) return;
  globalExclusionsContainer.innerHTML = '';
  MEMBERS.forEach(member => {
    // Un membre est globalement exclu si il est exclu de tous les rôles
    const globallyExcluded = ROLES.every(r => state.exclusions[r.key].has(member));
    const id = `gex-${member}`;
    const wrap = document.createElement('div'); wrap.className='ge-item';
    wrap.innerHTML = `
      <input type="checkbox" id="${id}" data-member="${member}" ${globallyExcluded?'checked':''} />
      <label for="${id}">${member}<span class="tag">ALL</span></label>
    `;
    globalExclusionsContainer.appendChild(wrap);
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

globalExclusionsContainer?.addEventListener('change', e => {
  const t = e.target;
  if(t.matches('input[type="checkbox"][data-member]')){
    const member = t.dataset.member;
    if(t.checked){
      // Ajouter dans toutes les exclusions
      ROLES.forEach(r => state.exclusions[r.key].add(member));
    } else {
      // Retirer de toutes les exclusions
      ROLES.forEach(r => state.exclusions[r.key].delete(member));
    }
    renderExclusions(); // re-render pour synchro
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

// Historique
const HISTORY_KEY = 'teamSpinnerHistoryV1';
function loadHistory(){ try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; } }
function saveHistory(h){ localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }
let history = loadHistory();

function buildCounters(){
  const counters = {};
  MEMBERS.forEach(m => counters[m] = {});
  history.forEach(entry => {
    ROLES.forEach(r => {
      const person = entry.assignment[r.key];
      counters[person][r.key] = (counters[person][r.key] || 0) + 1;
    });
  });
  return counters;
}

function renderStats(){
  if(!statsBar) return;
  const counters = buildCounters();
  const total = history.length || 1;
  statsBar.innerHTML = '';
  // On calcule pour chaque membre un score d'équilibre (std simple)
  MEMBERS.forEach(m => {
    let sum = 0; let arr = [];
    ROLES.forEach(r => { const c = counters[m][r.key] || 0; arr.push(c); sum += c; });
    const mean = sum / ROLES.length;
    const variance = arr.reduce((a,v)=>a + Math.pow(v-mean,2),0)/ROLES.length;
    const std = Math.sqrt(variance);
    const chip = document.createElement('div');
    chip.className = 'stats-chip ' + (std > total*0.15 ? 'bad':'good');
    chip.innerHTML = `<span>${m}</span> ${arr.map(v=>v).join('/')}`;
    statsBar.appendChild(chip);
  });
}

let ASSIGN_MODE = 'default';
assignModeSelect?.addEventListener('change', () => {
  ASSIGN_MODE = assignModeSelect.value;
  assignModeLabel.textContent = assignModeSelect.options[assignModeSelect.selectedIndex].text;
  updateModeDesc(ASSIGN_MODE);
  renderStats();
});
assignModeSelect?.addEventListener('mousemove', e => {
  const opt = e.target.closest('option');
  if(opt) updateModeDesc(opt.value);
});
assignModeSelect?.addEventListener('mouseleave', () => updateModeDesc(ASSIGN_MODE));

window.setAssignMode = mode => { ASSIGN_MODE = mode; if(assignModeSelect){ assignModeSelect.value = mode; assignModeLabel.textContent = assignModeSelect.options[assignModeSelect.selectedIndex].text; } renderStats(); console.log('Mode attribution =', mode); };

// Attribution uniforme exhaustive
function assignRolesUniform(){
  const valid = [];
  const members = [...MEMBERS];
  function permute(arr, l){
    if(l === 4){
      const partial = arr.slice(0,4);
      for(let i=0;i<ROLES.length;i++) if(state.exclusions[ROLES[i].key].has(partial[i])) return;
      const obj = {}; for(let i=0;i<ROLES.length;i++) obj[ROLES[i].key] = partial[i];
      valid.push(obj); return;
    }
    for(let i=l;i<arr.length;i++){
      [arr[l],arr[i]] = [arr[i],arr[l]];
      permute(arr,l+1);
      [arr[l],arr[i]] = [arr[i],arr[l]];
    }
  }
  permute(members,0);
  if(valid.length === 0) throw new Error('Aucune attribution valide.');
  return valid[Math.floor(Math.random()*valid.length)];
}

// Attribution pondérée (équilibrage)
function assignRolesWeighted(){
  const counters = buildCounters();
  const available = new Set(MEMBERS);
  const result = {};
  for(const role of ROLES){
    const candidates = [...available].filter(m => !state.exclusions[role.key].has(m));
    if(candidates.length === 0) throw new Error('Exclusion totale pour un rôle.');
    const weights = candidates.map(m => 1 / (1 + (counters[m][role.key] || 0)));
    const total = weights.reduce((a,b)=>a+b,0);
    let r = Math.random() * total; let chosen = candidates[0];
    for(let i=0;i<candidates.length;i++){ r -= weights[i]; if(r <= 0){ chosen = candidates[i]; break; } }
    result[role.key] = chosen; available.delete(chosen);
  }
  return result;
}

function getAssignment(){
  switch(ASSIGN_MODE){
    case 'uniform': return assignRolesUniform();
    case 'weighted': return assignRolesWeighted();
    default: return assignRoles();
  }
}

// Gestion tirage --------------------------------------------------
let drawing = false;

drawBtn.addEventListener('click', () => {
  if(drawing) return;
  let assignment;
  try { assignment = getAssignment(); } catch(e){ announce(e.message,'error'); return; }
  drawing = true; drawBtn.disabled = true; disableExclusions(true); assignModeSelect.disabled = true; announce('Tirage en cours...');
  const handler = rollingEffect(assignment);
  setTimeout(() => {
    requestAnimationFrame(() => {
      try {
        state.lastAssignment = assignment;
        history.push({ ts: Date.now(), assignment });
        saveHistory(history);
        renderStats();
        sendDiscordWebhook(assignment);
        launchConfetti();
        announce('Attribution réussie !', 'success');
      } catch(e){ console.error(e); announce('Erreur inattendue.','error'); }
      finally { drawing = false; drawBtn.disabled = false; disableExclusions(false); assignModeSelect.disabled = false; }
    });
  }, revealMs + 30);
});

function buildConstraintsSummary(){
  // Globalement exclus (exclus de tous les rôles)
  const globalExcluded = MEMBERS.filter(m => ROLES.every(r => state.exclusions[r.key].has(m)));
  let lines = [];
  if(globalExcluded.length){
    lines.push(`Exclus tous rôles: ${globalExcluded.join(', ')}`);
  }
  ROLES.forEach(r => {
    const ex = [...state.exclusions[r.key]];
    if(ex.length){
      lines.push(`${r.key}: ${ex.join(', ')}`);
    }
  });
  if(!lines.length) return 'Aucune exclusion active';
  return lines.join('\n');
}

function sendDiscordWebhook(assignment){
  if(!WEBHOOK_URL) return; // inactif si vide
  try {
    const roleFields = ROLES.map(r => ({
      name: r.label,
      value: '`' + assignment[r.key] + '`',
      inline: true
    }));
    const constraints = buildConstraintsSummary();
    const fields = [];
    const SEP = '━━━━━━━━━━━━━━━━━━━━';
    // Séparateur haut
    fields.push({ name: SEP, value: '', inline: false });
    // Rôles
    fields.push(...roleFields);
    // Séparateur intermédiaire
    fields.push({ name: SEP, value: '', inline: false });
    // Mode + durée
    fields.push({
      name: '`🎛️` Mode / Animation',
      value: `Mode: **${ASSIGN_MODE}**\nDurée: **${(revealMs/1000).toFixed(2)}s**`,
      inline: false
    });
    // Contraintes le cas échéant
    if(constraints && constraints !== 'Aucune exclusion active'){
      fields.push({
        name: '`⚠️` Contraintes',
        value: constraints.length > 1000 ? constraints.slice(0,1000)+'…' : constraints,
        inline: false
      });
    }
    // Séparateur bas
    fields.push({ name: SEP, value: '\u200b', inline: false });

    const embed = {
      title: '`🎰` Nouveau tirage de rôles',
      color: 0x00B4D8,
      description: 'Attribution réalisée avec succès.',
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: 'Equipe 6GMA • Equité & Fun' }
    };
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username:'Team Spinner', embeds:[embed] })
    }).catch(()=>{});
  } catch(err){
    console.warn('Webhook error', err);
  }
}

// Initialisation
renderRoleCards();
renderExclusions();
renderGlobalExclusions();
renderStats();
announce('Prêt pour un tirage.');

function disableExclusions(disabled){
  if(exclusionsContainer) exclusionsContainer.querySelectorAll('input[type="checkbox"][data-role]').forEach(cb => cb.disabled = disabled);
  if(globalExclusionsContainer) globalExclusionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.disabled = disabled);
  if(resetExBtn) resetExBtn.disabled = disabled;
  if(animDurationRange) animDurationRange.disabled = disabled;
  if(assignModeSelect && disabled === false) assignModeSelect.disabled = false;
}
