import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { initWireframes } from '../lib/wireframe-overlay';

const LINKS = [
	{ label: 'About', href: '/about', area: 'tl', bg: '/assets/hamburger/1.svg' },
	{ label: 'Projects', href: '/projects', area: 'tr', bg: '/assets/hamburger/2.svg' },
	{ label: 'Blog', href: '/blog', area: 'bl', bg: '/assets/hamburger/2.svg' },
	{ label: 'Contact', href: '/contact', area: 'br', bg: '/assets/hamburger/1.svg' },
] as const;

type Area = (typeof LINKS)[number]['area'];

const IDLE = {
	cols: '1fr 1fr',
	rows: '1fr 1fr',
	cp: { top: 50, left: 50 },
};

const HOVER: Record<Area, typeof IDLE> = {
	tl: { cols: '1.3fr 0.7fr', rows: '1.3fr 0.7fr', cp: { top: 65, left: 65 } },
	tr: { cols: '0.7fr 1.3fr', rows: '1.3fr 0.7fr', cp: { top: 65, left: 35 } },
	bl: { cols: '1.3fr 0.7fr', rows: '0.7fr 1.3fr', cp: { top: 35, left: 65 } },
	br: { cols: '0.7fr 1.3fr', rows: '0.7fr 1.3fr', cp: { top: 35, left: 35 } },
};

const NUM: Record<Area, string> = { tl: '01', tr: '02', bl: '03', br: '04' };

const MAX_MOVES = 5;
const MOVE_WINDOW = 1000;

export default function Hamburger() {
	const [open, setOpen] = useState(false);
	const [hovered, setHovered] = useState<Area | null>(null);
	const [closing, setClosing] = useState(false);
	const moveTimestamps = useRef<number[]>([]);

	const handleClose = useCallback(() => {
		setHovered(null);
		setOpen(false);
		setClosing(true);
		document.body.style.overflow = '';
	}, []);

	const scheduleHover = useCallback((area: Area) => {
		const now = Date.now();
		moveTimestamps.current.push(now);
		moveTimestamps.current = moveTimestamps.current.filter((t) => now - t < MOVE_WINDOW);
		if (moveTimestamps.current.length > MAX_MOVES) return;
		setHovered(area);
	}, []);

	const cancelHover = useCallback(() => {
		setHovered(null);
		moveTimestamps.current = [];
	}, []);

	const toggle = useCallback(() => {
		setOpen((prev) => {
			const next = !prev;
			document.body.style.overflow = next ? 'hidden' : '';
			if (!next) setHovered(null);
			return next;
		});
	}, []);

	const grid = useMemo(() => (hovered ? HOVER[hovered] : IDLE), [hovered]);

	useEffect(() => {
		if (!closing) return;
		const t = setTimeout(() => setClosing(false), 450);
		return () => clearTimeout(t);
	}, [closing]);

	useEffect(() => {
		initWireframes();
	}, []);

	return (
		<>
			<button
				className={`hamburger${open || closing ? ' hidden' : ''}`}
				onClick={toggle}
				aria-label="Open menu"
				aria-expanded={open}
				data-wireframe-track
			>
				<span className="line" />
				<span className="line" />
				<span className="line" />
				<span className="line" />
			</button>

			<nav
				className={`overlay${open || closing ? ' active' : ''}`}
				onMouseLeave={() => !closing && cancelHover()}
			>
				<div
					className="grid"
					style={{
						gridTemplateColumns: grid.cols,
						gridTemplateRows: grid.rows,
					}}
				>
					{LINKS.map(({ label, href, area, bg }) => (
						<a
							key={label}
							href={href}
							className={`grid-cell ${area}${hovered === area ? ' expanded' : ''}${hovered !== null && hovered !== area ? ' dimmed' : ''}`}
							onMouseEnter={() => !closing && scheduleHover(area)}
							onClick={toggle}
							data-wireframe-track
						>
							<div className={`cell-bg${hovered === area ? ' visible' : ''}`}>
								<img
									src={bg}
									alt=""
									loading="eager"
									decoding="async"
									draggable={false}
								/>
							</div>
							<div className="cell-inner">
								<span className="cell-label">{label}</span>
								<span className="cell-num">{NUM[area]}</span>
							</div>
						</a>
					))}

					<button
						className="close-cell"
						style={{
							top: `${grid.cp.top}%`,
							left: `${grid.cp.left}%`,
						}}
						onClick={handleClose}
						aria-label="Close menu"
						data-wireframe-track
					>
						<span className="x-line" />
						<span className="x-line" />
					</button>
				</div>
			</nav>

			{closing && <div className="close-blocker" />}
		</>
	);
}
