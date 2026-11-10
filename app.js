const MODAL = ['dürfen', 'können', 'mögen', 'müssen', 'sollen', 'wollen'];
const V = DATA.map((d, i) => ({
  id: i + 1,
  inf: d[0],
  pr: d[1],
  pt: d[2],
  a: d[3],
  pp: d[4],
  tr: { ru: d[5], uk: d[6] },
  ex: (d[7] || '').split('|')
}));

const AUX = { h: 'hat', s: 'ist', hs: 'hat / ist' };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

let fav = new Set(store.get('fav')), known = new Set(store.get('known'));
let lang = 'ru';

const S = {
  ru: {
    list: 'Список', train: 'Карточки', quiz: 'Практика',
    ph: 'Поиск: gehen, ging, gegangen, идти…', learned: 'выучено',
    more: 'Präsens и пример', none: 'Ничего не найдено 🤷',
    empty: 'В колоде пусто.<br>Выберите другой фильтр на вкладке «Список».',
    hint: 'Вспомните 3 формы и перевод · нажмите, чтобы проверить',
    again: 'Ещё раз', done: 'Готово!', cards: 'Карточек пройдено',
    redo: 'Повторить', know: 'Знаю', next: 'Дальше', res: 'Результат',
    pts: 'очков из',
    f: ['Все', '★ Избранное', 'Не выучено', 'haben', 'sein', 'haben / sein', 'Модальные']
  },
  uk: {
    list: 'Список', train: 'Картки', quiz: 'Практика',
    ph: 'Пошук: gehen, ging, gegangen, йти…', learned: 'вивчено',
    more: 'Präsens і приклад', none: 'Нічого не знайдено 🤷',
    empty: 'У колоді порожньо.<br>Оберіть інший фільтр на вкладці «Список».',
    hint: 'Пригадайте 3 форми та переклад · натисніть, щоб перевірити',
    again: 'Ще раз', done: 'Готово!', cards: 'Карток пройдено',
    redo: 'Повторити', know: 'Знаю', next: 'Далі', res: 'Результат',
    pts: 'балів з',
    f: ['Усі', '★ Обране', 'Не вивчено', 'haben', 'sein', 'haben / sein', 'Модальні']
  }
};

const T = () => S[lang];
const opened = new Set();
let tab = 'list', flt = 'all', query = '', deck = [], di = 0, flip = false;
const FK = ['all', 'fav', 'todo', 'h', 's', 'hs', 'mod'];
const $ = s => document.querySelector(s);
const norm = s => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');

function filtered() {
  const q = norm(query.trim());
  return V.filter(v => {
    if (flt === 'fav' && !fav.has(v.id)) return false;
    if (flt === 'todo' && known.has(v.id)) return false;
    if ((flt === 'h' || flt === 's' || flt === 'hs') && v.a !== flt) return false;
    if (flt === 'mod' && !MODAL.includes(v.inf)) return false;
    return !q || norm([v.inf, v.pr, v.pt, v.pp, v.tr[lang]].join(' ')).includes(q);
  });
}

