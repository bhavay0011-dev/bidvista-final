/* =====================================================================
   Bidvista — motion + interactions (shared by every page)
   Requires: three r128, gsap 3.12 + ScrollTrigger, lenis (all optional;
   the page stays usable if any fail to load)
   ===================================================================== */
(function () {
'use strict';

const touch = matchMedia('(hover: none)').matches;
const small = innerWidth < 760;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  mouse.nx = e.clientX / innerWidth * 2 - 1; mouse.ny = -(e.clientY / innerHeight * 2 - 1);
});

/* =====================================================================
   TRACKING — GA4 + Meta Pixel contact clicks (fixed: one delegated
   listener instead of the broken inline onclick handlers)
   ===================================================================== */
function track(method) {
  try { if (typeof gtag === 'function') gtag('event', 'contact_click', { method: method }); } catch (e) {}
  try { if (typeof fbq === 'function') fbq('track', 'Contact', { content_name: method }); } catch (e) {}
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  const h = a.getAttribute('href') || '';
  if (h.startsWith('mailto:')) track('email');
  else if (h.includes('wa.me/')) track('whatsapp');
  else if (h.includes('fiverr.com')) track('fiverr');
}, true);

/* =====================================================================
   WEBGL ORB
   ===================================================================== */
const blob = { x: .9, y: 0, s: 1, c: 0 }, blobT = { x: .9, y: 0, s: 1, c: 0 };
let scrollVel = 0;
window.__blobPulse = 0;
const palettes = [
  [[.04, .04, .045], [.32, .1, .03], [1, .42, .16]],
  [[.045, .04, .04], [.16, .14, .12], [.94, .84, .66]],
  [[.05, .035, .03], [.45, .14, .04], [1, .72, .5]]
];
(function initGL() {
  if (typeof THREE === 'undefined' || reduce) return;
  const canvas = $('#gl'); if (!canvas) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, .1, 100); cam.position.z = 6;
  const noise = `vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
  const uni = {
    uTime: { value: 0 }, uAmp: { value: .16 }, uFreq: { value: .75 }, uMouse: { value: new THREE.Vector2() },
    uA: { value: new THREE.Vector3(...palettes[0][0]) }, uB: { value: new THREE.Vector3(...palettes[0][1]) },
    uC: { value: new THREE.Vector3(...palettes[0][2]) }, uAlpha: { value: 1 }
  };
  const vs = noise + `uniform float uTime,uAmp,uFreq;uniform vec2 uMouse;varying float vD;varying vec3 vN;varying vec3 vV;
void main(){vec3 p=position;float n=snoise(normal*uFreq+vec3(uTime*.18,uTime*.12,0.)+vec3(uMouse*.5,0.));
float n2=snoise(normal*uFreq*1.8-uTime*.15)*.22;float d=(n+n2)*uAmp;p+=normal*d;vD=d;
vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
  const fs = `uniform vec3 uA,uB,uC;uniform float uAlpha;varying float vD;varying vec3 vN;varying vec3 vV;
void main(){vec3 n=normalize(vN);float f=pow(1.-max(dot(n,normalize(vV)),0.),2.6);vec3 col=mix(uA,uB,smoothstep(-.25,.3,vD));
col+=uC*f*1.15;col+=uC*pow(max(dot(n,normalize(vec3(-.4,.7,.6))),0.),24.)*.55;col+=uB*pow(max(dot(n,normalize(vec3(.6,-.5,.4))),0.),6.)*.35;gl_FragColor=vec4(col,uAlpha);}`;
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, small ? 32 : 64), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: vs, fragmentShader: fs }));
  const group = new THREE.Group(); group.add(mesh); scene.add(group);
  const N = small ? 700 : 1800, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 2.5 + Math.random() * 6, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t); pos[i * 3 + 2] = r * Math.cos(p) - 2;
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .016, color: 0xefebe4, transparent: true, opacity: .35, depthWrite: false }));
  scene.add(pts);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, .006, 8, 200), new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: .35 }));
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, .004, 8, 200), new THREE.MeshBasicMaterial({ color: 0xefebe4, transparent: true, opacity: .14 }));
  ring.rotation.x = 1.2; ring2.rotation.x = 1.6; ring2.rotation.y = .4; group.add(ring); group.add(ring2);
  function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  const clock = new THREE.Clock(); const sm = { x: 0, y: 0 };
  let visible = true; document.addEventListener('visibilitychange', () => visible = !document.hidden);
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime();
    uni.uTime.value = t;
    sm.x += (mouse.nx - sm.x) * .05; sm.y += (mouse.ny - sm.y) * .05;
    uni.uMouse.value.set(sm.x, sm.y);
    for (const k of ['x', 'y', 's', 'c']) blob[k] += (blobT[k] - blob[k]) * .045;
    const v = clamp(Math.abs(scrollVel) / 2500, 0, 1);
    window.__blobPulse *= .92;
    uni.uAmp.value = .14 + v * .22 + window.__blobPulse * .45 + Math.sin(t * .6) * .025;
    uni.uFreq.value = .75 + v * .35;
    const ci = Math.floor(blob.c) % 3, cn = (ci + 1) % 3, f = blob.c - Math.floor(blob.c);
    ['uA', 'uB', 'uC'].forEach((u, j) => {
      const a = palettes[ci][j], b = palettes[cn][j];
      uni[u].value.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    });
    group.position.set(blob.x * (small ? .35 : 1) * 1.6, blob.y, 0);
    group.scale.setScalar(blob.s * (small ? .75 : 1));
    group.rotation.y = t * .15 + sm.x * .5; group.rotation.x = sm.y * .4 + t * .05;
    ring.rotation.z = t * .4; ring2.rotation.z = -t * .3;
    pts.rotation.y = t * .03 + sm.x * .15; pts.rotation.x = sm.y * .1;
    pts.position.y = (window.scrollY || 0) * .0006;
    cam.position.x += (sm.x * .4 - cam.position.x) * .05; cam.position.y += (sm.y * .3 - cam.position.y) * .05; cam.lookAt(0, 0, 0);
    renderer.render(scene, cam);
  })();
})();

/* =====================================================================
   HELPERS
   ===================================================================== */
