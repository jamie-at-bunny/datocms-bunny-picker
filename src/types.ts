export type PluginParams = {
	storageZoneName: string;
	storageApiKey: string;
	cdnHostname: string;
	storageRegion: string;
	useCustomHostSuffix?: boolean;
	storageHostSuffix?: string;
	s3Enabled?: boolean;
};

export const DEFAULT_STORAGE_HOST_SUFFIX = "bunnycdn.com";

export function hasRequiredPluginParams(params: Partial<PluginParams>): params is PluginParams {
	return Boolean(
		params.storageZoneName?.trim() &&
			params.storageApiKey?.trim() &&
			params.cdnHostname?.trim() &&
			params.storageRegion?.trim(),
	);
}

export type StorageRegionOption = {
	label: string;
	value: string;
	prefix: string;
	s3Available: boolean;
};

export const STORAGE_REGION_OPTIONS: StorageRegionOption[] = [
	{ label: "Frankfurt, DE", value: "de", prefix: "", s3Available: true },
	{ label: "London, UK", value: "uk", prefix: "uk", s3Available: false },
	{ label: "New York, US", value: "ny", prefix: "ny", s3Available: true },
	{ label: "Los Angeles, US", value: "la", prefix: "la", s3Available: false },
	{ label: "Singapore, SG", value: "sg", prefix: "sg", s3Available: true },
	{ label: "Stockholm, SE", value: "se", prefix: "se", s3Available: false },
	{ label: "São Paulo, BR", value: "br", prefix: "br", s3Available: false },
	{ label: "Johannesburg, ZA", value: "jh", prefix: "jh", s3Available: false },
	{ label: "Sydney, AU", value: "syd", prefix: "syd", s3Available: false },
];

export const S3_STORAGE_REGION_OPTIONS: StorageRegionOption[] = STORAGE_REGION_OPTIONS.filter(
	(option) => option.s3Available,
);

export const DEFAULT_S3_REGION = "de";

export function getStorageRegionOption(region: string): StorageRegionOption {
	return (
		STORAGE_REGION_OPTIONS.find((option) => option.value === region) || STORAGE_REGION_OPTIONS[0]
	);
}

export type BunnyAsset = {
	path: string;
	filename: string;
	size: number;
	contentType: string;
	url: string;
	guid: string;
	lastChanged: string;
	width?: number;
	height?: number;
};

export type SelectionMode = "single" | "multiple";

export type BunnyPickerResult = BunnyAsset | BunnyAsset[] | null;

export function isBunnyAsset(value: unknown): value is BunnyAsset {
	return (
		typeof value === "object" &&
		value !== null &&
		"path" in value &&
		typeof value.path === "string" &&
		"filename" in value &&
		typeof value.filename === "string" &&
		"size" in value &&
		typeof value.size === "number" &&
		"contentType" in value &&
		typeof value.contentType === "string" &&
		"url" in value &&
		typeof value.url === "string" &&
		"guid" in value &&
		typeof value.guid === "string" &&
		"lastChanged" in value &&
		typeof value.lastChanged === "string"
	);
}

export function parseStoredSingleAsset(value: unknown): BunnyAsset | null {
	if (!value) return null;

	try {
		const parsed = typeof value === "string" ? JSON.parse(value) : value;
		return isBunnyAsset(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function parseStoredMultipleAssets(value: unknown): BunnyAsset[] {
	if (!value) return [];

	try {
		const parsed = typeof value === "string" ? JSON.parse(value) : value;
		return Array.isArray(parsed) ? parsed.filter(isBunnyAsset) : [];
	} catch {
		return [];
	}
}

export type StorageObject = {
	Guid: string;
	StorageZoneName: string;
	Path: string;
	ObjectName: string;
	Length: number;
	LastChanged: string;
	IsDirectory: boolean;
	ServerId: number;
	DateCreated: string;
	StorageZoneId: number;
};

const IMAGE_EXTENSIONS: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".bmp": "image/bmp",
	".avif": "image/avif",
	".ico": "image/x-icon",
};

const VIDEO_EXTENSIONS: Record<string, string> = {
	".mp4": "video/mp4",
	".webm": "video/webm",
	".mov": "video/quicktime",
	".avi": "video/x-msvideo",
	".mkv": "video/x-matroska",
	".ogg": "video/ogg",
};

const ALL_MEDIA: Record<string, string> = {
	...IMAGE_EXTENSIONS,
	...VIDEO_EXTENSIONS,
};

export function getExtension(filename: string): string {
	const dot = filename.lastIndexOf(".");
	return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export function getContentType(filename: string): string {
	return ALL_MEDIA[getExtension(filename)] || "application/octet-stream";
}

export function isImageFile(filename: string): boolean {
	return getExtension(filename) in IMAGE_EXTENSIONS;
}

export function isMediaFile(filename: string): boolean {
	return getExtension(filename) in ALL_MEDIA;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizeStorageHostSuffix(suffix: string | undefined): string {
	const trimmed = (suffix ?? "")
		.trim()
		.replace(/^https?:\/\//, "")
		.replace(/\/.*$/, "")
		.replace(/\.+$/, "");
	return trimmed || DEFAULT_STORAGE_HOST_SUFFIX;
}

export function getStorageBaseUrl(
	region: string,
	hostSuffix?: string,
	s3Enabled?: boolean,
): string {
	const { prefix } = getStorageRegionOption(region);
	const suffix = normalizeStorageHostSuffix(hostSuffix);
	if (s3Enabled) {
		return `https://${prefix ? `${prefix}-s3` : "s3"}.storage.${suffix}`;
	}
	return `https://${prefix ? `${prefix}.` : ""}storage.${suffix}`;
}

export function buildCdnUrl(cdnHostname: string, path: string): string {
	return `https://${cdnHostname}/${path.replace(/^\//, "")}`;
}

export type ThumbnailOptions = {
	width: number;
	height: number;
	quality: number;
};

export function buildThumbnailUrl(
	cdnHostname: string,
	path: string,
	{ width, height, quality }: ThumbnailOptions,
): string {
	const cdnUrl = buildCdnUrl(cdnHostname, path);

	try {
		const url = new URL(cdnUrl);
		url.searchParams.set("width", String(width));
		url.searchParams.set("height", String(height));
		url.searchParams.set("quality", String(quality));
		return url.toString();
	} catch {
		return `${cdnUrl}?width=${width}&height=${height}&quality=${quality}`;
	}
}
