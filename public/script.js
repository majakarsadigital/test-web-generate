const categories = ['Legendary', 'Langka', 'Common'];
const maxSpins = 3;
let winners = [];
const playerData = JSON.parse(
  localStorage.getItem('player_data')
);
winnersHistory = [{
  name: playerData.username,
  legendary: playerData.legendary,
  langka: playerData.langka,
  common: playerData.common
}];
spin = playerData.spin || 0;
let isRolling = false;
let removeWinner = true;
let soundOn = false;
let bigAnim = false;
let round = 1;

function renderList(){
  const list = document.getElementById('pesertaList');
  const icons = { 'Legendary': '⭐', 'Langka': '✨', 'Common': '🔷' };

  list.innerHTML = '<div class="category-section">' +
    categories.map(cat => {
      return `<div class="category-item">
        ${icons[cat]} <strong>${cat}</strong>
      </div>`;
    }).join('') +
    '</div>';
}

function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getEligible() {
  return categories;
}

function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

async function spinDraw() {

  if (isRolling) return;

  // ❌ GANTI LIMIT DARI WINNERS → SPIN
  if (spin <= 0) {
    showDialog(
      '⚠️',
      'Kesempatan Habis!',
      'Spin kamu sudah habis.'
    );
    return;
  }

  const eligible = getEligible();

  isRolling = true;

  const btn = document.getElementById('spinBtn');
  btn.disabled = true;
  btn.textContent = '🎲 Mengundi...';

  const slotName = document.getElementById('slotName');
  const slotSub = document.getElementById('slotSub');

  slotName.className = 'slot-name rolling';
  slotSub.textContent = '🎲 Sedang mengacak...';
  slotSub.className = 'slot-sub';

  const frames = 40 + Math.floor(Math.random() * 20);

  for (let i = 0; i < frames; i++) {
    slotName.textContent =
      eligible[Math.floor(Math.random() * eligible.length)];

    await sleep(45 + i * 2.2);
  }

  const winner =
    eligible[Math.floor(Math.random() * eligible.length)];

  winners.push({
    name: winner,
    rank: winners.length + 1
  });

  round++;

  // 🔥 IMPORTANT: kurangi spin
  spin--;

  // update UI kalau ada
  document.getElementById('statSisa').textContent = spin;

  slotName.className = 'slot-name';
  slotName.textContent = winner;

  slotSub.textContent =
    `🎉 Pemenang ke-${winners.length}!`;

  slotSub.className = 'slot-sub winner-text';

  renderWinners();
  updateStats();

  spawnConfetti();

  await sleep(350);

  showWinOverlay(winner, winners.length, winner);

  btn.disabled = false;
  btn.textContent = '🎰 PUTAR UNDIAN!';
  isRolling = false;
}

function updateStats(){
  document.getElementById('statPeserta').textContent = categories.length;
  document.getElementById('statPemenang').textContent = winners.length;
  document.getElementById('statSisa').textContent = Math.max(0, maxSpins - winners.length);
  document.getElementById('statRound').textContent = round;
}


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

function renderWinnersHistory() {

  const grid =
    document.getElementById(
      'winnersHistoryGrid'
    );

  const player =
    JSON.parse(
      localStorage.getItem(
        'player_data'
      )
    );

  if (!player) {

    grid.innerHTML =
      '<div class="winners-empty">Belum ada data pemain</div>';

    return;
  }

  const categories = [
    {
      medal: '🥇',
      name: 'Legendary',
      total: player.legendary
    },
    {
      medal: '🥈',
      name: 'Langka',
      total: player.langka
    },
    {
      medal: '🥉',
      name: 'Common',
      total: player.common
    }
  ];

  grid.innerHTML =
    categories.map(c => `
      <div class="winner-badge">

        <span class="rank">
          ${c.medal}
        </span>

        <div>

          <div class="name">
            ${c.name}
          </div>

          <div class="stats">
            Total: ${c.total}
          </div>

        </div>

      </div>
    `).join('');
}

function toggleOption(opt){
  const map={remove:'toggleRemove',sound:'toggleSound',big:'toggleBig'};
  const el=document.getElementById(map[opt]);
  el.classList.toggle('active');
  if(opt==='remove'){ removeWinner=el.classList.contains('active'); updateStats(); }
  if(opt==='sound') soundOn=el.classList.contains('active');
  if(opt==='big') bigAnim=el.classList.contains('active');
}


function showWinOverlay(name, rank, category){
  const winName = document.getElementById('winName');
  const winCard = document.querySelector('#winOverlay .win-card');

  // Reset class
  winName.className = 'win-name';
  winCard.className = 'win-card';

  // Add category-specific class
  if(category === 'Legendary'){
    winName.classList.add('win-name-legendary');
    winCard.classList.add('win-card-legendary');
  } else if(category === 'Langka'){
    winName.classList.add('win-name-langka');
    winCard.classList.add('win-card-langka');
  } else if(category === 'Common'){
    winName.classList.add('win-name-common');
    winCard.classList.add('win-card-common');
  }

  document.getElementById('winName').textContent=name;
  document.getElementById('winRankText').textContent=`Pemenang ke-${rank} 🎊`;
  document.getElementById('winOverlay').classList.add('show');
}
function closeWin(){ document.getElementById('winOverlay').classList.remove('show'); }

function showDialog(icon, title, message){
  document.getElementById('infoIcon').textContent=icon;
  document.getElementById('infoTitle').textContent=title;
  document.getElementById('infoMessage').textContent=message;
  document.getElementById('infoDialog').classList.add('show');
}
function closeInfo(){ document.getElementById('infoDialog').classList.remove('show'); }

function showHintDialog(){
  document.getElementById('hintDialog').classList.add('show');
}
function closeHint(){ document.getElementById('hintDialog').classList.remove('show'); }

function updateHintDesc(desc){
  document.getElementById('hintDesc').textContent = desc;
}

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

document.addEventListener('DOMContentLoaded',()=>{
  renderList(); renderWinners(); updateStats();
});
