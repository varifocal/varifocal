import { isEnabled, isElementExcluded } from './wireframe-config';

interface WireframeEntry {
	el: Element;
	svg: SVGElement;
	group: SVGElement;
	initial: DOMRect;
	onTransitionEnd: () => void;
	onLeave: () => void;
}

let container: HTMLElement | null = null;
const active = new WeakMap<Element, WireframeEntry>();

function ensureContainer(): HTMLElement {
	if (container && container.isConnected) return container;
	container = document.createElement('div');
	container.className = 'wireframe-container';
	container.setAttribute('aria-hidden', 'true');
	document.body.appendChild(container);
	return container;
}

function parseNotch(el: Element): number {
	const grid = el.closest('.grid');
	if (!grid) return 0;
	const raw = getComputedStyle(grid).getPropertyValue('--notch').trim();
	const m = raw.match(/([\d.]+)px/);
	return m ? parseFloat(m[1]) : 0;
}

function clipPolygon(el: Element): string | null {
	const cls = typeof el.className === 'string' ? el.className : '';
	const r = el.getBoundingClientRect();
	const w = r.width;
	const h = r.height;
	const n = parseNotch(el);
	if (n === 0) return null;
	if (cls.includes(' tl')) return `0,0 ${w},0 ${w},${h - n} ${w - n},${h - n} ${w - n},${h} 0,${h}`;
	if (cls.includes(' tr')) return `0,0 ${w},0 ${w},${h} ${n},${h} ${n},${h - n} 0,${h - n}`;
	if (cls.includes(' bl')) return `0,0 ${w - n},0 ${w - n},${n} ${w},${n} ${w},${h} 0,${h}`;
	if (cls.includes(' br')) return `${n},0 ${w},0 ${w},${h} 0,${h} 0,${n} ${n},${n}`;
	return null;
}

function makeSVG(): { svg: SVGElement; group: SVGElement } {
	const ns = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(ns, 'svg');
	svg.classList.add('wireframe-svg');
	svg.setAttribute('fill', 'none');

	const g = document.createElementNS(ns, 'g');

	const vLine = document.createElementNS(ns, 'line');
	vLine.setAttribute('stroke', 'rgba(255,255,255,0.25)');
	vLine.setAttribute('stroke-width', '1');
	vLine.setAttribute('class', 'wf-v');
	g.appendChild(vLine);

	const hLine = document.createElementNS(ns, 'line');
	hLine.setAttribute('stroke', 'rgba(255,255,255,0.25)');
	hLine.setAttribute('stroke-width', '1');
	hLine.setAttribute('class', 'wf-h');
	g.appendChild(hLine);

	const path = document.createElementNS(ns, 'path');
	path.setAttribute('stroke', 'rgba(255,255,255,0.7)');
	path.setAttribute('stroke-width', '1');
	path.setAttribute('fill', 'none');
	path.setAttribute('class', 'wf-path');
	g.appendChild(path);

	for (const c of ['tl', 'tr', 'bl', 'br']) {
		const p = document.createElementNS(ns, 'path');
		p.setAttribute('stroke', 'rgba(255,255,255,0.9)');
		p.setAttribute('stroke-width', '2');
		p.setAttribute('fill', 'none');
		p.setAttribute('class', `wf-c-${c}`);
		g.appendChild(p);
	}

	const bg = document.createElementNS(ns, 'rect');
	bg.setAttribute('fill', 'rgba(0,0,0,0.65)');
	bg.setAttribute('rx', '2');
	bg.setAttribute('class', 'wf-bg');
	g.appendChild(bg);

	const txt = document.createElementNS(ns, 'text');
	txt.setAttribute('text-anchor', 'middle');
	txt.setAttribute('dominant-baseline', 'central');
	txt.setAttribute('fill', '#fff');
	txt.setAttribute('font-family', 'monospace');
	txt.setAttribute('font-size', '10');
	txt.setAttribute('font-weight', '600');
	txt.setAttribute('class', 'wf-txt');
	g.appendChild(txt);

	svg.appendChild(g);
	ensureContainer().appendChild(svg);
	return { svg, group: g };
}

