/* ═══════════════════════════════════════════════
   SMART PRODUCTIVITY TODO TRACKER — script.js

   HOW IT WORKS:
   • tasks[]          — all task instances stored in localStorage
   • dailyTemplates[] — recurring tasks saved once, spawned each day
   • viewingDate      — the date currently shown in the task list
                        (default = today, use arrows to browse any day)

   RECURRING LOGIC:
   • When you add a task with "Daily Repeat" checked → saved as a template
   • Every time the app loads, it checks if today's copies exist;
     if not, it spawns them into tasks[] for today automatically
   • They appear in the normal pending/completed list — no separate panel

   CALENDAR / DATE LOGIC:
   • Pick any date in the date picker → task is saved for that date
   • Use the ◀ ▶ arrows to browse past & future days' task lists
   • Stats (progress bar, dashboard) always reflect the viewed date
═══════════════════════════════════════════════ */

// ─── STATE ───────────────────────────────────
let tasks          = [];      // { id, name, category, priority, completed, createdAt, completedAt, dateKey, isDaily, templateId }
let dailyTemplates = [];      // { id, name, category, priority }
let viewingDate    = todayKey(); // YYYY-MM-DD string
let editingId      = null;
let currentFilter  = 'all';
let searchQuery    = '';

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MOTIVATIONS = [
  [100, "LEGENDARY! You completed everything! 🎉🎊"],
  [90,  "So close to perfection! Finish strong 🏆"],
  [75,  "Fantastic work! You're almost done! ⚡"],
  [60,  "More than halfway there! Crushing it 🔥"],
  [40,  "You're building great habits! 📈"],
  [20,  "Great start! Keep the momentum going 🚀"],
  [1,   "Keep going — every task counts! 💪"],
  [0,   "Start your day strong — add your first task! 💪"],
];

// ─── DOM REFS ────────────────────────────────
const taskInput        = document.getElementById('taskInput');
const categorySelect   = document.getElementById('categorySelect');
const prioritySelect   = document.getElementById('prioritySelect');
const taskDateInput    = document.getElementById('taskDate');
const isDailyChk       = document.getElementById('isDaily');
const addTaskBtn       = document.getElementById('addTaskBtn');

const pendingList      = document.getElementById('pendingList');
const completedList    = document.getElementById('completedList');
const emptyPending     = document.getElementById('emptyPending');
const emptyCompleted   = document.getElementById('emptyCompleted');
const pendingBadge     = document.getElementById('pendingBadge');
const completedBadge   = document.getElementById('completedBadge');

const totalCount       = document.getElementById('totalCount');
const completedCount   = document.getElementById('completedCount');
const remainingCount   = document.getElementById('remainingCount');
const percentDisplay   = document.getElementById('percentDisplay');
const progressFill     = document.getElementById('progressFill');
const progressGlow     = document.getElementById('progressGlow');
const progressPct      = document.getElementById('progressPct');
const progressMessage  = document.getElementById('progressMessage');
const searchInput      = document.getElementById('searchInput');

const themeToggle      = document.getElementById('themeToggle');
const themeIcon        = document.getElementById('themeIcon');

const dateNavLabel     = document.getElementById('dateNavLabel');
const dateNavSub       = document.getElementById('dateNavSub');
const prevDayBtn       = document.getElementById('prevDayBtn');
const nextDayBtn       = document.getElementById('nextDayBtn');
const jumpToday        = document.getElementById('jumpToday');

const filterTabs       = document.querySelectorAll('.filter-tab');
const liveDateDisplay  = document.getElementById('liveDateDisplay');
const liveTimeDisplay  = document.getElementById('liveTimeDisplay');
const toastContainer   = document.getElementById('toastContainer');

