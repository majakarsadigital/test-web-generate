let peserta = [];
let winners = [];
let isRolling = false;
let removeWinner = true;
let soundOn = false;
let bigAnim = false;
let round = 1;

const presets = ['Tim A','Tim B','Tim C','Grup 1','Grup 2','Peserta X'];

function initChips(){
  const row = document.getElementById('quickChips');
  presets.forEach(name => {
    const c = document.createElement('div');
    c.className = 'quick-chip';
    c.textContent = '+ ' + name;
    c.onclick = () => { document.getElementById('nameInput').value = name; addPeserta(); };
    row.appendChild(c);
  });
}

function addPeserta(){
  const input = document.getElementById('nameInput');
  const name = input.value.trim();
  if(!name){ showToast('⚠️ Nama tidak boleh kosong!'); return; }
  if(peserta.includes(name)){ showToast('⚠️ Nama sudah ada!'); return; }
  peserta.push(name);
  input.value='';
  renderList(); updateStats();
  showToast('✅ ' + name + ' masuk!');
}

function removePeserta(idx){
  const name = peserta[idx];
  peserta.splice(idx,1);
  renderList(); updateStats();
  showToast('🗑️ ' + name + ' dihapus');
}

function clearAll(){
  if(!peserta.length){ showToast('Tidak ada peserta'); return; }
  if(confirm('Hapus semua peserta?')){
    peserta=[];
    renderList(); updateStats();
    showToast('🗑️ Semua peserta dihapus');
  }
}

function renderList(){
  const list = document.getElementById('pesertaList');
  if(!peserta.length){
    list.innerHTML=`<div class="empty-state"><span class="big">🎪</span>Belum ada peserta!<br>Yuk tambahkan nama dulu~</div>`;
    return;
  }
  list.innerHTML = peserta.map((name,i) => {
    const won = winners.some(w=>w.name===name);
    return `<div class="peserta-item ${won?'winner-was':''}">
      <span class="peserta-num">${i+1}</span>
      <span class="peserta-name">${escapeHtml(name)} ${won?'🏆':''}</span>
      <button class="peserta-del" onclick="removePeserta(${i})">✕</button>
    </div>`;
  }).join('');
}

function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateStats(){
  const rem = removeWinner ? peserta.filter(n=>!winners.some(w=>w.name===n)) : peserta;
  document.getElementById('statPeserta').textContent = peserta.length;
  document.getElementById('statPemenang').textContent = winners.length;
  document.getElementById('statSisa').textContent = rem.length;
  document.getElementById('statRound').textContent = round;
}

function getEligible(){
  return removeWinner ? peserta.filter(n=>!winners.some(w=>w.name===n)) : [...peserta];
}

async function spinDraw(){
  if(isRolling) return;
  const eligible = getEligible();
  if(!eligible.length){ showToast('⚠️ Tidak ada peserta tersisa!'); return; }

  isRolling=true;
  const btn=document.getElementById('spinBtn');
  btn.disabled=true; btn.textContent='🎲 Mengundi...';

  const slotName=document.getElementById('slotName');
  const slotSub=document.getElementById('slotSub');
  slotName.className='slot-name rolling';
  slotSub.textContent='🎲 Sedang mengacak...';
  slotSub.className='slot-sub';

  const frames = 40 + Math.floor(Math.random()*20);
  for(let i=0;i<frames;i++){
    slotName.textContent = eligible[Math.floor(Math.random()*eligible.length)];
    await sleep(45 + i*2.2);
  }

  const winner = eligible[Math.floor(Math.random()*eligible.length)];
  winners.push({name:winner, rank:winners.length+1});
  round++;

  slotName.className='slot-name';
  slotName.textContent=winner;
  slotSub.textContent='🎉 Pemenang ke-'+winners.length+'!';
  slotSub.className='slot-sub winner-text';

  renderList(); renderWinners(); updateStats();
  spawnConfetti();
  await sleep(350);

  if(document.getElementById('toggleBig').classList.contains('active')){
    showWinOverlay(winner,winners.length);
  }

  btn.disabled=false; btn.textContent='🎰 PUTAR UNDIAN!';
  isRolling=false;
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function renderWinners(){
  const grid=document.getElementById('winnersGrid');
  if(!winners.length){
    grid.innerHTML='<div class="winners-empty">Belum ada pemenang — yuk putar undian!</div>';
    return;
  }
  const medals=['🥇','🥈','🥉'];
  grid.innerHTML=winners.map((w,i)=>`
    <div class="winner-badge">
      <span class="rank">${medals[i]||'#'+(i+1)}</span>
      <span class="name">${escapeHtml(w.name)}</span>
    </div>`).join('');
}

function resetWinners(){
  if(!winners.length){ showToast('Belum ada pemenang'); return; }
  winners=[]; round=1;
  document.getElementById('slotName').textContent='???';
  document.getElementById('slotName').className='slot-name';
  document.getElementById('slotSub').textContent='Siap diputar!';
  document.getElementById('slotSub').className='slot-sub';
  renderList(); renderWinners(); updateStats();
  showToast('🔄 Pemenang direset!');
}

function toggleOption(opt){
  const map={remove:'toggleRemove',sound:'toggleSound',big:'toggleBig'};
  const el=document.getElementById(map[opt]);
  el.classList.toggle('active');
  if(opt==='remove'){ removeWinner=el.classList.contains('active'); updateStats(); }
  if(opt==='sound') soundOn=el.classList.contains('active');
  if(opt==='big') bigAnim=el.classList.contains('active');
}

function showWinOverlay(name,rank){
  document.getElementById('winName').textContent=name;
  document.getElementById('winRankText').textContent='Pemenang ke-'+rank+' 🎊';
  document.getElementById('winOverlay').classList.add('show');
}
function closeWin(){ document.getElementById('winOverlay').classList.remove('show'); }

function spawnConfetti(){
  const c=document.getElementById('confetti');
  const colors=['#FFE534','#FF3F8E','#2B6EFF','#00C853','#FF6B1A','#7C3AED','#5CE1E6','#FF2D2D'];
  const shapes=['border-radius:50%','border-radius:2px','border-radius:0;transform:rotate(45deg)'];
  for(let i=0;i<90;i++){
    const el=document.createElement('div');
    el.className='confetti-piece';
    const size=7+Math.random()*10;
    el.style.cssText=`
      left:${Math.random()*100}%;
      width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border:2px solid #111;
      ${shapes[Math.floor(Math.random()*shapes.length)]};
      animation-duration:${1.4+Math.random()*2}s;
      animation-delay:${Math.random()*0.5}s;
    `;
    c.appendChild(el);
    setTimeout(()=>el.remove(),3600);
  }
}

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('nameInput').addEventListener('keydown',e=>{ if(e.key==='Enter') addPeserta(); });
  initChips(); updateStats();
  const demos=['Budi Santoso','Siti Rahayu','Andi Wijaya','Dewi Kusuma','Reza Pratama'];
  demos.forEach(n=>peserta.push(n));
  renderList(); updateStats();
});

input.addEventListener('keydown', e => {
    if (e.key === 'Enter') verifyToken();
});