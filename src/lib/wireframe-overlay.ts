import { isEnabled, isElementExcluded } from './wireframe-config';

interface Entry {
	el: Element;
	box: HTMLElement;
	initial: DOMRect;
	raf: number;
	onEnd: () => void;
	onLeave: () => void;
}

let container: HTMLElement | null = null;
const active = new WeakMap<Element, Entry>();

function ensureContainer(): HTMLElement {
	if (container && container.isConnected) return container;
	container = document.createElement('div');
	container.className = 'wireframe-container';
	container.setAttribute('aria-hidden', 'true');
	document.body.appendChild(container);
	return container;
}

function notchPx(el: Element): number {
	const g = el.closest('.grid');
	if (!g) return 0;
	const m = getComputedStyle(g).getPropertyValue('--notch').trim().match(/([\d.]+)px/);
	return m ? parseFloat(m[1]) : 0;
}

function makeBox(): HTMLElement {
	const b = document.createElement('div');
	b.className = 'wireframe-box';
	b.innerHTML = '<i class="wf-c tl"></i><i class="wf-c tr"></i><i class="wf-c bl"></i><i class="wf-c br"></i><b class="wf-label"></b>';
	ensureContainer().appendChild(b);
	return b;
}

function setClip(box: HTMLElement, el: Element) {
	const cls = typeof el.className === 'string' ? el.className : '';
	const n = notchPx(el);
	if (!n) { box.style.clipPath = ''; return; }
	const r = el.getBoundingClientRect();
	const w = r.width, h = r.height;
	const v = (x: number) => `${(x / w * 100)}%`;
	const ht = (y: number) => `${(y / h * 100)}%`;
	if (cls.includes(' tl')) box.style.clipPath = `polygon(0 0,100% 0,100% ${ht(h-n)},${v(w-n)} ${ht(h-n)},${v(w-n)} 100%,0 100%)`;
	else if (cls.includes(' tr')) box.style.clipPath = `polygon(0 0,100% 0,100% 100%,${v(n)} 100%,${v(n)} ${ht(h-n)},0 ${ht(h-n)})`;
	else if (cls.includes(' bl')) box.style.clipPath = `polygon(0 0,${v(w-n)} 0,${v(w-n)} ${ht(n)},100% ${ht(n)},100% 100%,0 100%)`;
	else if (cls.includes(' br')) box.style.clipPath = `polygon(${v(n)} 0,100% 0,100% 100%,0 100%,0 ${ht(n)},${v(n)} ${ht(n)})`;
	else box.style.clipPath = '';
}

function same(a: DOMRect, b: DOMRect) {
	return Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5 &&
		Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5;
}

function labelText(i: DOMRect, c: DOMRect) {
	const dw = c.width - i.width, dh = c.height - i.height;
	const dx = c.left - i.left, dy = c.top - i.top;
	const sw = i.width > 0 ? Math.abs(dw / i.width) : 0;
	const sh = i.height > 0 ? Math.abs(dh / i.height) : 0;
	const s = Math.max(sw, sh);
	const m = Math.sqrt(dx * dx + dy * dy);
	if (s > 0.01) return `${dw > 0 || dh > 0 ? 'scaling up' : 'scaling down'}: ${(s * 100).toFixed(0)}%`;
	if (m > 1) return `moving: ${m.toFixed(0)}px`;
	return 'tracking';
}

function tick(e: Entry) {
	const c = e.el.getBoundingClientRect();
	e.box.style.top = `${c.top}px`;
	e.box.style.left = `${c.left}px`;
	e.box.style.width = `${c.width}px`;
	e.box.style.height = `${c.height}px`;
	setClip(e.box, e.el);
	const l = e.box.querySelector('.wf-label') as HTMLElement;
	if (l) l.textContent = labelText(e.initial, c);
	e.raf = requestAnimationFrame(() => tick(e));
}

function add(el: Element) {
	if (active.has(el)) return;
	if (!isEnabled() || isElementExcluded(el)) return;
	const r = el.getBoundingClientRect();
	if (r.width === 0 && r.height === 0) return;

	const box = makeBox();
	const onEnd = () => rm(el);
	const onLeave = () => rm(el);

	el.addEventListener('transitionend', onEnd, { once: true });
	el.addEventListener('pointerleave', onLeave, { once: true });

	const e: Entry = { el, box, initial: r, raf: 0, onEnd, onLeave };
	active.set(el, e);
	tick(e);
}

function rm(el: Element) {
	const e = active.get(el);
	if (!e) return;
	el.removeEventListener('transitionend', e.onEnd);
	el.removeEventListener('pointerleave', e.onLeave);
	cancelAnimationFrame(e.raf);
	e.box.classList.add('fading');
	setTimeout(() => e.box.remove(), 200);
	active.delete(el);
}

function onEnter(ev: PointerEvent) { add(ev.currentTarget as Element); }

export function initWireframes(root: ParentNode = document) {
	root.querySelectorAll('[data-wireframe-track]').forEach((el) => {
		if ((el as any).__wf) return;
		(el as any).__wf = true;
		el.addEventListener('pointerenter', onEnter);
	});
}

export function destroyAll() {
	active.forEach((_, el) => rm(el));
	if (container) { container.remove(); container = null; }
}
