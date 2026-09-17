import { useState, useCallback, useMemo, useEffect } from 'react';

const LINKS = [
	{ label: 'Home', href: '/', area: 'tl' },
	{ label: 'About', href: '/about', area: 'tr' },
	{ label: 'Work', href: '/work', area: 'bl' },
	{ label: 'Contact', href: '/contact', area: 'br' },
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

export default function Hamburger() {
	const [open, setOpen] = useState(false);
	const [hovered, setHovered] = useState<Area | null>(null);
	const [closing, setClosing] = useState(false);

	const handleClose = useCallback(() => {
		setHovered(null);
		setClosing(true);
		document.body.style.overflow = '';
	}, []);

	useEffect(() => {
		if (!closing) return;
		const id = setTimeout(() => {
			setClosing(false);
			setOpen(false);
		}, 450);
		return () => clearTimeout(id);
	}, [closing]);

	const toggle = useCallback(() => {
		setOpen((prev) => {
			const next = !prev;
			document.body.style.overflow = next ? 'hidden' : '';
			if (!next) setHovered(null);
			return next;
		});
	}, []);

	const grid = useMemo(() => (hovered ? HOVER[hovered] : IDLE), [hovered]);

	return (
		<>
			<button
				className={`hamburger${open || closing ? ' hidden' : ''}`}
				onClick={toggle}
				aria-label="Open menu"
				aria-expanded={open}
			>
				<span className="line" />
				<span className="line" />
				<span className="line" />
				<span className="line" />
			</button>

			<nav
				className={`overlay${open || closing ? ' active' : ''}`}
				onMouseLeave={() => !closing && setHovered(null)}
			>
				<div
					className="grid"
					style={{
						gridTemplateColumns: grid.cols,
						gridTemplateRows: grid.rows,
					}}
				>
					{LINKS.map(({ label, href, area }) => (
						<a
							key={label}
							href={href}
							className={`grid-cell ${area}${hovered === area ? ' expanded' : ''}${hovered !== null && hovered !== area ? ' dimmed' : ''}`}
							onMouseEnter={() => !closing && setHovered(area)}
							onClick={toggle}
						>
							<div className={`cell-bg ${area}-bg${hovered === area ? ' visible' : ''}`} />
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
