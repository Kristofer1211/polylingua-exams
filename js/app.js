const languageSelect = document.getElementById('languageSelect');
const levelSelect = document.getElementById('levelSelect');
const quizSelect = document.getElementById('quizSelect');
const startBtn = document.getElementById('startBtn');
const startArea = document.getElementById('startArea');
const quizArea = document.getElementById('quizArea');
const resultsArea = document.getElementById('resultsArea');
const questionContainer = document.getElementById('questionContainer');
const currentIndexEl = document.getElementById('currentIndex');
const totalQuestionsEl = document.getElementById('totalQuestions');
const scoreMini = document.getElementById('scoreMini');
const accuracyMini = document.getElementById('accuracyMini');
const timeMini = document.getElementById('timeMini');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const nicknameInput = document.getElementById('nickname');
const resultsSummary = document.getElementById('resultsSummary');
const retryBtn = document.getElementById('retryBtn');
const newBtn = document.getElementById('newBtn');
const shareBtn = document.getElementById('shareBtn');
const leaderboardList = document.getElementById('leaderboardList');

let languageData = null;
let exam = null;
let answers = [];
let currentIndex = 0;
let totalQuestions = 0;
let score = 0;
let timerInterval = null;
let secondsElapsed = 0;
let lastPublishedId = null;

