export type PluginParams = {
	storageZoneName: string;
	storageApiKey: string;
	cdnHostname: string;
	storageRegion: string;
};

export type BunnyAsset = {
	path: string;
	filename: string;
	size: number;
	contentType: string;
	width?: number;
	height?: number;
};

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
	switch (region) {
		case "ny":
			return "https://ny.storage.bunnycdn.com";
		case "la":
			return "https://la.storage.bunnycdn.com";
		case "sg":
			return "https://sg.storage.bunnycdn.com";
		case "syd":
			return "https://syd.storage.bunnycdn.com";
		default:
			return "https://storage.bunnycdn.com";
	}
}

export function buildCdnUrl(cdnHostname: string, path: string): string {
	return `https://${cdnHostname}/${path.replace(/^\//, "")}`;
}