// Dashboard
const todayCircle      = document.getElementById('todayCircle');
const todayPctEl       = document.getElementById('todayPct');
const todayDoneEl      = document.getElementById('todayDone');
const todayLeftEl      = document.getElementById('todayLeft');
const weekBarChart     = document.getElementById('weekBarChart');
const weeklyDoneEl     = document.getElementById('weeklyDone');
const weeklyPctEl      = document.getElementById('weeklyPct');
const monthTotalEl     = document.getElementById('monthTotal');
const monthDoneEl      = document.getElementById('monthDone');
const monthPctEl       = document.getElementById('monthPct');
const monthFill        = document.getElementById('monthFill');
const scoreRing        = document.getElementById('scoreRing');
const scoreVal         = document.getElementById('scoreVal');
const motivationalMsg  = document.getElementById('motivationalMsg');

// Edit modal
const editModal            = document.getElementById('editModal');
const editTaskInput        = document.getElementById('editTaskInput');
const editCategorySelect   = document.getElementById('editCategorySelect');
const editPrioritySelect   = document.getElementById('editPrioritySelect');
const editTaskDateInput    = document.getElementById('editTaskDate');
const closeModalBtn        = document.getElementById('closeModal');
const cancelEditBtn        = document.getElementById('cancelEdit');
const saveEditBtn          = document.getElementById('saveEdit');

// ─── INIT ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  loadTheme();
  initBgCanvas();
  injectSvgGradient();
  startClock();
  spawnDailyTasks();       // auto-add recurring tasks for today if not done yet
  renderDateNav();
  renderAll();
  renderDashboard();
});

// ─── STORAGE ─────────────────────────────────
function loadStorage() {
  try { tasks          = JSON.parse(localStorage.getItem('spt_tasks') || '[]'); } catch { tasks = []; }
  try { dailyTemplates = JSON.parse(localStorage.getItem('spt_daily') || '[]'); } catch { dailyTemplates = []; }
}
function save() {
  localStorage.setItem('spt_tasks', JSON.stringify(tasks));
  localStorage.setItem('spt_daily', JSON.stringify(dailyTemplates));
}

// ─── DATE HELPERS ────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}
function keyToDate(key) {
  // Parse YYYY-MM-DD safely (avoid timezone shift)
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function dateToKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function shiftDate(key, days) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + days);
  return dateToKey(d);
}
function friendlyDate(key) {
  const today = todayKey();
  const tomorrow = shiftDate(today, 1);
  const yesterday = shiftDate(today, -1);
  if (key === today)     return 'Today';
  if (key === tomorrow)  return 'Tomorrow';
  if (key === yesterday) return 'Yesterday';
  const d = keyToDate(key);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// ─── SPAWN RECURRING TASKS ───────────────────
// Runs on every page load. For each daily template, if today doesn't
// already have a copy, create one and add it to tasks[].
function spawnDailyTasks() {
  const today = todayKey();
  const lastSpawn = localStorage.getItem('spt_spawn_date');
  if (lastSpawn === today) return; // already spawned today

  dailyTemplates.forEach(tmpl => {
    const exists = tasks.some(t => t.templateId === tmpl.id && t.dateKey === today);
    if (!exists) {
      tasks.push(makeTaskFromTemplate(tmpl, today));
    }
  });

  localStorage.setItem('spt_spawn_date', today);
  save();
}

function makeTaskFromTemplate(tmpl, dateKey) {
  return {
    id: uid(),
    name: tmpl.name,
    category: tmpl.category,
    priority: tmpl.priority,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    dateKey,
    isDaily: true,
    templateId: tmpl.id,
  };
}

// ─── ADD TASK ────────────────────────────────
function addTask() {
  const name = taskInput.value.trim();
  if (!name) { toast('Please enter a task!', 'error'); return; }

  const today     = todayKey();
  const pickedDate = taskDateInput.value || today; // use picked date or today
  const isDaily   = isDailyChk.checked;

  if (isDaily) {
    // Save as a recurring template
    const tmpl = { id: uid(), name, category: categorySelect.value, priority: prioritySelect.value };
    dailyTemplates.push(tmpl);

    // Immediately spawn today's instance
    const todayExists = tasks.some(t => t.templateId === tmpl.id && t.dateKey === today);
    if (!todayExists) tasks.unshift(makeTaskFromTemplate(tmpl, today));

    save();
    // Reset form
    taskInput.value = '';
    taskDateInput.value = '';
    isDailyChk.checked = false;

    // If we're viewing today, refresh list; else switch to today
    if (viewingDate !== today) { viewingDate = today; renderDateNav(); }
    renderAll();
    renderDashboard();
    toast('Daily recurring task added! ♻️', 'success');
    return;
  }

  // Regular task for the picked date
  const task = {
    id: uid(),
    name,
    category: categorySelect.value,
    priority: prioritySelect.value,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    dateKey: pickedDate,
    isDaily: false,
    templateId: null,
  };
  tasks.unshift(task);
  save();

  // Switch view to the task's date
  viewingDate = pickedDate;
  renderDateNav();
  renderAll();
  renderDashboard();

  taskInput.value = '';
  taskDateInput.value = '';

  if (pickedDate !== today) {
    toast(`Task added for ${friendlyDate(pickedDate)} 📅`, 'info');
  } else {
    toast('Task added! ✅', 'success');
  }
}

// ─── TOGGLE COMPLETE ─────────────────────────
function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.completed   = !t.completed;
  t.completedAt = t.completed ? new Date().toISOString() : null;
  save();
  renderAll();
  renderDashboard();
  if (t.completed) { toast('Task completed! 🎉', 'success'); checkAllDone(); }
}

