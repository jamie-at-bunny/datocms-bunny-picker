export type PluginParams = {
	storageZoneName: string;
	storageApiKey: string;
	cdnHostname: string;
	storageRegion: string;
};

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
	endpoint: string;
};

export const STORAGE_REGION_OPTIONS: StorageRegionOption[] = [
	{
		label: "Frankfurt, DE",
		value: "de",
		endpoint: "https://storage.bunnycdn.com",
	},
	{
		label: "London, UK",
		value: "uk",
		endpoint: "https://uk.storage.bunnycdn.com",
	},
	{
		label: "New York, US",
		value: "ny",
		endpoint: "https://ny.storage.bunnycdn.com",
	},
	{
		label: "Los Angeles, US",
		value: "la",
		endpoint: "https://la.storage.bunnycdn.com",
	},
	{
		label: "Singapore, SG",
		value: "sg",
		endpoint: "https://sg.storage.bunnycdn.com",
	},
	{
		label: "Stockholm, SE",
		value: "se",
		endpoint: "https://se.storage.bunnycdn.com",
	},
	{
		label: "São Paulo, BR",
		value: "br",
		endpoint: "https://br.storage.bunnycdn.com",
	},
	{
		label: "Johannesburg, ZA",
		value: "jh",
		endpoint: "https://jh.storage.bunnycdn.com",
	},
	{
		label: "Sydney, AU",
		value: "syd",
		endpoint: "https://syd.storage.bunnycdn.com",
	},
];

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

export function getStorageBaseUrl(region: string): string {
	return getStorageRegionOption(region).endpoint;
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
