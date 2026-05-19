import { useEffect, useRef } from "react";

const BEAT_PATH =
	"M0,50 L30,50 L40,50 L45,10 L50,80 L55,20 L60,50 L70,50 L200,50";
const FLAT_PATH = "M0,50 L200,50";

export function EKG({ bpm = 80, status, color = "#c8ff00" }) {
	const pathRef = useRef(null);
	const isDead = status === "CHECK ON HIM" || status === "UNKNOWN";

	// BPM to animation duration: 60bpm = 1s per beat, 120bpm = 0.5s
	const duration = (60 / Math.max(bpm, 40)).toFixed(2);

	useEffect(() => {
		const path = pathRef.current;
		if (!path) return;

		const length = path.getTotalLength();
		path.style.strokeDasharray = length;
		path.style.strokeDashoffset = length;

		if (isDead) {
			// Flatline — no animation, just the flat line visible
			path.style.strokeDashoffset = 0;
			return;
		}

		let start = null;
		let animFrame;

		const animate = (timestamp) => {
			if (!start) start = timestamp;
			const elapsed = timestamp - start;
			const cycleMs = parseFloat(duration) * 1000;
			const progress = (elapsed % cycleMs) / cycleMs;
			path.style.strokeDashoffset = length * (1 - progress);
			animFrame = requestAnimationFrame(animate);
		};

		animFrame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animFrame);
	}, [bpm, isDead, duration]);

	return (
		<div className="w-full overflow-hidden">
			<svg
				viewBox="0 0 200 100"
				className="w-full"
				style={{ height: "60px" }}
				preserveAspectRatio="none"
			>
				<path
					ref={pathRef}
					d={isDead ? FLAT_PATH : BEAT_PATH}
					fill="none"
					stroke={isDead ? "#ff3b30" : color}
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					style={{ opacity: isDead ? 0.4 : 0.9 }}
				/>
			</svg>
		</div>
	);
}