// ─── DELETE ──────────────────────────────────
function deleteTask(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.classList.add('removing');
    setTimeout(() => {
      // If it's a daily task, also remove its template so it won't respawn
      const t = tasks.find(t => t.id === id);
      if (t && t.isDaily && t.templateId) {
        const isOnlyInstance = tasks.filter(x => x.templateId === t.templateId).length <= 1;
        if (isOnlyInstance) {
          // Ask before removing template? Just remove silently — user can re-add
          dailyTemplates = dailyTemplates.filter(d => d.id !== t.templateId);
          toast('Daily recurring task removed ♻️', 'info');
        }
      }
      tasks = tasks.filter(t => t.id !== id);
      save();
      renderAll();
      renderDashboard();
    }, 300);
  }
}

// ─── RESET TODO LIST ─────────────────────────
function resetTodoList() {
  const confirmReset = confirm(
    "Are you sure you want to delete ALL tasks and recurring tasks?"
  );

  if (!confirmReset) return;

  tasks = [];
  dailyTemplates = [];

  localStorage.removeItem('spt_tasks');
  localStorage.removeItem('spt_daily');
  localStorage.removeItem('spt_spawn_date');

  viewingDate = todayKey();

  renderDateNav();
  renderAll();
  renderDashboard();

  toast('Todo list restarted successfully! 🔄', 'success');
}



// ─── EDIT ────────────────────────────────────
function openEdit(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;
  editTaskInput.value = t.name;
  editCategorySelect.value = t.category;
  editPrioritySelect.value = t.priority;
  editTaskDateInput.value  = t.dateKey;
  editModal.classList.add('open');
  editTaskInput.focus();
}

function saveEdit() {
  const name = editTaskInput.value.trim();
  if (!name) { toast('Task name cannot be empty!', 'error'); return; }
  const t = tasks.find(t => t.id === editingId);
  if (t) {
    t.name     = name;
    t.category = editCategorySelect.value;
    t.priority = editPrioritySelect.value;
    const newDate = editTaskDateInput.value;
    if (newDate) {
      t.dateKey = newDate;
      // If viewing a different date after change, switch view
      viewingDate = newDate;
      renderDateNav();
    }
    // Sync template name too if it's a daily task
    if (t.isDaily && t.templateId) {
      const tmpl = dailyTemplates.find(d => d.id === t.templateId);
      if (tmpl) { tmpl.name = name; tmpl.category = t.category; tmpl.priority = t.priority; }
    }
  }
  save();
  renderAll();
  renderDashboard();
  closeEdit();
  toast('Task updated! ✏️', 'info');
}