function draw(entry: WireframeEntry) {
	const r = entry.el.getBoundingClientRect();
	const w = r.width;
	const h = r.height;

	entry.svg.setAttribute('width', String(w));
	entry.svg.setAttribute('height', String(h));
	entry.svg.style.top = `${r.top}px`;
	entry.svg.style.left = `${r.left}px`;

	const clip = clipPolygon(entry.el);
	const pathEl = entry.group.querySelector('.wf-path') as SVGPathElement;
	pathEl.setAttribute('d', clip ? `M${clip}Z` : `M0,0 ${w},0 ${w},${h} 0,${h}Z`);

	const cx = w / 2;
	const cy = h / 2;

	const vLine = entry.group.querySelector('.wf-v') as SVGLineElement;
	vLine.setAttribute('x1', String(cx));
	vLine.setAttribute('y1', '0');
	vLine.setAttribute('x2', String(cx));
	vLine.setAttribute('y2', String(h));

	const hLine = entry.group.querySelector('.wf-h') as SVGLineElement;
	hLine.setAttribute('x1', '0');
	hLine.setAttribute('y1', String(cy));
	hLine.setAttribute('x2', String(w));
	hLine.setAttribute('y2', String(cy));

	const cs = 8;
	for (const [cls, x1, y1, x2, y2, x3, y3] of [
		['.wf-c-tl', 0, 0, cs, 0, 0, cs],
		['.wf-c-tr', w, 0, w - cs, 0, w, cs],
		['.wf-c-bl', 0, h, cs, h, 0, h - cs],
		['.wf-c-br', w, h, w - cs, h, w, h - cs],
	] as const) {
		const p = entry.group.querySelector(cls) as SVGPathElement;
		p.setAttribute('d', `M${x1},${y1} L${x2},${y2} M${x1},${y1} L${x3},${y3}`);
	}

	const dw = w - entry.initial.width;
	const dh = h - entry.initial.height;
	const dx = r.left - entry.initial.left;
	const dy = r.top - entry.initial.top;
	const scaleW = entry.initial.width > 0 ? Math.abs(dw / entry.initial.width) : 0;
	const scaleH = entry.initial.height > 0 ? Math.abs(dh / entry.initial.height) : 0;
	const maxScale = Math.max(scaleW, scaleH);
	const moved = Math.sqrt(dx * dx + dy * dy);

	let label = 'tracking';
	if (maxScale > 0.01) {
		const growing = dw > 0 || dh > 0;
		label = `${growing ? 'scaling up' : 'scaling down'}: ${(maxScale * 100).toFixed(0)}%`;
	} else if (moved > 1) {
		label = `moving: ${moved.toFixed(0)}px`;
	}

	const txt = entry.group.querySelector('.wf-txt') as SVGTextElement;
	txt.textContent = label;
	txt.setAttribute('x', String(cx));
	txt.setAttribute('y', String(cy));

	const tw = label.length * 6 + 14;
	const bg = entry.group.querySelector('.wf-bg') as SVGRectElement;
	bg.setAttribute('x', String(cx - tw / 2));
	bg.setAttribute('y', String(cy - 9));
	bg.setAttribute('width', String(tw));
	bg.setAttribute('height', '18');
}

function show(el: Element) {
	if (active.has(el)) return;
	if (!isEnabled() || isElementExcluded(el)) return;

	const r = el.getBoundingClientRect();
	if (r.width === 0 && r.height === 0) return;

	const { svg, group } = makeSVG();
	const entry: WireframeEntry = {
		el,
		svg,
		group,
		initial: r,
		onTransitionEnd: () => hide(el),
		onLeave: () => hide(el),
	};

	el.addEventListener('transitionend', entry.onTransitionEnd, { once: true });
	el.addEventListener('pointerleave', entry.onLeave, { once: true });

	active.set(el, entry);
	draw(entry);
}

function hide(el: Element) {
	const entry = active.get(el);
	if (!entry) return;

	el.removeEventListener('transitionend', entry.onTransitionEnd);
	el.removeEventListener('pointerleave', entry.onLeave);

	entry.svg.classList.add('fading');
	setTimeout(() => entry.svg.remove(), 200);
	active.delete(el);
}

export function initWireframes(root: ParentNode = document) {
	const els = root.querySelectorAll('[data-wireframe-track]');
	els.forEach((el) => {
		if ((el as any).__wfInit) return;
		(el as any).__wfInit = true;
		el.addEventListener('pointerenter', () => show(el));
	});
}

export function destroyAll() {
	active.forEach((_, el) => hide(el));
	if (container) {
		container.remove();
		container = null;
	}
}