async function ensureFirebaseReady(){
  if (window.firebaseReady){
    try {
      await window.firebaseReady;
    } catch (err) {
      console.warn('Firebase init promise rejected', err);
    }
  }
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function resetQuiz() {
  // If no exam is loaded, just go back to the start screen
  if (!exam) {
    quizArea.classList.add("hidden");
    resultsArea.classList.add("hidden");
    startArea.classList.remove("hidden");
    return;
  }
  currentIndex = 0;
  score = 0;
  answers = new Array(totalQuestions).fill(null);
  secondsElapsed = 0;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  currentIndexEl.textContent = "1";
  totalQuestionsEl.textContent = totalQuestions;
  scoreMini.textContent = "Score: 0";
  accuracyMini.textContent = "Accuracy: 0%";
  timeMini.textContent = "Time: 00:00";

  //progressBar.style.width = "0%";

  startArea.classList.add("hidden");
  resultsArea.classList.add("hidden");
  quizArea.classList.remove("hidden");

  renderQuestion(true);
  updateDotIndicators(currentIndex);
  startTimer();
}
function playSound(type = 'click') {
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  if (type === 'click') {
    o.type = 'sine';
    o.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  } else if (type === 'correct') {
    o.type = 'triangle';
    o.frequency.setValueAtTime(660, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  } else if (type === 'error') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  } else if (type === 'submit') {
    o.type = 'sine';
    o.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  }
  o.start(now);
  o.stop(now + 0.5);
}

function loadLanguage(lang){
  const path = `data/${lang}.json`;
  return fetch(path).then(res=>{
    if(!res.ok) throw new Error('Language file not found: ' + path);
    return res.json();
  });
}

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
function formatTime(s){ const mm = String(Math.floor(s/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0'); return `${mm}:${ss}`; }

//const progressBar = document.createElement('div');
//progressBar.style.height = '8px';
//progressBar.style.background = 'linear-gradient(90deg,var(--accent),var(--accent-2))';
//progressBar.style.borderRadius = '8px';
//progressBar.style.width = '0%';
//progressBar.style.transition = 'width 300ms ease';
//progressBar.style.marginTop = '12px';
//const header = document.querySelector('.quizHeader');
//if(header) header.appendChild(progressBar);

questionContainer.style.transition = 'opacity 220ms ease';

startBtn.addEventListener('click', async ()=>{
  try{
    startBtn.disabled = true;
    const langKey = languageSelect.value;
    const level = parseInt(levelSelect.value,10);
    const quizIndex = parseInt(quizSelect.value,10);

    languageData = await loadLanguage(langKey);
    const levelObj = languageData.levels.find(l => l.level === level);
    if(!levelObj) throw new Error('Level not found in data');

    exam = levelObj.quizzes[quizIndex];
    if(!exam) throw new Error('Quiz not found');

    exam.questions = shuffle([...exam.questions]);
    totalQuestions = exam.questions.length;
    answers = new Array(totalQuestions).fill(null);
    currentIndex = 0;
    score = 0;
    secondsElapsed = 0;
    lastPublishedId = null;

    document.getElementById('totalQuestions').textContent = totalQuestions;
    renderQuestion(true);
    startArea.classList.add('hidden');
    resultsArea.classList.add('hidden');
    quizArea.classList.remove('hidden');
    createDotIndicators(totalQuestions);
    updateDotIndicators(0);
    startTimer();
    playSound('click');
  }catch(err){
    alert('Error starting exam: ' + err.message);
  } finally {
    startBtn.disabled = false;
  }
});

function startTimer(){ clearInterval(timerInterval); timerInterval = setInterval(()=>{ secondsElapsed++; timeMini.textContent = 'Time: ' + formatTime(secondsElapsed); },1000); }
function stopTimer(){ clearInterval(timerInterval); }
function createDotIndicators(total) {
  const container = document.getElementById("dotProgress");
  container.innerHTML = "";

  for (let i = 0; i < total; i++) {
    const dot = document.createElement("div");
    dot.classList.add("dot");
    container.appendChild(dot);
  }
}
function updateDotIndicators(currentIndex) {
  const dots = document.querySelectorAll(".dot");

  dots.forEach((dot, i) => {
    dot.classList.remove("active", "completed");

    if (i < currentIndex) {
      dot.classList.add("completed");
    } else if (i === currentIndex) {
      dot.classList.add("active");
    }
  });
}

function updateHeader(){
  currentIndexEl.textContent = currentIndex + 1;
  totalQuestionsEl.textContent = totalQuestions;
  scoreMini.textContent = `Score: ${score}`;
  updateDotIndicators(currentIndex);
  const acc = totalQuestions ? Math.round((score/totalQuestions)*100) : 0;
  accuracyMini.textContent = `Accuracy: ${acc}%`;
  const filled = Math.round(((answers.filter(a=>a && String(a).trim()!=='').length) / totalQuestions) * 100);
  //progressBar.style.width = `${filled}%`;
}

function isCurrentAnswered(){
  const q = exam.questions[currentIndex];
  const selector = `[name="answer-${currentIndex}"]`;
  if(q.type === 'mc'){
    return !!document.querySelector(`${selector}:checked`);
  } else {
    const input = document.querySelector(selector);
    return input && input.value.trim() !== '';
  }
}

function areAllAnswered(){
  return answers.every(a => a && String(a).trim() !== '');
}

function applyTransitionAndRender(renderFn){
  questionContainer.style.opacity = '0';
  setTimeout(()=>{ renderFn(); questionContainer.style.opacity = '1'; }, 180);
}

function renderQuestion(initial=false){
  applyTransitionAndRender(()=> {
    const q = exam.questions[currentIndex];
    questionContainer.innerHTML = '';
    const block = document.createElement('div');
    block.className = 'questionBlock';
    const qText = document.createElement('div');
    qText.className = 'questionText';
    qText.innerHTML = `<strong>${currentIndex+1}. </strong>${q.q}`;
    block.appendChild(qText);

    if(q.type === 'mc'){
      const opts = shuffle([...q.options]);
      const optDiv = document.createElement('div');
      optDiv.className = 'options';
      opts.forEach(opt=>{
        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.margin = '8px 0';
        label.style.padding = '8px';
        label.style.borderRadius = '8px';
        label.style.background = 'rgba(255,255,255,0.02)';
        label.style.cursor = 'pointer';
        const safeVal = opt.replace(/"/g,'&quot;');
        label.innerHTML = `<input type="radio" name="answer-${currentIndex}" value="${safeVal}" ${answers[currentIndex]===opt?'checked':''}> ${opt}`;
        optDiv.appendChild(label);
      });
      block.appendChild(optDiv);
    } else {
      const input = document.createElement('input');
      input.className = 'inputText';
      input.type = 'text';
      input.name = `answer-${currentIndex}`;
      input.value = answers[currentIndex] || '';
      input.placeholder = 'Type your answer here';
      input.style.transition = 'box-shadow 160ms ease, border-color 160ms ease';
      block.appendChild(input);
    }

    questionContainer.appendChild(block);
    updateHeader();
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = !isCurrentAnswered() || currentIndex >= totalQuestions - 1;
    submitBtn.disabled = !areAllAnswered();
    attachInteractionHandlers();
    highlightSelectedVisuals();
    if(!initial) window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function attachInteractionHandlers(){
  const q = exam.questions[currentIndex];
  const selector = `input[name="answer-${currentIndex}"]`;
  if(q.type === 'mc'){
    const radios = Array.from(document.querySelectorAll(selector));
    radios.forEach(r => {
      r.addEventListener('change', () => {
        saveCurrentAnswer();
        playSound('click');
        highlightSelectedVisuals();
        nextBtn.disabled = !isCurrentAnswered() || currentIndex >= totalQuestions - 1;
        submitBtn.disabled = !areAllAnswered();
      });
    });
  } else {
    const input = document.querySelector(selector);
    if(input){
      input.addEventListener('input', () => {
        saveCurrentAnswer();
        highlightSelectedVisuals();
        nextBtn.disabled = !isCurrentAnswered() || currentIndex >= totalQuestions - 1;
        submitBtn.disabled = !areAllAnswered();
      });
      input.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          saveCurrentAnswer();
          if(currentIndex < totalQuestions - 1) {
            nextBtn.click();
          } else if(areAllAnswered()){
            submitBtn.focus();
          }
        }
      });
    }
  }
}

function highlightSelectedVisuals(){
  const labels = Array.from(questionContainer.querySelectorAll('.options label'));
  labels.forEach(label=>{
    const input = label.querySelector('input[type="radio"]');
    if(input && input.checked){
      label.style.background = 'linear-gradient(90deg, rgba(79,195,247,0.12), rgba(124,77,255,0.08))';
      label.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.02)';
    } else {
      label.style.background = 'rgba(255,255,255,0.02)';
      label.style.boxShadow = 'none';
    }
  });
  const textInput = questionContainer.querySelector('input.inputText');
  if(textInput){
    if(textInput.value && textInput.value.trim() !== ''){
      textInput.style.boxShadow = '0 6px 18px rgba(79,195,247,0.06)';
      textInput.style.borderColor = 'rgba(79,195,247,0.4)';
    } else {
      textInput.style.boxShadow = 'none';
      textInput.style.borderColor = 'rgba(255,255,255,0.04)';
    }
  }
}

nextBtn.addEventListener('click', ()=>{
  saveCurrentAnswer();
  if(currentIndex < totalQuestions - 1){
    currentIndex++;
    renderQuestion();
    playSound('click');
  }
});

prevBtn.addEventListener('click', ()=>{
  saveCurrentAnswer();
  if(currentIndex > 0){
    currentIndex--;
    renderQuestion();
    playSound('click');
  }
});

function saveCurrentAnswer(){
  const q = exam.questions[currentIndex];
  const selector = `[name="answer-${currentIndex}"]`;
  if(q.type === 'mc'){
    const checked = document.querySelector(`${selector}:checked`);
    answers[currentIndex] = checked ? checked.value : null;
  } else {
    const input = document.querySelector(selector);
    answers[currentIndex] = input ? input.value.trim() : null;
  }
}

document.addEventListener('keydown', (e)=>{
  if(quizArea.classList.contains('hidden')) return;
  if(e.key === 'ArrowRight'){
    if(!nextBtn.disabled) nextBtn.click();
  } else if(e.key === 'ArrowLeft'){
    if(!prevBtn.disabled) prevBtn.click();
  }
});

submitBtn.addEventListener('click', ()=>{
  saveCurrentAnswer();
  if(!areAllAnswered()){
    playSound('error');
    alert('Please answer all questions before submitting.');
    return;
  }
  playSound('submit');
  evaluate();
});

function normalize(s){
  if(!s) return '';
  return s.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function calculateTimeBonus(){
  const base = totalQuestions * 30;
  const diff = Math.max(0, base - secondsElapsed);
  return Math.floor(diff / 30);
}

function calculateScoreCategory(percent, bonus){
  const totalPercent = Math.min(100, percent + Math.round((bonus / Math.max(1,totalQuestions)) * 10));
  if(totalPercent >= 90) return 'Excellent';
  if(totalPercent >= 75) return 'Good';
  if(totalPercent >= 50) return 'Fair';
  return 'Needs Practice';
}

function triggerConfetti(){
  const count = 80;
  const colors = ['#4fc3f7','#7c4dff','#ffd166','#2ecc71'];
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.pointerEvents = 'none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const pieces = [];
  for(let i=0;i<count;i++){
    pieces.push({
      x: Math.random()*canvas.width,
      y: -20 - Math.random()*canvas.height*0.2,
      vx: (Math.random()-0.5)*6,
      vy: Math.random()*6+2,
      r: Math.random()*6+4,
      color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*360,
      vr: (Math.random()-0.5)*10
    });
  }
  let t = 0;
  function frame(){
    t++;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r*0.6);
      ctx.restore();
    });
    if(t < 180) requestAnimationFrame(frame);
    else canvas.remove();
  }
  frame();
}

function evaluate(){
  stopTimer();
  score = 0;
  const details = [];
  exam.questions.forEach((q,i)=>{
    const user = normalize(answers[i] || '');
    const correct = normalize(q.answer);
    const isCorrect = user && user === correct;
    if(isCorrect) score++;
    details.push({ index: i+1, question: q.q, user: answers[i] || '', correct: q.answer, isCorrect });
  });
  const percent = Math.round((score/totalQuestions)*100);
  const timeBonus = calculateTimeBonus();
  const finalScore = score + timeBonus;
  const category = calculateScoreCategory(percent, timeBonus);

  let detailHtml = details.map(d=>{
    const mark = d.isCorrect ? `<span style="color:var(--success)">✔</span>` : `<span style="color:var(--danger)">✖</span>`;
    return `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)">
      <div style="display:flex;justify-content:space-between"><div><strong>${d.index}.</strong> ${escapeHtml(d.question)}</div><div>${mark}</div></div>
      <div style="color:var(--muted);font-size:13px;margin-top:6px">Your answer: <strong>${escapeHtml(d.user)}</strong> • Correct: <strong>${escapeHtml(d.correct)}</strong></div>
    </div>`;
  }).join('');

  resultsSummary.innerHTML = `
    <div class="cardInner">
      <p><strong>Nickname:</strong> ${escapeHtml(nicknameInput.value || 'Anonymous')}</p>
      <p><strong>Language:</strong> ${escapeHtml(languageData.language)}</p>
      <p><strong>Level:</strong> ${escapeHtml(String(exam.level))} • <strong>Quiz:</strong> ${escapeHtml(exam.title)}</p>
      <p><strong>Raw Score:</strong> ${score} / ${totalQuestions}</p>
      <p><strong>Time Bonus:</strong> ${timeBonus}</p>
      <p><strong>Final Score:</strong> ${finalScore}</p>
      <p><strong>Accuracy:</strong> ${percent}%</p>
      <p><strong>Time:</strong> ${formatTime(secondsElapsed)}</p>
      <p><strong>Category:</strong> ${category}</p>
    </div>
    <div class="cardInner" style="margin-top:12px">
      <h3>Details</h3>
      ${detailHtml}
    </div>
  `;

  quizArea.classList.add('hidden');
  resultsArea.classList.remove('hidden');
  updateHeader();
  if(percent === 100) {
    triggerConfetti();
    playSound('correct');
  }
  loadLeaderboard();
}

retryBtn.addEventListener('click', ()=>{
  answers = new Array(totalQuestions).fill(null);
  currentIndex = 0;
  score = 0;
  secondsElapsed = 0;
  quizArea.classList.remove('hidden');
  resultsArea.classList.add('hidden');
  renderQuestion(true);
  startTimer();
});

newBtn.addEventListener('click', ()=>{
  quizArea.classList.add('hidden');
  resultsArea.classList.add('hidden');
  startArea.classList.remove('hidden');
  stopTimer();
});

shareBtn.addEventListener('click', async ()=>{
  const nick = (nicknameInput.value || 'Anonymous').trim().slice(0,20);
  if(!nick){
    alert('Please enter a nickname to publish your score.');
    return;
  }
  try{
    shareBtn.disabled = true;
    const entry = {
      nickname: nick,
      score,
      total: totalQuestions,
      accuracy: Math.round((score/totalQuestions)*100),
      time: secondsElapsed,
      language: languageData.language,
      level: exam.level,
      quiz: exam.title,
      timestamp: Date.now()
    };
    const docRef = await publishScore(entry);
    lastPublishedId = docRef.id;
    alert('Score published to leaderboard.');
    loadLeaderboard();
  }catch(err){
    alert('Error publishing score: ' + err.message);
  }finally{
    shareBtn.disabled = false;
  }
});

async function publishScore(entry){
  await ensureFirebaseReady();
  if(!window.db) throw new Error('Firebase not initialized');
  const col = window.db.collection('leaderboard');
  const docRef = await col.add(entry);
  return docRef;
}
function normalizeLanguage(lang) {
  return lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
}

async function loadLeaderboard() {
  await ensureFirebaseReady();

  if (!window.db) {
    leaderboardList.innerHTML = '<div class="muted">Leaderboard unavailable (Firebase not initialized).</div>';
    return;
  }

 const lang = languageData?.language || normalizeLanguage(languageSelect.value);
 const lvl = exam?.level || parseInt(levelSelect.value, 10);

  const col = window.db.collection('leaderboard');
  const snapshot = await col
    .where('language', '==', lang)
    .where('level', '==', lvl)
    .orderBy('accuracy', 'desc')
    .orderBy('time', 'asc')
    .limit(100)
    .get();


  const rows = [];
  snapshot.forEach(doc=>{
    const d = doc.data();
    d._id = doc.id;
    rows.push(d);
  });

  if(rows.length === 0){
    leaderboardList.innerHTML = '<div class="muted">No scores yet for this language and level. Be the first!</div>';
    return;
  }

  let rankIndex = -1;
  if(lastPublishedId){
    rankIndex = rows.findIndex(r => r._id === lastPublishedId);
    if(rankIndex === -1){
      const extraSnapshot = await col
        .where('language','==', languageData.language)
        .where('level','==', exam.level)
        .orderBy('accuracy','desc')
        .orderBy('time','asc')
        .limit(500)
        .get();
      const all = [];
      extraSnapshot.forEach(doc=> all.push({ ...doc.data(), _id: doc.id }));
      rankIndex = all.findIndex(r => r._id === lastPublishedId);
      if(rankIndex !== -1) rows.unshift(all[rankIndex]);
    }
  }

  leaderboardList.innerHTML = rows.map((r,i)=>`
    <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid rgba(255,255,255,0.03);background:${r._id===lastPublishedId?'linear-gradient(90deg, rgba(79,195,247,0.04), rgba(124,77,255,0.02))':'transparent'}">
      <div><strong>${i+1}. ${escapeHtml(r.nickname)}</strong> <span style="color:var(--muted);font-size:12px">(${escapeHtml(r.language)} L${escapeHtml(String(r.level))})</span></div>
      <div style="text-align:right">
        <div>${r.score}/${r.total} • ${r.accuracy}%</div>
        <div style="color:var(--muted);font-size:12px">${formatTime(r.time || 0)}</div>
      </div>
    </div>
  `).join('');

  if(rankIndex !== -1){
    const rankDisplay = document.createElement('div');
    rankDisplay.style.marginTop = '8px';
    rankDisplay.style.padding = '8px';
    rankDisplay.style.background = 'rgba(255,255,255,0.02)';
    rankDisplay.style.borderRadius = '8px';
    rankDisplay.innerHTML = `<strong>Your rank:</strong> ${rankIndex + 1} / (top ${rows.length})`;
    leaderboardList.prepend(rankDisplay);
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(m){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
  });
}

loadLeaderboard();