function closeEdit() {
  editModal.classList.remove('open');
  editingId = null;
}

// ─── DATE NAVIGATOR ──────────────────────────
function renderDateNav() {
  const today = todayKey();
  dateNavLabel.textContent = friendlyDate(viewingDate);
  const d = keyToDate(viewingDate);
  dateNavSub.textContent = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  // Dim "go to today" when already on today
  jumpToday.style.opacity = viewingDate === today ? '0.4' : '1';
  jumpToday.style.pointerEvents = viewingDate === today ? 'none' : 'auto';
}

prevDayBtn.addEventListener('click', () => {
  viewingDate = shiftDate(viewingDate, -1);
  renderDateNav();
  renderAll();
  renderDashboard();
});
nextDayBtn.addEventListener('click', () => {
  viewingDate = shiftDate(viewingDate, 1);
  renderDateNav();
  renderAll();
  renderDashboard();
});
jumpToday.addEventListener('click', () => {
  viewingDate = todayKey();
  renderDateNav();
  renderAll();
  renderDashboard();
});

// ─── RENDER TASK LISTS ───────────────────────
function getVisibleTasks() {
  let list = tasks.filter(t => t.dateKey === viewingDate);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(q));
  }
  if (currentFilter === 'pending')   list = list.filter(t => !t.completed);
  if (currentFilter === 'completed') list = list.filter(t =>  t.completed);
  return list;
}

function renderAll() {
  const visible   = getVisibleTasks();
  const pending   = visible.filter(t => !t.completed);
  const completed = visible.filter(t =>  t.completed);

  renderList(pendingList,   pending);
  renderList(completedList, completed);

  emptyPending.style.display   = pending.length   === 0 ? 'block' : 'none';
  emptyCompleted.style.display = completed.length === 0 ? 'none'  : 'none';

  // Counts for the viewed date (all tasks, ignoring filter/search)
  const allOnDate   = tasks.filter(t => t.dateKey === viewingDate);
  const doneOnDate  = allOnDate.filter(t => t.completed).length;
  const totalOnDate = allOnDate.length;
  const pendingOnDate = totalOnDate - doneOnDate;
  const pct = totalOnDate === 0 ? 0 : Math.round((doneOnDate / totalOnDate) * 100);

  pendingBadge.textContent   = allOnDate.filter(t => !t.completed).length;
  completedBadge.textContent = doneOnDate;
  totalCount.textContent     = totalOnDate;
  completedCount.textContent = doneOnDate;
  remainingCount.textContent = pendingOnDate;
  percentDisplay.textContent = pct + '%';

  // Progress bar
  progressFill.style.width = pct + '%';
  progressPct.textContent  = pct + '%';
  const glowLeft = Math.max(0, pct - 2);
  progressGlow.style.left  = `calc(${glowLeft}% - 8px)`;

  // Progress message
  let msg;
  if (totalOnDate === 0)  msg = "No tasks for this day — add one above! ✨";
  else if (pct === 100)   msg = "🎊 Perfect! ALL tasks for this day are done!";
  else if (pct >= 75)     msg = `${pct}% done — almost there! 🚀`;
  else if (pct >= 50)     msg = `${pct}% done — great momentum! ⚡`;
  else if (pct > 0)       msg = `${pct}% done — keep going! 💪`;
  else                    msg = "Let's get started — check off your first task! ✅";
  progressMessage.textContent = msg;
}

function renderList(listEl, arr) {
  listEl.innerHTML = '';
  arr.forEach(t => listEl.appendChild(buildTaskEl(t)));
}