function splitChars(el) {
  const out = [];
  const walk = node => {
    [...node.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          const wd = document.createElement('span'); wd.className = 'wd';
          [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; wd.appendChild(s); out.push(s); });
          frag.appendChild(wd);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') {
        if (c.classList.contains('grad')) {
          c.classList.remove('grad');
          const before = out.length; walk(c); out.slice(before).forEach(s => s.classList.add('grad'));
        } else walk(c);
      }
    });
  };
  walk(el); return out;
}
const SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%₹×#';
function scramble(el, final, dur = 600) {
  if (!el) return;
  final = final ?? el.dataset.final ?? el.textContent; el.dataset.final = final;
  const start = performance.now();
  (function f(n) {
    const p = Math.min((n - start) / dur, 1); let s = '';
    for (let i = 0; i < final.length; i++) s += (i < p * final.length || final[i] === ' ') ? final[i] : SCR[Math.floor(Math.random() * SCR.length)];
    el.textContent = s; if (p < 1) requestAnimationFrame(f);
  })(start);
}
function countTo(el, dur = 1.6) {
  const to = parseFloat(el.dataset.to), dec = +el.dataset.dec || 0, pre = el.dataset.pre || '', suf = el.dataset.suf || '', loc = el.dataset.fmt === 'in';
  const o = { v: 0 };
  const fmt = v => pre + (loc ? Math.round(v).toLocaleString('en-IN') : v.toFixed(dec)) + suf;
  if (typeof gsap === 'undefined') { el.textContent = fmt(to); return; }
  gsap.to(o, { v: to, duration: dur, ease: 'expo.out', onUpdate: () => el.textContent = fmt(o.v) });
}

/* =====================================================================
   FALLBACK: no GSAP → show everything, keep page usable
   ===================================================================== */
if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
  document.documentElement.classList.add('no-motion');
  const l = $('#loader'); l && l.remove();
  const c = $('#curtain'); c && c.remove();
  $$('.cnt').forEach(el => countTo(el));
  initForm(); initFaqBasic();
  return;
}
gsap.registerPlugin(ScrollTrigger);

/* smooth scroll */
let lenis = null;
if (typeof Lenis !== 'undefined' && !reduce) {
  lenis = new Lenis({ lerp: .085 });
  lenis.on('scroll', e => { ScrollTrigger.update(); scrollVel = e.velocity * 60; });
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollToEl = el => { if (!el) return; lenis ? lenis.scrollTo(el, { duration: 1.6, offset: -20 }) : el.scrollIntoView({ behavior: 'smooth' }); };

/* =====================================================================
   PAGE TRANSITIONS (curtain)
   ===================================================================== */
const curtain = $('#curtain');
if (curtain) curtain.style.animation = 'none';
function isInternal(a) {
  const h = a.getAttribute('href') || '';
  if (!h || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:') || a.target === '_blank' || a.hasAttribute('download')) return false;
  try { const u = new URL(a.href, location.href); return u.origin === location.origin && !(u.pathname === location.pathname && u.hash); } catch (e) { return false; }
}
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
  const h = a.getAttribute('href');
  // same-page anchors (also "/#x" style when already on that page)
  if (h.startsWith('#')) { const t = $(h); if (t) { e.preventDefault(); closeMenu(); setTimeout(() => scrollToEl(t), 300); } return; }
  if (!isInternal(a) || !curtain) return;
  e.preventDefault();
  const lbl = a.dataset.label || (a.textContent || '').trim().split('\n')[0].slice(0, 28) || 'Bidvista';
  $('span', curtain).textContent = lbl.replace(/[↗→←]/g, '').trim();
  gsap.set(curtain, { display: 'flex', clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.to(curtain, { clipPath: 'inset(0% 0% 0% 0%)', duration: .75, ease: 'expo.inOut', onComplete: () => { location.href = a.href; } });
});
addEventListener('pageshow', e => { if (e.persisted && curtain) gsap.set(curtain, { clipPath: 'inset(0% 0% 100% 0%)' }); });

/* =====================================================================
   CURSOR + CLICK BURSTS
   ===================================================================== */
const cur = $('#cur'), curLbl = cur && $('span', cur);
if (cur && !touch) {
  const qx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
  addEventListener('mousemove', e => { qx(e.clientX); qy(e.clientY); });
  let lx = 0, ly = 0;
  gsap.ticker.add(() => {
    const dx = mouse.x - lx, dy = mouse.y - ly; lx = mouse.x; ly = mouse.y;
    const sp = clamp(Math.hypot(dx, dy) / 30, 0, .6);
    if (!cur.dataset.big) gsap.set(cur, { scaleX: 1 + sp, scaleY: 1 - sp * .5, rotate: Math.atan2(dy, dx) * 180 / Math.PI });
  });
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('[data-cursor]');
    if (t) { cur.classList.add('lab'); cur.dataset.big = 1; curLbl.textContent = t.dataset.cursor; gsap.to(cur, { scale: 6, scaleX: 6, scaleY: 6, rotate: 0, duration: .4, ease: 'power3' }); }
    else if (e.target.closest('a,button,input,select,textarea,label')) { cur.classList.remove('lab'); cur.dataset.big = 1; gsap.to(cur, { scale: 3, scaleX: 3, scaleY: 3, rotate: 0, duration: .3 }); }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('[data-cursor],a,button,input,select,textarea,label') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-cursor],a,button'))) {
      cur.classList.remove('lab'); delete cur.dataset.big; gsap.to(cur, { scale: 1, scaleX: 1, scaleY: 1, duration: .4 });
    }
  });
}
addEventListener('pointerdown', e => {
  if (e.target.closest('input,select,textarea')) return;
  window.__blobPulse = .45;
  const cols = ['#ff5a1f', '#d9c7a3', '#ff9a6b', '#efebe4'];
  for (let i = 0; i < 12; i++) {
    const d = document.createElement('div'); d.className = 'burst';
    d.style.left = e.clientX - 4 + 'px'; d.style.top = e.clientY - 4 + 'px'; d.style.background = cols[i % cols.length];
    document.body.appendChild(d);
    const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 80;
    gsap.to(d, { x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 0, duration: .8 + Math.random() * .4, ease: 'expo.out', onComplete: () => d.remove() });
  }
});

/* =====================================================================
   MENU OVERLAY
   ===================================================================== */