function speak(t) {
  try {
    const u = new SpeechSynthesisUtterance(t.replace(/\//g, ', '));
    u.lang = 'de-DE';
    const vs = speechSynthesis.getVoices().filter(x => x.lang.startsWith('de'));
    u.voice = vs.find(x => /Google|Natural|Premium|Katja|Conrad|Marlene|Siri|Anna/.test(x.name)) || vs[0] || null;
    u.rate = .88;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}

const say = v => speak(`${v.inf}, ${v.pt}, ${v.pp}`);
function perf(v) { return AUX[v.a] + ' ' + v.pp; }

function renderChips() {
  $('#chips').innerHTML = FK.map((k, i) => `<button class="chip ${flt === k ? 'on' : ''}" data-f="${k}">${T().f[i]}</button>`).join('');
}

function renderList() {
  const L = filtered();
  $('#sub').textContent = `${known.size}/${V.length} ${T().learned}`;
  $('#app').innerHTML = L.length ? L.map(v => `
  <div class="v ${known.has(v.id) ? 'done' : ''}">
    <div class="top">
      <span class="n">${v.id}</span><span class="ttl">${v.tr[lang]}</span>
      <button class="ib" data-sp="${v.id}" aria-label="Произнести">🔊</button>
      <button class="ib s ${fav.has(v.id) ? 'on' : ''}" data-fav="${v.id}" aria-label="Избранное">${fav.has(v.id) ? '★' : '☆'}</button>
      <button class="ib k ${known.has(v.id) ? 'on' : ''}" data-kn="${v.id}" aria-label="Выучено">✔</button>
    </div>
    <div class="forms">
      <div class="f"><small>Infinitiv</small><b class="i">${v.inf}</b></div>
      <div class="f"><small>Präteritum</small><b>${v.pt}</b></div>
      <div class="f"><small>Perfekt</small><b><span class="aux">${AUX[v.a]}</span> ${v.pp}</b></div>
    </div>
    <details data-id="${v.id}" ${opened.has(v.id) ? 'open' : ''}><summary>${T().more}</summary>
      <div class="pr"><small>Präsens · er/sie/es</small><b>${v.pr}</b></div>
      ${v.ex.map(x => `<div class="ex">${x}</div>`).join('')}
    </details>
  </div>`).join('') : `<div class="empty">${T().none}</div>`;
}

function startDeck() {
  deck = filtered().map(v => v.id);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  di = 0; flip = false; renderTrain();
}

function renderTrain() {
  const el = $('#app');
  if (!deck.length) { el.innerHTML = `<div class="empty">${T().empty}</div>`; return; }
  if (di >= deck.length) {
    el.innerHTML = `<div class="deck"><div class="fc" style="cursor:default"><div class="big">🎉 ${T().done}</div><div class="hint">${T().cards}: ${deck.length}</div></div><div class="acts"><button class="btn go" id="again">${T().again}</button></div></div>`;
    return;
  }
  const v = V[deck[di] - 1];
  el.innerHTML = `<div class="deck">
    <div class="prog"><div style="width:${di / deck.length * 100}%"></div></div>
    <div class="cnt">${di + 1} / ${deck.length}</div>
    <div class="fc" id="fc">${flip ?
      `<div class="big">${v.inf}</div><div class="tr">${v.tr[lang]}</div>
       <div class="row"><small>Präteritum</small>${v.pt}</div>
       <div class="row"><small>Perfekt</small>${perf(v)}</div>` :
      `<div class="big">${v.inf}</div><div class="hint">${T().hint}</div>`}
    </div>
    ${flip ? `<div class="acts"><button class="btn no" data-a="0">${T().redo}</button><button class="btn yes" data-a="1">${T().know}</button></div>` : ''}
  </div>`;
}

let qd = [], qi = 0, qs = 0, qa = null;

function fakes(c, type, v) {
  const p = c.split('/')[0].trim(), F = new Set();
  if (type === 0) {
    if (p.endsWith('en')) { F.add(p.slice(0, -2) + 'et'); F.add(p.slice(0, -2) + 'st'); }
    else if (p.endsWith('n')) { F.add(p.slice(0, -1) + 't'); F.add(p.slice(0, -1) + 'st'); }
  } else if (type === 1) {
    const b = v.inf.replace('sich ', '').slice(0, -2);
    if (!p.endsWith('te')) { F.add(b + 'te'); F.add(b + 'ete'); }
    F.add(p + 'st');
    ['a', 'o', 'i', 'u', 'ie'].forEach(x => {
      const r = p.replace(/[aeiouäöü]+/, x);
      if (r !== p) F.add(r);
    });
  } else {
    const pp = v.pp.split('/')[0];
    [pp.endsWith('en') ? pp.slice(0, -2) + 't' : pp + 'en', pp.startsWith('ge') ? pp.slice(2) : 'ge' + pp].forEach(x => F.add(AUX[v.a] + ' ' + x));
    if (v.a === 'h') F.add('ist ' + pp);
    if (v.a === 's') F.add('hat ' + pp);
  }
  F.delete(c); F.delete(p);
  const a = [...F].filter(x => x && x !== c).sort(() => Math.random() - .5);
  while (a.length < 2) a.push(p + (a.length ? 'st' : 't'));
  return a.slice(0, 2);
}

function startQuiz() {
  qd = V.map((_, i) => i).sort(() => Math.random() - .5);
  qi = 0; qs = 0; renderQuiz();
}

function renderQuiz() {
  const el = $('#app');
  if (qi >= qd.length) {
    el.innerHTML = `<div class="deck"><div class="fc" style="cursor:default"><div class="big">🎉 ${T().done}</div><div class="row"><small>${T().res}</small>${qs} ${T().pts} ${qd.length * 2}</div></div><div class="acts"><button class="btn go" id="qagain">${T().again}</button></div></div>`;
    return;
  }
  const v = V[qd[qi]], h = Math.random() < .5 ? 1 : 2, forms = [v.inf, v.pt, perf(v)], lab = ['Infinitiv', 'Präteritum', 'Partizip II'];
  const c = forms[h], opts = [c, ...fakes(c, h, v)].sort(() => Math.random() - .5);
  qa = { v, h, c };
  el.innerHTML = `<div class="q">
    <div>
      <div class="score">${qs} ★</div>
      <div class="prog"><div style="width:${qi / qd.length * 100}%"></div></div>
      <div class="row">${forms.map((f, i) => `<div class="cell ${i === h ? 'miss' : ''}"><small>${lab[i]}</small><b>${i === h ? '?' : f}</b></div>`).join('')}</div>
      <div class="tr-badge">${v.tr[lang]}</div>
    </div>
    <div class="opts-container">
      ${opts.map(o => `<button class="opt" data-o="${o.replace(/"/g, '&quot;')}">${o}</button>`).join('')}
    </div>
    <div id="qn"></div>
  </div>`;
}

function answer(b) {
  const { v, c } = qa, isCorrect = b.dataset.o === c;
  document.querySelectorAll('.opt').forEach(x => x.disabled = true);

  const targetCell = document.querySelector('.cell.miss');
  if (isCorrect) {
    qs += 2;
    b.classList.add('ok');
    if (targetCell) {
      targetCell.classList.add('filled');
      const bEl = targetCell.querySelector('b');
      if (bEl) bEl.textContent = c;
    }
  } else {
    b.classList.add('bad');
    document.querySelectorAll('.opt').forEach(x => { if (x.dataset.o === c) x.classList.add('ok'); });
  }
  say(v);
  $('#qn').innerHTML = `<button class="btn go" id="qnext" style="width:100%">${T().next}</button>`;
}

  const targetCell = document.querySelector('.cell.miss');
  if (isCorrect) {
    qs += 2;
    b.classList.add('ok');
    if (targetCell) {
      targetCell.classList.add('filled');
      const bEl = targetCell.querySelector('b');
      if (bEl) bEl.textContent = c;
    }
  } else {
    b.classList.add('bad');
    document.querySelectorAll('.opt').forEach(x => { if (x.dataset.o === c) x.classList.add('ok'); });
  }
  say(v);
  $('#qn').innerHTML = `<button class="btn go" id="qnext" style="width:100%;margin-top:6px">${T().next}</button>`;
}

function applyLang() {
  document.querySelectorAll('#lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  document.querySelectorAll('[data-s]').forEach(e => e.textContent = T()[e.dataset.s]);
  $('#q').placeholder = T().ph;
  document.documentElement.lang = lang;
  renderChips();
}

function setTab(t) {
  tab = t;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  $('#q').style.display = t === 'list' ? '' : 'none';
  $('#chips').style.display = t === 'quiz' ? 'none' : '';
  $('#sub').style.display = t === 'list' ? '' : 'none';
  $('#app').classList.toggle('c', t !== 'list');
  $('#app').scrollTop = 0;
  t === 'list' ? renderList() : t === 'train' ? startDeck() : startQuiz();
}

document.addEventListener('click', e => {
  const t = e.target.closest('button,#fc'); if (!t) return;
  if (t.dataset.t) return setTab(t.dataset.t);
  if (t.dataset.l) { lang = t.dataset.l; $('#ls').style.display = 'none'; applyLang(); return setTab('list'); }
  if (t.dataset.o !== undefined) return answer(t);
  if (t.id === 'qnext') { qi++; return renderQuiz(); }
  if (t.id === 'qagain') return startQuiz();
  if (t.dataset.f) { flt = t.dataset.f; renderChips(); return tab === 'list' ? renderList() : startDeck(); }
  if (t.dataset.sp) return say(V[t.dataset.sp - 1]);
  if (t.dataset.fav) { const id = +t.dataset.fav; fav.has(id) ? fav.delete(id) : fav.add(id); store.set('fav', [...fav]); return renderList(); }
  if (t.dataset.kn) { const id = +t.dataset.kn; known.has(id) ? known.delete(id) : known.add(id); store.set('known', [...known]); return renderList(); }
  if (t.id === 'fc') { flip = !flip; if (flip) say(V[deck[di] - 1]); return renderTrain(); }
  if (t.id === 'again') return startDeck();
  if (t.dataset.a !== undefined) {
    const id = deck[di];
    if (t.dataset.a === '1') known.add(id); else known.delete(id);
    store.set('known', [...known]); di++; flip = false; renderTrain();
  }
});

document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.tagName === 'DETAILS' && d.dataset.id) {
    const i = +d.dataset.id;
    d.open ? opened.add(i) : opened.delete(i);
  }
}, true);

$('#q').addEventListener('input', e => { query = e.target.value; renderList(); });

applyLang();
setTab('list');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/German_irregular_verbs/sw.js', { scope: '/German_irregular_verbs/' })
      .then(reg => console.log('SW зарегистрирован:', reg.scope))
      .catch(err => console.error('Ошибка SW:', err));
  });
}