function buildTaskEl(t) {
  const li = document.createElement('li');
  li.className = ['task-item', t.completed ? 'completed' : '', t.isDaily ? 'is-daily' : ''].filter(Boolean).join(' ');
  li.setAttribute('data-id', t.id);

  const d = new Date(t.createdAt);
  const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  const dailyTag = t.isDaily ? `<span class="daily-tag"><i class="fa-solid fa-rotate"></i> Daily</span>` : '';

  li.innerHTML = `
    <div class="task-checkbox">
      <input type="checkbox" id="chk-${t.id}" ${t.completed ? 'checked' : ''} />
      <label for="chk-${t.id}"></label>
    </div>
    <div class="task-body">
      <div class="task-name">${esc(t.name)}</div>
      <div class="task-meta">
        <span class="task-date"><i class="fa-regular fa-clock"></i> ${dateStr}</span>
        <span class="task-tag">${catLabel(t.category)}</span>
        <span class="priority-tag priority-${t.priority}">${priLabel(t.priority)}</span>
        ${dailyTag}
      </div>
    </div>
    <div class="task-actions">
      <button class="task-btn edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="task-btn del-btn"  title="Delete"><i class="fa-solid fa-trash"></i></button>
    </div>`;

  li.querySelector(`#chk-${t.id}`).addEventListener('change', () => toggleTask(t.id));
  li.querySelector('.edit-btn').addEventListener('click',  () => openEdit(t.id));
  li.querySelector('.del-btn').addEventListener('click',   () => deleteTask(t.id));
  return li;
}

// ─── DASHBOARD ───────────────────────────────
function renderDashboard() {
  const today = todayKey();

  // Today card (always shows today, not the viewed date)
  const todayTasks = tasks.filter(t => t.dateKey === today);
  const tDone  = todayTasks.filter(t => t.completed).length;
  const tTotal = todayTasks.length;
  const tPct   = tTotal === 0 ? 0 : Math.round((tDone / tTotal) * 100);
  todayCircle.setAttribute('stroke-dasharray', `${tPct},100`);
  todayPctEl.textContent  = tPct + '%';
  todayDoneEl.textContent = tDone;
  todayLeftEl.textContent = tTotal - tDone;

  // Weekly bars (last 7 days)
  buildWeekBars();

  // Monthly
  const ym = today.slice(0, 7);
  const mTasks = tasks.filter(t => t.dateKey.startsWith(ym));
  const mDone  = mTasks.filter(t => t.completed).length;
  const mTotal = mTasks.length;
  const mPct   = mTotal === 0 ? 0 : Math.round((mDone / mTotal) * 100);
  monthTotalEl.textContent = mTotal;
  monthDoneEl.textContent  = mDone;
  monthPctEl.textContent   = mPct + '%';
  monthFill.style.width    = mPct + '%';

  // Score = weighted combo of overall + today
  const allDone  = tasks.filter(t => t.completed).length;
  const allTotal = tasks.length;
  const overallPct = allTotal === 0 ? 0 : Math.round((allDone / allTotal) * 100);
  const score = allTotal === 0 ? 0 : Math.min(100, Math.round(overallPct * 0.65 + tPct * 0.35));
  scoreRing.style.setProperty('--score', score);
  scoreVal.textContent = score;

  // Motivational message based on today's %
  const found = MOTIVATIONS.find(([threshold]) => tPct >= threshold);
  motivationalMsg.textContent = found ? found[1] : MOTIVATIONS[MOTIVATIONS.length - 1][1];
}