const ov = $('#overlay'), mb = $('#menuBtn'), pv = ov && $('.pv', ov);
let menuOpen = false;
const ovLinks = ov ? $$('a.big', ov) : [];
function openMenu() {
  menuOpen = true; mb.classList.add('open'); lenis && lenis.stop();
  gsap.to(ov, { clipPath: 'circle(150% at calc(100% - 60px) 40px)', duration: 1, ease: 'expo.inOut' });
  gsap.fromTo(ovLinks, { yPercent: 120, rotate: 6 }, { yPercent: 0, rotate: 0, stagger: .07, duration: 1, delay: .35, ease: 'expo.out' });
  gsap.fromTo('.ov-foot', { opacity: 0, y: 20 }, { opacity: 1, y: 0, delay: .8 });
  scramble($('.scr', mb), 'Close');
}
function closeMenu() {
  if (!menuOpen) return; menuOpen = false; mb.classList.remove('open'); lenis && lenis.start();
  gsap.to(ov, { clipPath: 'circle(0% at calc(100% - 60px) 40px)', duration: .8, ease: 'expo.inOut' });
  scramble($('.scr', mb), 'Menu');
}
if (ov && mb) {
  mb.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  const pvx = gsap.quickTo(pv, 'x', { duration: .5, ease: 'power3' }), pvy = gsap.quickTo(pv, 'y', { duration: .5, ease: 'power3' });
  ov.addEventListener('mousemove', e => { pvx(e.clientX + 30); pvy(e.clientY - 60); });
  ovLinks.forEach(a => {
    a.addEventListener('mouseenter', () => {
      $('b', pv).textContent = a.dataset.stat; $('small', pv).textContent = a.dataset.sub;
      gsap.to(pv, { opacity: 1, scale: 1, rotate: gsap.utils.random(-8, 8), duration: .4, ease: 'back.out(2)' });
      scramble(a, a.dataset.final || a.textContent, 450);
      gsap.to(ovLinks.filter(x => x !== a), { opacity: .3, duration: .3 }); gsap.to(a, { x: 30, duration: .4 });
    });
    a.addEventListener('mouseleave', () => { gsap.to(pv, { opacity: 0, scale: .5, duration: .3 }); gsap.to(ovLinks, { opacity: 1, duration: .3 }); gsap.to(a, { x: 0, duration: .4 }); });
  });
}

/* =====================================================================
   MAGNETIC BUTTONS
   ===================================================================== */
if (!touch) $$('.mag').forEach(b => {
  const fill = $('.fill', b);
  b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .35, y: (e.clientY - r.top - r.height / 2) * .45, duration: .4, ease: 'power3' }); });
  if (fill) {
    b.addEventListener('mouseenter', e => { const r = b.getBoundingClientRect(); gsap.fromTo(fill, { yPercent: e.clientY < r.top + r.height / 2 ? -101 : 101 }, { yPercent: 0, duration: .45, ease: 'power3.out' }); });
    b.addEventListener('mouseleave', e => { const r = b.getBoundingClientRect(); gsap.to(fill, { yPercent: e.clientY < r.top + r.height / 2 ? -101 : 101, duration: .45, ease: 'power3.in' }); });
  }
  b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.35)' }));
});

/* =====================================================================
   INTRO: home loader (first visit per session) or curtain reveal
   ===================================================================== */
const heroTitle = $('#heroTitle');
const pTitle = $('.phero h1, .art-hero h1, .nf h1');
const heroChars = [];
if (heroTitle) $$('.row', heroTitle).forEach(r => heroChars.push(...splitChars(r)));
const pChars = pTitle ? splitChars(pTitle) : [];
const heroBits = $$('.h-in, .phero .crumb, .phero-foot > *, .art-hero .back, .art-meta, .art-hero .intro, .nf p, .nf .cta-row, .badge');
gsap.set(heroBits, { opacity: 0, y: 40 });
gsap.set('nav', { opacity: 0 });
gsap.set([...heroChars, ...pChars], { yPercent: 120, rotateX: -90, opacity: 0, transformOrigin: '50% 100%' });

