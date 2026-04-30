import {
	type ImgHTMLAttributes,
	type ReactNode,
	type SyntheticEvent,
	useEffect,
	useRef,
	useState,
} from "react";

const loadedThumbnailUrls = new Set<string>();

type SmoothThumbnailStatus = "loading" | "loaded" | "error";

type SmoothThumbnailProps = {
	src: string;
	alt: string;
	frameClassName: string;
	imageClassName: string;
	loadedClassName: string;
	errorClassName?: string;
	fallback?: ReactNode;
	loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
};

export default function SmoothThumbnail({
	src,
	alt,
	frameClassName,
	imageClassName,
	loadedClassName,
	errorClassName,
	fallback,
	loading,
}: SmoothThumbnailProps) {
	const latestSrcRef = useRef(src);
	const [status, setStatus] = useState<SmoothThumbnailStatus>(() =>
		loadedThumbnailUrls.has(src) ? "loaded" : "loading",
	);

	useEffect(() => {
		latestSrcRef.current = src;
		setStatus(loadedThumbnailUrls.has(src) ? "loaded" : "loading");
	}, [src]);

	const handleLoad = async (event: SyntheticEvent<HTMLImageElement>) => {
		const loadedSrc = src;
		const image = event.currentTarget;

		if (typeof image.decode === "function") {
			await image.decode().catch(() => undefined);
		}

		loadedThumbnailUrls.add(loadedSrc);

		if (latestSrcRef.current === loadedSrc) {
			setStatus("loaded");
		}
	};

	const handleError = () => {
		if (latestSrcRef.current === src) {
			setStatus("error");
		}
	};

	const frameClassNames = [
		frameClassName,
		status === "loaded" ? loadedClassName : "",
		status === "error" ? errorClassName : "",
	]
		.filter(Boolean)
		.join(" ");

	if (status === "error") {
		return (
			<span className={frameClassNames} role="img" aria-label={alt}>
				{fallback}
			</span>
		);
	}

	return (
		<span className={frameClassNames}>
			<img
				src={src}
				alt={alt}
				className={imageClassName}
				loading={loading}
				decoding="async"
				onLoad={handleLoad}
				onError={handleError}
			/>
		</span>
	);
}