function buildWeekBars() {
  weekBarChart.innerHTML = '';
  const today = todayKey();
  for (let i = 6; i >= 0; i--) {
    const key   = shiftDate(today, -i);
    const dayTs = tasks.filter(t => t.dateKey === key);
    const done  = dayTs.filter(t => t.completed).length;
    const total = dayTs.length;
    const pct   = total === 0 ? 0 : Math.round((done / total) * 100);
    const d     = keyToDate(key);

    const col = document.createElement('div');
    col.className = 'week-bar-col';
    col.title = `${MONTHS[d.getMonth()]} ${d.getDate()}: ${done}/${total} done`;
    col.innerHTML = `
      <div class="week-bar-track">
        <div class="week-bar-fill${i === 0 ? ' today-bar' : ''}" style="height:${pct}%"></div>
      </div>
      <span class="week-day-label">${DAYS[d.getDay()]}</span>`;
    weekBarChart.appendChild(col);
  }

  // Weekly totals
  let wDone = 0, wTotal = 0;
  for (let i = 6; i >= 0; i--) {
    const key = shiftDate(today, -i);
    const dayTs = tasks.filter(t => t.dateKey === key);
    wDone  += dayTs.filter(t => t.completed).length;
    wTotal += dayTs.length;
  }
  weeklyDoneEl.textContent = wDone;
  weeklyPctEl.textContent  = wTotal === 0 ? '0%' : Math.round((wDone / wTotal) * 100) + '%';
}

// ─── CONFETTI ────────────────────────────────
function checkAllDone() {
  const todayTasks = tasks.filter(t => t.dateKey === todayKey());
  if (todayTasks.length > 0 && todayTasks.every(t => t.completed)) launchConfetti();
}
function launchConfetti() {
  const colors = ['#7c5cfc','#00e5ff','#00ffab','#ff4f9a','#ffb347'];
  const end = Date.now() + 4000;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60,  spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

// ─── TOAST ───────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]}"></i> ${msg}`;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('hiding');
    el.addEventListener('animationend', () => el.remove());
  }, 2800);
}

// ─── THEME ───────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem('spt_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  themeIcon.className = saved === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('spt_theme', next);
  themeIcon.className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
});

// ─── CLOCK ───────────────────────────────────
function startClock() {
  const tick = () => {
    const now = new Date();
    liveDateDisplay.textContent = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    liveTimeDisplay.textContent = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  };
  tick(); setInterval(tick, 1000);
}

// ─── SVG GRADIENT ────────────────────────────
function injectSvgGradient() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden');
  svg.innerHTML = `<defs><linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#7c5cfc"/><stop offset="100%" stop-color="#00e5ff"/>
  </linearGradient></defs>`;
  document.body.prepend(svg);
}

// ─── BG CANVAS ───────────────────────────────
function initBgCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  resize(); window.addEventListener('resize', resize);

  const colors = ['#7c5cfc','#00e5ff','#00ffab','#ff4f9a'];
  const pts = Array.from({ length: 50 }, () => ({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
    r: Math.random() * 1.6 + 0.4,
    dx: (Math.random() - 0.5) * 0.32, dy: (Math.random() - 0.5) * 0.32,
    a: Math.random() * 0.5 + 0.2
  }));

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    pts.forEach((p, i) => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(124,92,252,${0.05 * (1 - dist / 120)})`; ctx.stroke();
        }
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = p.a; ctx.fill(); ctx.globalAlpha = 1;
    });
    requestAnimationFrame(draw);
  };
  draw();
}

// ─── HELPERS ─────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function catLabel(c) { return {general:'🗂 General',work:'💼 Work',personal:'🌱 Personal',health:'🏃 Health',learning:'📚 Learning'}[c]||c; }
function priLabel(p) { return {high:'🔴 High',medium:'🟡 Medium',low:'🟢 Low'}[p]||p; }

// ─── EVENT LISTENERS ─────────────────────────
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderAll();
  });
});

searchInput.addEventListener('input', () => { searchQuery = searchInput.value.trim(); renderAll(); });

closeModalBtn.addEventListener('click',  closeEdit);
cancelEditBtn.addEventListener('click',  closeEdit);
saveEditBtn.addEventListener('click',    saveEdit);
editTaskInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveEdit(); });
editModal.addEventListener('click', e => { if (e.target === editModal) closeEdit(); });