function heroIn() {
  const tl = gsap.timeline();
  tl.to([...heroChars, ...pChars], { yPercent: 0, rotateX: 0, opacity: 1, stagger: { each: heroChars.length ? .025 : .02 }, duration: 1.2, ease: 'expo.out' })
    .to('nav', { opacity: 1, duration: .6 }, 0)
    .to(heroBits, { opacity: 1, y: 0, stagger: .1, duration: .9, ease: 'power3.out' }, .3)
    .add(() => { window.__blobPulse = .6; }, 0);
  return tl;
}
const loader = $('#loader');
let seen = false;
try { seen = sessionStorage.getItem('bv_seen') === '1'; sessionStorage.setItem('bv_seen', '1'); } catch (e) {}
const intro = gsap.timeline({ delay: .1 });
if (loader && !seen && !reduce) {
  if (curtain) gsap.set(curtain, { display: 'none' });
  const ldNum = $('#ldNum'), cnt = { v: 0 };
  intro.to(cnt, { v: 100, duration: 2, ease: 'power3.inOut', onUpdate: () => { ldNum.textContent = String(Math.round(cnt.v)).padStart(3, '0'); } })
    .to('#loader .ln', { scaleX: 1, duration: 2, ease: 'power3.inOut' }, 0)
    .add(() => scramble($('#ldLbl'), 'STOP BURNING BUDGET', 900), .4)
    .to('#loader .in', { scale: .9, opacity: 0, duration: .5, ease: 'power3.in' })
    .to('#loader .ln', { scaleY: 3, opacity: 0, duration: .3 }, '<')
    .to('#loader .sh.t', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=.1')
    .to('#loader .sh.b', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
    .from('#gl', { scale: 1.6, opacity: 0, duration: 1.8, ease: 'expo.out' }, '<')
    .set(loader, { display: 'none' })
    .add(heroIn(), '-=1');
} else {
  loader && loader.remove();
  if (curtain) intro.to(curtain, { clipPath: 'inset(0% 0% 100% 0%)', duration: .9, ease: 'expo.inOut' }).set(curtain, { display: 'none' });
  intro.add(heroIn(), curtain ? '-=.45' : 0);
}
intro.add(() => { lenis && lenis.start(); ScrollTrigger.refresh(); }, curtain || loader ? '-=1.2' : 0);

/* =====================================================================
   GLOBAL SCROLL EFFECTS
   ===================================================================== */
const prog = $('#prog'); if (prog) gsap.to(prog, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
$$('[data-blob]').forEach(sec => {
  const [x, y, s, c] = sec.dataset.blob.split(',').map(Number);
  ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%', onToggle: st => { if (st.isActive) { blobT.x = x; blobT.y = y; blobT.s = s; blobT.c = c; } } });
});
{ const first = $('[data-blob]'); if (first) { const [x, y, s, c] = first.dataset.blob.split(',').map(Number); Object.assign(blob, { x, y, s, c }); Object.assign(blobT, { x, y, s, c }); } }
const skewEls = $$('.svc-grid,.blog,.reasons,.chips,.plans,.related,.tool-grid');
const skewSet = skewEls.map(el => gsap.quickTo(el, 'skewY', { duration: .6, ease: 'power3' }));
gsap.ticker.add(() => { const sk = clamp(scrollVel / 400, -5, 5); skewSet.forEach(f => f(sk)); });

/* marquee */
function marquee(el, dir) {
  let x = 0; const half = () => el.scrollWidth / 2;
  gsap.ticker.add(() => {
    const boost = 1 + Math.abs(scrollVel) / 180; x += dir * -1.2 * boost * (scrollVel < 0 ? -1 : 1);
    const h = half(); if (x <= -h) x += h; if (x > 0) x -= h;
    gsap.set(el, { x, skewX: clamp(-scrollVel / 120, -18, 18) * dir });
  });
}
$$('.mq-row').forEach((r, i) => marquee(r, i % 2 ? -1 : 1));
if ($('#mq1')) gsap.fromTo('#mq1', { fontWeight: 300 }, { fontWeight: 650, ease: 'none', scrollTrigger: { trigger: '.mq', start: 'top bottom', end: 'bottom top', scrub: true } });

/* split titles */
$$('.split').forEach(h => {
  const cs = splitChars(h);
  gsap.from(cs, { yPercent: 110, rotateX: -100, opacity: 0, transformOrigin: '50% 100% -30px', stagger: .016, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 86%', toggleActions: 'play none none reverse' } });
  gsap.fromTo(h, { fontWeight: 300 }, { fontWeight: 600, ease: 'none', scrollTrigger: { trigger: h, start: 'top 90%', end: 'top 40%', scrub: true } });
});
$$('.fade').forEach(el => gsap.from(el, { y: 50, opacity: 0, filter: 'blur(10px)', duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
$$('.cnt').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => countTo(el) }));

/* =====================================================================
   HOME MODULES
   ===================================================================== */
if (heroChars.length && !touch) {
  const qs = heroChars.map(c => ({ y: gsap.quickTo(c, 'y', { duration: .5, ease: 'power3' }), s: gsap.quickTo(c, 'scale', { duration: .5, ease: 'power3' }), el: c }));
  let on = true; ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onToggle: s => on = s.isActive });
  addEventListener('mousemove', e => {
    if (!on || intro.isActive()) return;
    qs.forEach(q => { const r = q.el.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); const f = clamp(1 - d / 220, 0, 1); q.y(-f * 36); q.s(1 + f * .25); });
  });
}
if (heroChars.length) {
  gsap.to(heroChars, { yPercent: () => gsap.utils.random(-200, -40), xPercent: () => gsap.utils.random(-80, 80), rotate: () => gsap.utils.random(-60, 60), opacity: 0, ease: 'none', stagger: { each: .004, from: 'random' }, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
  gsap.to('.hero-bottom,.hero .eyebrow', { y: -120, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '60% top', scrub: true } });
  gsap.to('.badge', { rotate: 360, scale: .4, y: 300, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}
if (pChars.length && $('.phero')) {
  gsap.to(pChars, { yPercent: () => gsap.utils.random(-120, -20), rotate: () => gsap.utils.random(-30, 30), opacity: 0, ease: 'none', stagger: { each: .003, from: 'random' }, scrollTrigger: { trigger: '.phero', start: '30% top', end: 'bottom top', scrub: 1 } });
}

/* stats band */
$$('.stat').forEach((s, i) => gsap.from(s, { y: 60, opacity: 0, duration: 1, delay: i * .1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 90%' } }));

/* cinematic */
if ($('.cine')) {
  const cineA = $('#cineA'), cineChars = splitChars(cineA), cineNum = $('#cineNum'), fChars = $$('#formula span');
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.cine', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  tl.fromTo(cineA, { scale: 3.2, filter: 'blur(20px)', opacity: 0 }, { scale: 1, filter: 'blur(0px)', opacity: 1, duration: 1, ease: 'power2.out' })
    .from(cineChars, { rotateY: 90, opacity: 0, stagger: .02, duration: .6 }, '<.2')
    .to(cineA, { scale: .6, opacity: 0, y: -100, duration: .8 }, '+=.4')
    .to('.cine .l2', { clipPath: 'circle(75% at 50% 50%)', duration: 1.2, ease: 'power2.inOut' }, '<.2')
    .fromTo(cineNum, { scale: .3, rotate: -12 }, { scale: 1, rotate: 0, duration: 1.2 }, '<')
    .to({ v: 0 }, { v: +cineNum.dataset.to || 44, duration: 1.4, ease: 'none', onUpdate() { cineNum.textContent = '−' + Math.round(this.targets()[0].v) + '%'; } }, '<')
    .to('.cine .l2', { clipPath: 'circle(0% at 50% 50%)', duration: 1, ease: 'power2.inOut' }, '+=.5')
    .to('.cine .l3', { opacity: 1, duration: .2 }, '<.5')
    .from(fChars, { y: () => gsap.utils.random(-300, 300), x: () => gsap.utils.random(-400, 400), rotate: () => gsap.utils.random(-90, 90), scale: 0, opacity: 0, stagger: .08, duration: 1, ease: 'back.out(1.5)' }, '<')
    .from('.cine .l3 p', { opacity: 0, y: 30, duration: .5 })
    .to({}, { duration: .6 });
}

/* service cards (3D) */
$$('.svc').forEach((c, i) => {
  gsap.from(c, { y: 200, z: -400, rotateX: gsap.utils.random(-60, -30), rotateY: gsap.utils.random(-40, 40), rotate: gsap.utils.random(-15, 15), opacity: 0, duration: 1.4, ease: 'expo.out', delay: (i % 3) * .12, scrollTrigger: { trigger: c, start: 'top 94%', toggleActions: 'play none none reverse' }, onComplete: () => { const sh = $('.shine', c); sh && gsap.fromTo(sh, { xPercent: -120 }, { xPercent: 120, duration: 1.2, ease: 'power2.inOut' }); } });
  const ico = $('.ico', c); ico && gsap.from(ico, { scale: 0, rotate: -200, duration: 1, delay: .4 + (i % 3) * .12, ease: 'back.out(3)', scrollTrigger: { trigger: c, start: 'top 94%', toggleActions: 'play none none reverse' } });
  tilt(c, 18, true);
});
function tilt(c, amt, spot) {
  if (touch) return;
  c.addEventListener('mousemove', e => {
    const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (spot) { c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px'); }
    gsap.to(c, { rotateY: (x / r.width - .5) * amt, rotateX: -(y / r.height - .5) * amt, scale: 1.02, transformPerspective: 1000, duration: .5, ease: 'power2' });
  });
  c.addEventListener('mouseenter', () => { const sh = $('.shine', c); sh && gsap.fromTo(sh, { xPercent: -120 }, { xPercent: 120, duration: .9, ease: 'power2.inOut' }); });
  c.addEventListener('mouseleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, scale: 1, duration: 1, ease: 'elastic.out(1,.4)' }));
}

/* dashboard pin */
if ($('.dsh')) {
  const dChart = $('#dChart'), bars = [], bv = [30, 42, 38, 55, 49, 62, 58, 70, 66, 78, 74, 85, 82, 92, 88, 97];
  bv.forEach(v => { const i = document.createElement('i'); i.style.height = v + '%'; dChart.appendChild(i); bars.push(i); });
  const k = { a: 70, r: 1.4, t: 48, kw: 35 }, kEls = [$('#k1'), $('#k2'), $('#k3'), $('#k4')];
  const dt = gsap.timeline({ scrollTrigger: { trigger: '.dsh', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  dt.fromTo('#dash', { rotateX: 72, rotateZ: -14, y: 260, scale: .65, opacity: .3 }, { rotateX: 0, rotateZ: 0, y: 0, scale: 1, opacity: 1, duration: 1.2, ease: 'power2.out' })
    .from('.dsh-stage h2', { y: -80, opacity: 0, duration: .6 }, 0)
    .from('.kp', { z: -300, opacity: 0, rotateY: 90, stagger: .1, duration: .6 }, '-=.6')
    .to(bars, { scaleY: 1, stagger: .04, duration: .7, ease: 'back.out(2)' }, '-=.3')
    .to(k, { a: 31, r: 3.9, t: 18, kw: 112, duration: 1.2, ease: 'none', onUpdate: () => { kEls[0].textContent = Math.round(k.a) + '%'; kEls[1].textContent = k.r.toFixed(1) + '×'; kEls[2].textContent = Math.round(k.t) + '%'; kEls[3].textContent = Math.round(k.kw); } }, '<')
    .to('#dash', { rotateY: -8, rotateX: 6, duration: .6 }, '<')
    .to('#dash', { scale: .85, y: -60, opacity: 0, rotateX: -30, duration: .8 }, '+=.3');
  setInterval(() => { if (!dt.scrollTrigger.isActive) return; bars.forEach((b, i) => gsap.to(b, { height: clamp(bv[i] + gsap.utils.random(-10, 10), 15, 100) + '%', duration: 1, ease: 'power2.inOut' })); }, 1600);
}

/* horizontal process */
if ($('.proc-pin')) {
  const pTrack = $('#pTrack'), steps = $$('.step', pTrack), pPath = $('#pPath');
  const pLen = pPath.getTotalLength(); gsap.set(pPath, { strokeDasharray: pLen, strokeDashoffset: pLen });
  const pDist = () => pTrack.scrollWidth - innerWidth;
  const pt = gsap.timeline({ scrollTrigger: { trigger: '.proc-pin', start: 'top top', end: () => '+=' + pDist() * 1.2, pin: true, scrub: 1, invalidateOnRefresh: true } });
  pt.to(pTrack, { x: () => -pDist(), ease: 'none' }, 0).to(pPath, { strokeDashoffset: 0, ease: 'none' }, 0);
  const ca = pt.getChildren()[0];
  steps.forEach(s => {
    gsap.fromTo(s, { rotateY: -55, z: -250, opacity: .2, scale: .85 }, { rotateY: 0, z: 0, opacity: 1, scale: 1, ease: 'power2.out', scrollTrigger: { trigger: s, containerAnimation: ca, start: 'left 100%', end: 'left 45%', scrub: true } });
    gsap.fromTo($('.num', s), { xPercent: 80 }, { xPercent: -20, ease: 'none', scrollTrigger: { trigger: s, containerAnimation: ca, start: 'left right', end: 'right left', scrub: true } });
  });
}

/* audit ring */
if ($('#ringBox')) {
  ScrollTrigger.create({ trigger: '#ringBox', start: 'top 75%', once: true, onEnter: () => {
    gsap.to('#ring', { strokeDashoffset: 0, duration: 2.2, ease: 'power3.inOut' });
    const o = { v: 0 }; gsap.to(o, { v: 15, duration: 2.2, ease: 'power3.inOut', onUpdate: () => $('#ringNum').textContent = Math.round(o.v) });
  } });
  gsap.from('#ringBox', { scale: .7, rotate: -30, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '#ringBox', start: 'top 85%' } });
  gsap.from('.chk', { x: 60, opacity: 0, stagger: .06, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: '.checks', start: 'top 82%' } });
  gsap.from('.chk b', { scale: 0, rotate: -90, stagger: .06, duration: .6, delay: .3, ease: 'back.out(3)', scrollTrigger: { trigger: '.checks', start: 'top 82%' } });
}

/* stacking case cards */
const cases = $$('.case');
cases.forEach((c, i) => {
  gsap.from(c, { y: 200, rotate: i % 2 ? 4 : -4, scale: .9, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top bottom', end: 'top 30%', scrub: 1 } });
  gsap.from($$('.met', c), { scale: .5, opacity: 0, rotate: () => gsap.utils.random(-20, 20), stagger: .08, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: c, start: 'top 60%' } });
  if (i < cases.length - 1) gsap.to(c, { scale: .88, filter: 'brightness(.45) blur(2px)', ease: 'none', scrollTrigger: { trigger: cases[i + 1], start: 'top bottom', end: 'top 12%', scrub: true } });
});

/* bot */
if ($('#bot')) {
  const bot = $('#bot'), pupils = $$('.pupil', bot), eyes = $('#eyes'), mouth = $('#mouth'), bubble = $('#bubbleTxt');
  const lines = ['Hi! I calculate bids.', 'Target ACOS × CVR × Price…', '…= Target CPC. Every time.', '380 negatives? Easy.', 'Wasted spend detected. Fixing.', 'Poke me again.'];
  let li = 0, typing = null;
  const say = t => { clearInterval(typing); let i = 0; bubble.textContent = ''; typing = setInterval(() => { bubble.textContent = t.slice(0, ++i); if (i >= t.length) clearInterval(typing); }, 38); };
  ScrollTrigger.create({ trigger: bot, start: 'top 80%', once: true, onEnter: () => {
    say(lines[0]);
    gsap.from('#botBody', { y: -300, rotate: -30, duration: 1.4, ease: 'bounce.out', transformOrigin: '50% 100%' });
    gsap.from('#shadow', { scale: 0, duration: 1.4, ease: 'bounce.out', transformOrigin: '50% 50%' });
  } });
  setInterval(() => { li = (li + 1) % lines.length; say(lines[li]); }, 4200);
  gsap.to('#botBody', { y: -12, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('#shadow', { scaleX: .8, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 50%' });
  gsap.to('#antenna', { attr: { r: 13 }, fill: '#ff5a1f', duration: .8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('#meter', { attr: { width: 20 }, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  (function blink() { gsap.to(eyes, { scaleY: .1, duration: .08, yoyo: true, repeat: 1, transformOrigin: '50% 50%', onComplete: () => setTimeout(blink, gsap.utils.random(1800, 4500)) }); })();
  const base = pupils.map(p => ({ x: +p.getAttribute('cx'), y: +p.getAttribute('cy') }));
  gsap.ticker.add(() => {
    const r = bot.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * .43, a = Math.atan2(mouse.y - cy, mouse.x - cx), d = clamp(Math.hypot(mouse.x - cx, mouse.y - cy) / 200, 0, 1) * 8;
    pupils.forEach((p, i) => gsap.set(p, { attr: { cx: base[i].x + Math.cos(a) * d, cy: base[i].y + Math.sin(a) * d } }));
    gsap.set('#botBody', { rotate: clamp((mouse.x - cx) / 60, -8, 8), transformOrigin: '50% 100%' });
  });
  bot.addEventListener('click', () => {
    li = (li + 1) % lines.length; say(lines[li]);
    gsap.timeline().to(mouth, { attr: { d: 'M120,152 Q150,190 180,152' }, duration: .2 })
      .to('#botBody', { scaleY: .8, scaleX: 1.15, duration: .12, transformOrigin: '50% 100%' })
      .to('#botBody', { scaleY: 1.15, scaleX: .9, y: -60, duration: .25, ease: 'power2.out' })
      .to('#botBody', { scaleY: 1, scaleX: 1, y: 0, duration: .6, ease: 'bounce.out' })
      .to(mouth, { attr: { d: 'M128,160 Q150,170 172,160' }, duration: .3 }, '+=.3');
  });
}
$$('.reason').forEach((r, i) => {
  gsap.from(r, { x: 200, rotateY: -40, opacity: 0, duration: 1.1, ease: 'expo.out', delay: i * .1, scrollTrigger: { trigger: r, start: 'top 92%', toggleActions: 'play none none reverse' } });
  const ri = $('.ri', r); ri && gsap.from(ri, { scale: 0, rotate: -180, duration: .9, delay: .3 + i * .1, ease: 'back.out(3)', scrollTrigger: { trigger: r, start: 'top 92%', toggleActions: 'play none none reverse' } });
});

/* drag testimonials */
if ($('#tTrack')) {
  const tt = $('#tTrack'), tCards = $$('.tcard', tt);
  let tx = 0, tv = 0, drag = false, sx = 0, sTx = 0, lastPX = 0, tAuto = -.6;
  const tMin = () => Math.min(0, innerWidth - tt.scrollWidth);
  tt.addEventListener('pointerdown', e => { drag = true; sx = e.clientX; sTx = tx; lastPX = e.clientX; tt.classList.add('drag'); tt.setPointerCapture(e.pointerId); gsap.to(tCards, { scale: .95, duration: .3 }); });
  tt.addEventListener('pointermove', e => { if (!drag) return; tv = e.clientX - lastPX; lastPX = e.clientX; tx = sTx + (e.clientX - sx); });
  const end = () => { if (!drag) return; drag = false; tt.classList.remove('drag'); gsap.to(tCards, { scale: 1, duration: .5, ease: 'back.out(2)' }); };
  tt.addEventListener('pointerup', end); tt.addEventListener('pointercancel', end);
  gsap.ticker.add(() => {
    if (!drag) { tv *= .94; tx += tv + tAuto; }
    const mn = tMin();
    if (tx > 0) { tx += (0 - tx) * .12; if (!drag) tAuto = -.6; }
    if (tx < mn) { tx += (mn - tx) * .12; if (!drag) tAuto = .6; }
    gsap.set(tt, { x: tx }); tCards.forEach(c => gsap.set(c, { rotate: clamp(tv * .4, -8, 8) }));
  });
  gsap.from(tCards, { y: 150, rotate: () => gsap.utils.random(-15, 15), opacity: 0, stagger: .12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: tt, start: 'top 88%' } });
}
$$('.chips,.mk-row').forEach(g => gsap.from($$('.chip', g), { y: 60, opacity: 0, scale: .4, rotate: () => gsap.utils.random(-30, 30), stagger: { each: .04, from: 'random' }, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: g, start: 'top 94%' } }));
if (!touch) $$('.chip').forEach(c => {
  c.addEventListener('mouseenter', () => gsap.to(c, { y: -8, rotate: gsap.utils.random(-6, 6), backgroundColor: '#ff5a1f', color: '#0a0a0b', duration: .3 }));
  c.addEventListener('mouseleave', () => gsap.to(c, { y: 0, rotate: 0, backgroundColor: 'rgba(239,235,228,.03)', color: '#efebe4', duration: .5, ease: 'elastic.out(1,.4)' }));
});

/* blog cards */
$$('.post').forEach((p, i) => {
  gsap.from(p, { clipPath: 'inset(100% 0% 0% 0% round 26px)', y: 100, duration: 1.3, delay: (i % 3) * .12, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 94%', toggleActions: 'play none none reverse' } });
  if (!touch) {
    p.addEventListener('mousemove', e => { const r = p.getBoundingClientRect(); gsap.to(p, { x: (e.clientX - r.left - r.width / 2) * .05, y: (e.clientY - r.top - r.height / 2) * .05, rotate: (e.clientX - r.left - r.width / 2) * .008, duration: .4 }); });
    p.addEventListener('mouseleave', () => gsap.to(p, { x: 0, y: 0, rotate: 0, duration: .8, ease: 'elastic.out(1,.4)' }));
    p.addEventListener('mouseenter', () => scramble($('h4', p), null, 500));
  }
});

/* sticky CTA */
if ($('.cta')) {
  const ctaChars = splitChars($('#ctaTitle'));
  const ct = gsap.timeline({ scrollTrigger: { trigger: '.cta', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  ct.fromTo('#ctaFill', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(80% at 50% 50%)', duration: 1, ease: 'power2.inOut' })
    .to('.cta-in', { color: '#0a0a0b', duration: .3 }, '<.5')
    .from(ctaChars, { yPercent: 150, rotate: () => gsap.utils.random(-40, 40), opacity: 0, stagger: { each: .015, from: 'center' }, duration: .8, ease: 'back.out(1.6)' }, '<-.3')
    .from('.cta-in p,.cta-in .cta-row', { y: 60, opacity: 0, stagger: .1, duration: .5 }, '-=.3')
    .set('.cta-in .btn-p', { backgroundColor: '#0a0a0b', color: '#efebe4' }, '<')
    .set('.cta-in .btn-g', { borderColor: 'rgba(0,0,0,.4)' }, '<')
    .to({}, { duration: .5 });
}

/* =====================================================================
   INNER PAGE MODULES
   ===================================================================== */
/* service rows */
$$('.srow').forEach(r => {
  gsap.to($('.line', r), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: r, start: 'top 80%', end: 'bottom 60%', scrub: true } });
  gsap.from($('.idx', r), { xPercent: -60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: r, start: 'top 80%' } });
  gsap.from([$('.ico', r), $('h3', r), $('.tagline', r), $('p', r)], { y: 50, opacity: 0, stagger: .08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: r, start: 'top 80%' } });
  gsap.from($$('.tick-list li', r), { x: 80, opacity: 0, rotateY: -30, stagger: .07, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: $('.tick-list', r), start: 'top 85%' } });
});
/* tools */
if ($('.tool-grid')) {
  gsap.from('.tool', { scale: .6, rotate: () => gsap.utils.random(-20, 20), opacity: 0, stagger: { each: .07, from: 'random' }, duration: 1, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.tool-grid', start: 'top 85%' } });
  $$('.tool').forEach(t => tilt(t, 22));
}
/* plans */
$$('.plan').forEach((p, i) => {
  gsap.from(p, { y: 160, rotateX: -40, opacity: 0, duration: 1.3, delay: i * .12, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: '.plans', start: 'top 85%' } });
  gsap.from($$('li', p), { x: -30, opacity: 0, stagger: .05, duration: .6, delay: .5 + i * .12, scrollTrigger: { trigger: '.plans', start: 'top 85%' } });
  tilt(p, 10);
});
/* live dashboards */
$$('.live').forEach(l => {
  const shot = $('.shot', l);
  gsap.from(shot, { rotateY: -25, rotateX: 15, scale: .8, opacity: 0, duration: 1.4, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: l, start: 'top 80%' } });
  gsap.to(shot, { y: -40, ease: 'none', scrollTrigger: { trigger: l, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from($$('.live-k div', l), { y: 40, opacity: 0, stagger: .1, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: l, start: 'top 80%' } });
  const bar = $('.acos-bar i', l); bar && gsap.to(bar, { width: bar.dataset.w + '%', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 75%' } });
  if (!touch && shot) {
    l.addEventListener('mousemove', e => { const r = shot.getBoundingClientRect(); gsap.to(shot, { rotateY: ((e.clientX - r.left) / r.width - .5) * 10, rotateX: -((e.clientY - r.top) / r.height - .5) * 10, transformPerspective: 1200, duration: .6 }); });
    l.addEventListener('mouseleave', () => gsap.to(shot, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.4)' }));
  }
});
/* blog filters */
if ($('.filters')) {
  const posts = $$('.blog.all .post');
  $$('.filter').forEach(f => f.addEventListener('click', () => {
    $$('.filter').forEach(x => x.classList.toggle('on', x === f));
    const cat = f.dataset.cat;
    const show = posts.filter(p => cat === 'all' || p.dataset.cat === cat), hide = posts.filter(p => !show.includes(p));
    gsap.to(hide, { scale: .8, opacity: 0, duration: .35, ease: 'power2.in', onComplete: () => {
      hide.forEach(p => p.style.display = 'none'); show.forEach(p => p.style.display = '');
      gsap.fromTo(show, { scale: .85, opacity: 0, y: 40 }, { scale: 1, opacity: 1, y: 0, stagger: .06, duration: .6, ease: 'back.out(1.6)', onComplete: () => ScrollTrigger.refresh() });
    } });
    if (!hide.length) gsap.fromTo(show, { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, stagger: .05, duration: .5 });
  }));
}
/* article */
if ($('.prose') && $('.read-prog')) {
  gsap.to('.read-prog', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.prose', start: 'top 20%', end: 'bottom bottom', scrub: .3 } });
  $$('.prose > h2, .prose > h3').forEach(h => gsap.from(h, { x: -60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  $$('.prose > p, .prose > ul, .prose > ol, .prose > table').forEach(p => gsap.from(p, { y: 30, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 92%' } }));
  $$('.prose .callout, .prose .key-points').forEach(c => gsap.from(c, { scale: .92, opacity: 0, rotate: -1.5, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%' } }));
  $$('.prose .key-points li').forEach((li, i) => gsap.from(li, { x: 40, opacity: 0, duration: .6, delay: i * .06, scrollTrigger: { trigger: li, start: 'top 94%' } }));
}
if ($('.art-cta')) gsap.from('.art-cta', { clipPath: 'inset(20% 20% 20% 20% round 30px)', scale: .9, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.art-cta', start: 'top 85%' } });
$$('.related a').forEach((a, i) => gsap.from(a, { y: 80, opacity: 0, rotate: i % 2 ? 3 : -3, duration: 1, delay: i * .1, ease: 'expo.out', scrollTrigger: { trigger: '.related', start: 'top 90%' } }));
/* contact page */
if ($('.form-card')) {
  gsap.from('.form-card', { y: 100, opacity: 0, rotateX: -12, duration: 1.3, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: '.ct-grid', start: 'top 85%' } });
  gsap.from('.field', { y: 30, opacity: 0, stagger: .06, duration: .8, delay: .3, ease: 'power3.out', scrollTrigger: { trigger: '.ct-grid', start: 'top 85%' } });
  gsap.from('.side .audit-box', { x: 80, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.audit-box', start: 'top 92%' } });
  $$('.field input, .field textarea, .field select').forEach(i => i.addEventListener('focus', () => gsap.fromTo(i.closest('.field'), { x: 0 }, { x: 6, duration: .15, yoyo: true, repeat: 1 })));
}
$$('.audit-box li').forEach((li, i) => gsap.from(li, { x: 30, opacity: 0, duration: .6, delay: i * .06, scrollTrigger: { trigger: '.audit-box', start: 'top 85%' } }));
/* faq */
$$('.qa').forEach((q, i) => {
  gsap.from(q, { y: 40, opacity: 0, duration: .8, delay: i * .06, ease: 'power3.out', scrollTrigger: { trigger: '.faq', start: 'top 85%' } });
  const btn = $('button', q), ans = $('.ans', q);
  btn.addEventListener('click', () => {
    const open = q.classList.contains('open');
    $$('.qa.open').forEach(o => { o.classList.remove('open'); $('button', o).setAttribute('aria-expanded', 'false'); gsap.to($('.ans', o), { height: 0, duration: .5, ease: 'power3.inOut' }); });
    if (!open) { q.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); gsap.to(ans, { height: 'auto', duration: .6, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() }); gsap.from($('p', ans), { y: 20, opacity: 0, duration: .5, delay: .15 }); }
  });
});
/* legal toc */
if ($('.toc')) {
  const links = $$('.toc a');
  links.forEach(a => { const s = $(a.getAttribute('href')); s && ScrollTrigger.create({ trigger: s, start: 'top 45%', end: 'bottom 45%', onToggle: st => { if (st.isActive) links.forEach(l => l.classList.toggle('on', l === a)); } }); });
  $$('.legal .prose section').forEach(s => gsap.from(s, { y: 40, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 88%' } }));
}
/* landing */
$$('.proof div').forEach((d, i) => gsap.from(d, { y: 60, opacity: 0, scale: .9, duration: 1, delay: .2 + i * .1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.proof', start: 'top 95%' } }));
$$('.rc').forEach((c, i) => { gsap.from(c, { y: 160, rotateY: gsap.utils.random(-30, 30), opacity: 0, duration: 1.3, delay: i * .12, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: '.rc-grid', start: 'top 85%' } }); tilt(c, 12); });
if ($('.vs')) {
  gsap.from('.vs-card.them', { x: -120, rotate: -4, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.vs', start: 'top 80%' } });
  gsap.from('.vs-card.us', { x: 120, rotate: 4, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.vs', start: 'top 80%' } });
  gsap.from('.vs-card li', { y: 20, opacity: 0, stagger: .05, duration: .6, delay: .4, scrollTrigger: { trigger: '.vs', start: 'top 80%' } });
}
$$('.ch').forEach((c, i) => gsap.from(c, { x: 60, opacity: 0, duration: .9, delay: i * .08, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 94%' } }));

/* =====================================================================
   FOOTER GIANT LETTERS
   ===================================================================== */
$$('.giant').forEach(giant => {
  const word = giant.dataset.word || giant.textContent.trim();
  giant.innerHTML = [...word].map(c => `<span>${c}</span>`).join('');
  const gL = $$('span', giant);
  gsap.from(gL, { yPercent: -200, rotate: () => gsap.utils.random(-90, 90), opacity: 0, stagger: { each: .06, from: 'random' }, duration: 1.6, ease: 'bounce.out', scrollTrigger: { trigger: giant, start: 'top 98%', toggleActions: 'play none none reverse' } });
  if (!touch) {
    const gq = gL.map(l => ({ l, y: gsap.quickTo(l, 'y', { duration: .6, ease: 'power3' }), r: gsap.quickTo(l, 'rotate', { duration: .6, ease: 'power3' }) }));
    addEventListener('mousemove', e => {
      const gr = giant.getBoundingClientRect(); if (gr.top > innerHeight || gr.bottom < 0) return;
      gq.forEach(q => { const r = q.l.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), f = clamp(1 - Math.hypot(dx, dy) / 260, 0, 1); q.y(-f * 80); q.r(f * (dx > 0 ? -18 : 18)); q.l.style.color = f > .2 ? '#ff5a1f' : ''; });
    });
  }
});
if ($('.credit')) gsap.from('.credit span', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.credit', start: 'top 99%' } });

initForm();

/* =====================================================================
   CONTACT FORM — Formspree via fetch, falls back to normal POST
   ===================================================================== */
function initForm() {
  const f = $('#cf'); if (!f || f.dataset.bound) return; f.dataset.bound = 1;
  const status = $('.f-status', f), btn = $('[type=submit]', f);
  f.addEventListener('submit', async e => {
    if (!window.fetch) return; // let the browser post normally
    e.preventDefault();
    status.textContent = ''; status.classList.remove('err');
    const lbl = $('.lbl', btn); const old = btn.innerHTML;
    btn.disabled = true; if (lbl) lbl.innerHTML = '<span>Sending…</span><span>Sending…</span>';
    try {
      const res = await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('bad');
      try { if (typeof gtag === 'function') gtag('event', 'generate_lead', { method: 'contact_form' }); } catch (x) {}
      try { if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'contact_form' }); } catch (x) {}
      const card = f.closest('.form-card');
      const done = document.createElement('div'); done.className = 'form-done';
      done.innerHTML = '<div class="ok"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></div><h3>Message sent.</h3><p>Thanks — we\'ll reply within 1 business day. For a faster answer, message us on <a href="https://wa.me/918607070505" style="color:var(--accent)">WhatsApp</a>.</p>';
      if (typeof gsap !== 'undefined') {
        gsap.to(f, { opacity: 0, y: -30, duration: .4, onComplete: () => { f.replaceWith(done); gsap.from(done, { scale: .8, opacity: 0, duration: .8, ease: 'back.out(1.8)' }); gsap.from($('.ok', done), { rotate: -180, scale: 0, duration: 1, delay: .2, ease: 'back.out(2)' }); window.__blobPulse = .9; } });
      } else f.replaceWith(done);
      card && card.scrollIntoView && card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      btn.disabled = false; btn.innerHTML = old;
      status.classList.add('err');
      status.innerHTML = 'Something went wrong sending that. Please email <a href="mailto:connect@bidvista.org" style="color:inherit;text-decoration:underline">connect@bidvista.org</a> or try WhatsApp.';
    }
  });
}
function initFaqBasic() {
  $$('.qa').forEach(q => $('button', q).addEventListener('click', () => {
    const open = q.classList.toggle('open'); $('.ans', q).style.height = open ? 'auto' : '0';
  }));
}

addEventListener('load', () => ScrollTrigger.refresh());
let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => ScrollTrigger.refresh(), 200); });
})();
