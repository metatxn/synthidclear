interface BrandMarkProps {
	className?: string;
}

/**
 * SynthIDClear geometric "Clean Frame / Precision Wipe" emblem:
 * Carbon Darkroom frame, Warm Archival Paper viewfinder corners, and a Vermilion
 * clear-sweep cutting through embedded metadata bars.
 */
export function BrandMark({ className = "h-7 w-7" }: BrandMarkProps) {
	return (
		<svg
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<rect
				x="1.5"
				y="1.5"
				width="61"
				height="61"
				rx="14.5"
				fill="#111110"
				stroke="#2E2D2A"
				strokeWidth="2.5"
			/>
			{/* Viewfinder corner brackets */}
			<path
				d="M15 24V17C15 15.8954 15.8954 15 17 15H24M40 15H47C48.1046 15 49 15.8954 49 17V24M15 40V47C15 48.1046 15.8954 49 17 49H24M40 49H47C48.1046 49 49 48.1046 49 47V40"
				stroke="#F6F5F1"
				strokeWidth="4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{/* Hidden metadata tag bars */}
			<rect x="20" y="22" width="19" height="4" rx="2" fill="#78756E" />
			<rect x="20" y="30" width="15" height="4" rx="2" fill="#78756E" />
			{/* Precision darkroom cutout + Vermilion wipe stroke */}
			<path
				d="M18 46L46 18"
				stroke="#111110"
				strokeWidth="9"
				strokeLinecap="round"
			/>
			<path
				d="M18 46L46 18"
				stroke="#E03E1A"
				strokeWidth="5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
