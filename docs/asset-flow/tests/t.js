const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('../out/asset-flow.html', 'utf8');
const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window, d = w.document; w.matchMedia = () => ({ matches: false });
const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
setTimeout(() => {
  const deck = d.getElementById('deck'); const txt = () => deck.querySelector('.top').textContent + ' | ' + deck.querySelector('.q').textContent;
  console.log('errors', errs); console.log('allcards', d.querySelectorAll('#allcards figure').length);
  console.log(txt());
  const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  // pick single family -> auto advance
  click(deck.querySelector('[data-pick]')); setTimeout(() => { console.log('after pick:', txt());
    click(deck.querySelectorAll('[data-pick]')[0]); setTimeout(() => { console.log('after status:', txt());
      for (let i = 0; i < 2; i++) click(deck.querySelector('.ft [data-nav="1"]')); console.log('typed cards:', txt());
      const inp = deck.querySelector('input'); inp.value = '300000'; inp.dispatchEvent(new w.Event('input', { bubbles: true })); console.log('live:', deck.querySelector('.live').textContent);
      click(deck.querySelector('.ft [data-nav="1"]')); console.log(txt()); click(deck.querySelectorAll('[data-pick]')[5]); setTimeout(() => { console.log('after Cash:', txt());
        let n = 0; while (!deck.querySelector('.save') && n++ < 40) { const nx = deck.querySelector('.nx') || deck.querySelector('[data-skip]'); if (nx) click(nx); else { click(deck.querySelector('[data-pick]')); } }
        setTimeout(() => { console.log('end:', txt()); console.log(deck.querySelector('.rvs') && deck.querySelector('.rvs').textContent); click(d.querySelector('[data-info="cap"]')); console.log('pop', d.getElementById('pop').hidden, d.querySelector('#pop h4').textContent); console.log('errors', errs); }, 2000);
      }, 400); }, 400); }, 400);
}, 300);
