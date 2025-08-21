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
function rollingEffect(){
  ROLES.forEach(r => {
    const container = document.querySelector(`.role-name[data-role="${r.key}"]`);
    if(!container) return;
    container.classList.add('rolling');
    container.innerHTML = '';
    const roller = document.createElement('div'); roller.className='role-roller';
    const line = document.createElement('div'); line.className='role-roller-line';
    ['prev','current','next'].forEach(cls => {
      const slot = document.createElement('div');
      slot.className = 'role-slot '+cls;
      slot.textContent = randomRollingSequence();
      line.appendChild(slot);
    });
    roller.appendChild(line);
    container.appendChild(roller);
  });
  let rafId; const start = performance.now(); let lastSwitch=0;
  const baseInterval = 70; // départ rapide
  const step = now => {
    const elapsed = now - start;
    const prog = Math.min(1, elapsed / revealMs);
    const curInterval = baseInterval * (1 + 10 * prog*prog); // accélère le ralentissement
    if(now - lastSwitch >= curInterval){ updateRouletteSlots(); lastSwitch = now; }
    if(elapsed < revealMs) rafId = requestAnimationFrame(step);
  };
  updateRouletteSlots();
  rafId = requestAnimationFrame(step);
  return { cancel: () => cancelAnimationFrame(rafId) };
}

function updateRouletteSlots(){
  ROLES.forEach(r => {
    const line = document.querySelector(`.role-name[data-role="${r.key}"] .role-roller-line`);
    if(!line) return;
    const prev = line.querySelector('.role-slot.prev');
    const cur = line.querySelector('.role-slot.current');
    const next = line.querySelector('.role-slot.next');
    if(prev && cur && next){
      prev.textContent = cur.textContent;
      cur.textContent = next.textContent;
      next.textContent = randomRollingSequence();
    }
  });
}

function stopRolling(handler){
  handler?.cancel?.();
  ROLES.forEach(r => {
    const el = document.querySelector(`.role-name[data-role="${r.key}"]`);
    if(el) el.classList.remove('rolling');
  });
}

function randomRollingSequence(){ return MEMBERS[Math.floor(Math.random()*MEMBERS.length)]; }

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
  drawing = true; drawBtn.disabled = true; announce('Tirage en cours...');
  const handler = rollingEffect();
  setTimeout(() => {
    requestAnimationFrame(() => {
      try {
        const assignment = assignRoles();
        state.lastAssignment = assignment;
        stopRolling(handler);
        animateNames(assignment);
        announce('Attribution réussie !', 'success');
      } catch(e){
        console.error(e);
        stopRolling(handler);
        announce(e.message, 'error');
      } finally {
        drawing = false; drawBtn.disabled = false;
      }
    });
  }, revealMs);
});

// Raccourci clavier
window.addEventListener('keydown', e => { if(e.key.toLowerCase()==='t') drawBtn.click(); });

// Initialisation
renderRoleCards();
renderExclusions();
announce('Prêt pour un tirage.');
