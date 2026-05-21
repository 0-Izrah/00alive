import { useEffect, useRef, useState, useCallback } from "react";

const BEAT_PATH =
	"M0,50 C10,50 15,10 25,50 C35,90 40,50 50,50 C60,50 65,10 75,50 C85,90 90,50 100,50 C110,50 115,10 125,50 C135,90 140,50 150,50 C160,50 165,10 175,50 C185,90 190,50 200,50";
const MELLOW_PATH =
	"M0,50 C25,40 25,60 50,50 C75,40 75,60 100,50 C125,40 125,60 150,50 C175,40 175,60 200,50";
const ERRATIC_PATH =
	"M0,50 C10,-10 15,110 25,50 C35,-10 40,110 50,50 C60,-10 65,110 75,50 C85,-10 90,110 100,50 C110,-10 115,110 125,50 C135,-10 140,110 150,50 C160,-10 165,110 175,50 C185,-10 190,110 200,50";
const FLAT_PATH = "M0,50 C50,50 100,50 150,50 C175,50 190,50 200,50";
const NOISE_PATH =
	"M0,50 L10,20 L20,80 L30,10 L40,90 L50,50 L60,30 L70,70 L80,50 L90,40 L100,60 L110,50 L120,80 L130,20 L140,90 L150,10 L160,50 L170,70 L180,30 L190,50 L200,50";

export function EKG({
	bpm = 80,
	energy = 0.5,
	valence = 0.5,
	status,
	color = "#c8ff00",
}) {
	const pathRef = useRef(null);
	const rafRef = useRef(0);
	const startRef = useRef(null);

	const isDead = status === "CHECK ON HIM" || status === "UNKNOWN";
	const [isDying, setIsDying] = useState(false);
	const [displayPath, setDisplayPath] = useState(BEAT_PATH);

	let targetPath = BEAT_PATH;
	let strokeW = "1.5";
	let isMellow = false;

	if (isDead && !isDying) {
		targetPath = FLAT_PATH;
	} else if (isDying) {
		targetPath = NOISE_PATH;
	} else if (energy < 0.45) {
		targetPath = MELLOW_PATH;
		strokeW = "2.5";
		isMellow = true;
	} else if (energy >= 0.6 && valence < 0.4) {
		targetPath = ERRATIC_PATH;
		strokeW = "2.0";
	}

	useEffect(() => {
		if (isDead && displayPath !== FLAT_PATH && displayPath !== NOISE_PATH) {
			setIsDying(true);
			const timer = setTimeout(() => setIsDying(false), 1200);
			return () => clearTimeout(timer);
		}
	}, [isDead, displayPath]);

	useEffect(() => {
		if (targetPath !== displayPath) {
			setDisplayPath(targetPath);
		}
	}, [targetPath]);

	const duration = (60 / Math.max(bpm, 40)) * (isMellow ? 1.5 : 1);

	const animate = useCallback(
		(timestamp) => {
			const path = pathRef.current;
			if (!path) return;

			if (!startRef.current) startRef.current = timestamp;
			const elapsed = timestamp - startRef.current;
			const cycleMs = duration * 1000;
			const progress = (elapsed % cycleMs) / cycleMs;

			const length = path.getTotalLength();
			path.style.strokeDasharray = `${length}`;
			path.style.strokeDashoffset = `${length * (1 - progress)}`;

			rafRef.current = requestAnimationFrame(animate);
		},
		[duration],
	);

	useEffect(() => {
		const path = pathRef.current;
		if (!path) return;

		cancelAnimationFrame(rafRef.current);
		startRef.current = null;

		if (isDead && !isDying) {
			path.style.strokeDashoffset = "0";
			path.style.strokeDasharray = "none";
			return;
		}

		// Defer measurement so the browser has painted the path (critical after d changes)
		const t = setTimeout(() => {
			const p = pathRef.current;
			if (!p) return;
			const length = p.getTotalLength();
			if (!length) return; // safety: don't animate if path isn't ready

			p.style.strokeDasharray = `${length}`;
			p.style.strokeDashoffset = `${length}`;
			rafRef.current = requestAnimationFrame(animate);
		}, 50);

		return () => {
			clearTimeout(t);
			cancelAnimationFrame(rafRef.current);
		};
	}, [bpm, isDead, isDying, duration, displayPath, animate]);

	return (
		<div className="w-full overflow-hidden" style={{ height: "60px" }}>
			<svg
				viewBox="0 0 200 100"
				className="w-full h-full"
				preserveAspectRatio="none"
			>
				<defs>
					<filter
						id="glow"
						x="-50%"
						y="-50%"
						width="200%"
						height="200%"
					>
						<feGaussianBlur stdDeviation="3" result="coloredBlur" />
						<feMerge>
							<feMergeNode in="coloredBlur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				{energy > 0.7 && !isDead && (
					<path
						d={displayPath}
						fill="none"
						stroke={color}
						strokeWidth="4"
						strokeLinecap="round"
						strokeLinejoin="round"
						style={{
							opacity: 0.15,
							filter: "blur(2px)",
							transition: "d 0.5s ease-in-out",
						}}
					/>
				)}

				<path
					ref={pathRef}
					d={displayPath}
					fill="none"
					stroke={isDead ? "#ff3b30" : color}
					strokeWidth={strokeW}
					strokeLinecap="round"
					strokeLinejoin="round"
					style={{
						opacity: isDead ? 0.4 : isDying ? 0.7 : 0.9,
						filter: isMellow && !isDead ? `url(#glow)` : "none",
						transition:
							"d 0.5s ease-in-out, stroke 0.3s ease, stroke-width 0.5s ease, opacity 0.3s ease",
					}}
				/>
			</svg>
		</div>
	);
}
