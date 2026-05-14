import { useVirtualizer } from "@tanstack/react-virtual";
import type { RenderModalCtx } from "datocms-plugin-sdk";
import { Button, Canvas, Spinner, TextInput } from "datocms-react-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BunnyAsset, PluginParams, SelectionMode, StorageObject } from "../types";
import {
	buildCdnUrl,
	buildThumbnailUrl,
	formatFileSize,
	getContentType,
	getStorageBaseUrl,
	hasRequiredPluginParams,
	isBunnyAsset,
	isImageFile,
	isMediaFile,
} from "../types";
import s from "./BunnyPickerModal.module.css";
import SmoothThumbnail from "./SmoothThumbnail";

const MEDIA_CARD_MIN_WIDTH = 240;
const MEDIA_CARD_HEIGHT = 238;
const MEDIA_GRID_GAP = 24;
const STANDARD_ROW_HEIGHT = 48;
const ROW_GAP = 8;
const EMPTY_ROW_HEIGHT = 220;
const VIRTUAL_OVERSCAN = 4;

type Props = {
	ctx: RenderModalCtx;
};

type UploadingFile = {
	name: string;
	progress: "uploading" | "done" | "error";
	error?: string;
};

type ModalParameters = {
	selectionMode?: SelectionMode;
	selectedAssets?: unknown;
};

type VirtualPickerRow =
	| { type: "parent"; key: string }
	| { type: "folder"; key: string; folder: StorageObject }
	| { type: "media"; key: string; files: StorageObject[] }
	| { type: "file"; key: string; file: StorageObject }
	| { type: "empty"; key: string };

export default function BunnyPickerModal({ ctx }: Props) {
	const params = ctx.plugin.attributes.parameters as Partial<PluginParams>;
	const modalParams = ctx.parameters as ModalParameters;
	const selectionMode: SelectionMode =
		modalParams.selectionMode === "multiple" ? "multiple" : "single";
	const initialSelectedAssets =
		selectionMode === "multiple" && Array.isArray(modalParams.selectedAssets)
			? modalParams.selectedAssets.filter(isBunnyAsset)
			: [];
	const storageConfig = hasRequiredPluginParams(params) ? params : null;
	const isConfigured = Boolean(storageConfig);
	const storageZoneName = storageConfig?.storageZoneName || "";
	const storageApiKey = storageConfig?.storageApiKey || "";
	const cdnHostname = storageConfig?.cdnHostname || "";
	const storageRegion = storageConfig?.storageRegion || "";
	const storageHostSuffix = storageConfig?.useCustomHostSuffix
		? storageConfig.storageHostSuffix || ""
		: "";
	const s3Enabled = Boolean(storageConfig?.s3Enabled);

	const [files, setFiles] = useState<StorageObject[]>([]);
	const [loading, setLoading] = useState(isConfigured);
	const [error, setError] = useState<string | null>(null);
	const [currentPath, setCurrentPath] = useState("/");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedAssets, setSelectedAssets] = useState<BunnyAsset[]>(initialSelectedAssets);
	const [uploading, setUploading] = useState<UploadingFile[]>([]);
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const [listWidth, setListWidth] = useState(0);

	const storageBaseUrl = isConfigured
		? getStorageBaseUrl(storageRegion, storageHostSuffix, s3Enabled)
		: "";
	const isUploading = uploading.some((u) => u.progress === "uploading");

	const fetchFiles = useCallback(
		async (path: string) => {
			if (!isConfigured) {
				setLoading(false);
				return;
			}

			setLoading(true);
			setError(null);
			if (selectionMode === "single") {
				setSelectedAssets([]);
			}

			try {
				const url = `${storageBaseUrl}/${storageZoneName}/${path.replace(/^\//, "")}`;
				const response = await fetch(url, {
					headers: { AccessKey: storageApiKey },
				});

				if (!response.ok) {
					throw new Error(`Failed to list files (${response.status})`);
				}

				const data: StorageObject[] = await response.json();
				setFiles(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load files");
			} finally {
				setLoading(false);
			}
		},
		[isConfigured, storageBaseUrl, storageZoneName, storageApiKey, selectionMode],
	);

	useEffect(() => {
		if (isConfigured) {
			fetchFiles(currentPath);
		} else {
			setLoading(false);
		}
	}, [currentPath, fetchFiles, isConfigured]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: deps re-attach observer when listRef element mounts/unmounts as render gates flip
	useEffect(() => {
		const element = listRef.current;
		if (!element) return;

		const updateWidth = () => {
			setListWidth(element.clientWidth);
		};

		updateWidth();

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			setListWidth(entry.contentRect.width);
		});

		observer.observe(element);

		return () => observer.disconnect();
	}, [error, isConfigured, loading]);

	const navigateToFolder = (folder: StorageObject) => {
		const newPath = `${folder.Path}${folder.ObjectName}/`.replace(`/${storageZoneName}/`, "/");
		setCurrentPath(newPath);
		setSearchQuery("");
	};

	const navigateUp = () => {
		const parts = currentPath.replace(/\/$/, "").split("/").filter(Boolean);
		parts.pop();
		setCurrentPath(parts.length > 0 ? `/${parts.join("/")}/` : "/");
		setSearchQuery("");
	};

	const getFilePath = (file: StorageObject): string => {
		return `${file.Path}${file.ObjectName}`.replace(`/${storageZoneName}/`, "");
	};

	const getAssetFromFile = (file: StorageObject): BunnyAsset => {
		const path = getFilePath(file);
		return {
			path,
			filename: file.ObjectName,
			size: file.Length,
			contentType: getContentType(file.ObjectName),
			url: buildCdnUrl(cdnHostname, path),
			guid: file.Guid,
			lastChanged: file.LastChanged,
		};
	};

	const isAssetSelected = (path: string): boolean => {
		return selectedAssets.some((asset) => asset.path === path);
	};

	const toggleAsset = (file: StorageObject) => {
		const asset = getAssetFromFile(file);

		if (selectionMode === "single") {
			setSelectedAssets([asset]);
			return;
		}

		setSelectedAssets((prev) =>
			prev.some((selected) => selected.path === asset.path)
				? prev.filter((selected) => selected.path !== asset.path)
				: [...prev, asset],
		);
	};

	const selectAsset = (file: StorageObject) => {
		ctx.resolve(getAssetFromFile(file));
	};

	const handleSelect = () => {
		if (selectionMode === "multiple") {
			if (selectedAssets.length > 0) {
				ctx.resolve(selectedAssets);
			}
			return;
		}

		if (selectedAssets[0]) {
			ctx.resolve(selectedAssets[0]);
		}
	};

	const uploadFile = async (file: File): Promise<void> => {
		const pathPrefix = currentPath.replace(/^\//, "");
		const uploadUrl = `${storageBaseUrl}/${storageZoneName}/${pathPrefix}${file.name}`;

		const response = await fetch(uploadUrl, {
			method: "PUT",
			headers: {
				AccessKey: storageApiKey,
				"Content-Type": getUploadContentType(file),
			},
			body: file,
		});

		if (!response.ok) {
			throw new Error(`Upload failed (${response.status})`);
		}
	};

	const handleUpload = async (fileList: FileList | File[]) => {
		if (!isConfigured) return;

		const filesToUpload = Array.from(fileList);
		if (filesToUpload.length === 0) return;

		const uploadState: UploadingFile[] = filesToUpload.map((f) => ({
			name: f.name,
			progress: "uploading",
		}));
		setUploading(uploadState);

		for (let i = 0; i < filesToUpload.length; i++) {
			try {
				await uploadFile(filesToUpload[i]);
				setUploading((prev) => prev.map((u, idx) => (idx === i ? { ...u, progress: "done" } : u)));
			} catch (err) {
				setUploading((prev) =>
					prev.map((u, idx) =>
						idx === i
							? {
									...u,
									progress: "error",
									error: err instanceof Error ? err.message : "Upload failed",
								}
							: u,
					),
				);
			}
		}

		await fetchFiles(currentPath);
		setTimeout(() => setUploading([]), 1500);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragging(false);
		if (e.dataTransfer.files.length > 0) {
			handleUpload(e.dataTransfer.files);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setDragging(false);
	};

	const hasSearchQuery = searchQuery.trim().length > 0;

	const filteredFiles = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();
		if (!hasSearchQuery) return files;

		return files.filter((file) => file.ObjectName.toLowerCase().includes(normalizedQuery));
	}, [files, hasSearchQuery, searchQuery]);

	const directories = useMemo(
		() => filteredFiles.filter((file) => file.IsDirectory),
		[filteredFiles],
	);

	const mediaFiles = useMemo(
		() => filteredFiles.filter((file) => !file.IsDirectory && isMediaFile(file.ObjectName)),
		[filteredFiles],
	);

	const otherFiles = useMemo(
		() => filteredFiles.filter((file) => !file.IsDirectory && !isMediaFile(file.ObjectName)),
		[filteredFiles],
	);
	const hasVisibleFiles = directories.length > 0 || mediaFiles.length > 0 || otherFiles.length > 0;

	const mediaColumns = useMemo(() => {
		const availableWidth = Math.max(0, listWidth - 4);
		return Math.max(
			1,
			Math.floor((availableWidth + MEDIA_GRID_GAP) / (MEDIA_CARD_MIN_WIDTH + MEDIA_GRID_GAP)),
		);
	}, [listWidth]);

	const virtualRows = useMemo<VirtualPickerRow[]>(() => {
		const rows: VirtualPickerRow[] = [];

		if (currentPath !== "/") {
			rows.push({ type: "parent", key: "parent-folder" });
		}

		for (const directory of directories) {
			rows.push({
				type: "folder",
				key: `folder-${directory.Guid}`,
				folder: directory,
			});
		}

		for (let index = 0; index < mediaFiles.length; index += mediaColumns) {
			rows.push({
				type: "media",
				key: `media-${index}`,
				files: mediaFiles.slice(index, index + mediaColumns),
			});
		}

		for (const file of otherFiles) {
			rows.push({ type: "file", key: `file-${file.Guid}`, file });
		}

		if (!hasVisibleFiles) {
			rows.push({ type: "empty", key: "empty-state" });
		}

		return rows;
	}, [currentPath, directories, hasVisibleFiles, mediaColumns, mediaFiles, otherFiles]);

	const virtualizer = useVirtualizer({
		count: virtualRows.length,
		getScrollElement: () => listRef.current,
		estimateSize: (index) => getVirtualRowSize(virtualRows[index]),
		overscan: VIRTUAL_OVERSCAN,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll to top when path/search change, virtualizer method ref is stable
	useEffect(() => {
		virtualizer.scrollToOffset(0);
	}, [currentPath, searchQuery]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when row layout changes, virtualizer method ref is stable
	useEffect(() => {
		virtualizer.measure();
	}, [currentPath, mediaColumns, searchQuery, virtualRows.length]);

	const breadcrumbs = currentPath
		.split("/")
		.filter(Boolean)
		.map((part, i, arr) => ({
			label: part,
			path: `/${arr.slice(0, i + 1).join("/")}/`,
		}));
	const selectedAsset = selectedAssets[0] || null;

	return (
		<Canvas ctx={ctx}>
			<div className={s.container}>
				<div className={s.toolbar}>
					<div className={s.breadcrumbs}>
						<a
							className={`${s.breadcrumb} ${s.storageBreadcrumb}`}
							href={getStorageDashboardUrl()}
							target="_blank"
							rel="noreferrer"
							onClick={() => setCurrentPath("/")}
							title="Open bunny.net Storage"
						>
							{storageZoneName || "Storage zone"}
						</a>
						{breadcrumbs.map((bc) => (
							<span key={bc.path}>
								<span className={s.breadcrumbSep}>/</span>
								<button
									type="button"
									className={s.breadcrumb}
									onClick={() => setCurrentPath(bc.path)}
								>
									{bc.label}
								</button>
							</span>
						))}
					</div>
					<div className={s.toolbarActions}>
						<div className={s.search}>
							<TextInput
								id="search"
								name="search"
								placeholder="Filter files..."
								value={searchQuery}
								onChange={(val) => setSearchQuery(val)}
							/>
						</div>
						<Button
							buttonType="primary"
							buttonSize="s"
							onClick={() => fileInputRef.current?.click()}
							disabled={!isConfigured || isUploading}
						>
							Upload
						</Button>
					</div>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					multiple
					style={{ display: "none" }}
					onChange={(e) => {
						if (e.target.files) {
							handleUpload(e.target.files);
							e.target.value = "";
						}
					}}
				/>

				{uploading.length > 0 && (
					<div className={s.uploadStatus}>
						{uploading.map((u) => (
							<div key={u.name} className={s.uploadItem}>
								<span className={s.uploadName}>{u.name}</span>
								{u.progress === "uploading" && <Spinner size={14} />}
								{u.progress === "done" && <span className={s.uploadDone}>Uploaded</span>}
								{u.progress === "error" && <span className={s.uploadError}>{u.error}</span>}
							</div>
						))}
					</div>
				)}

				{!isConfigured && (
					<div className={s.configMessage}>
						<div className={s.configTitle}>bunny.net is not configured</div>
						<div className={s.configText}>
							Add the storage zone, storage API key, CDN hostname, and region in the plugin settings
							before choosing an asset.
						</div>
					</div>
				)}

				{isConfigured && loading && (
					<div className={s.loading}>
						<Spinner size={48} placement="centered" />
					</div>
				)}

				{isConfigured && error && <div className={s.error}>{error}</div>}

				{isConfigured && !loading && !error && (
					<section
						ref={listRef}
						className={`${s.fileList} ${dragging ? s.fileListDragging : ""}`}
						aria-label="File list. Drop files here to upload."
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
					>
						{dragging && <div className={s.dropOverlay}>Drop files to upload to this folder</div>}
						<div className={s.virtualContent} style={{ height: `${virtualizer.getTotalSize()}px` }}>
							{virtualizer.getVirtualItems().map((virtualItem) => {
								const row = virtualRows[virtualItem.index];
								if (!row) return null;

								return (
									<div
										key={row.key}
										className={s.virtualItem}
										style={{
											height: `${virtualItem.size}px`,
											transform: `translateY(${virtualItem.start}px)`,
										}}
									>
										{row.type === "parent" && (
											<button type="button" className={s.folderItem} onClick={navigateUp}>
												<span className={s.rowIcon}>&#8592;</span>
												<span className={s.rowText}>
													<span className={s.fileName}>Parent folder</span>
													<span className={s.fileSize}>Go up one level</span>
												</span>
											</button>
										)}

										{row.type === "folder" && (
											<button
												type="button"
												className={s.folderItem}
												onClick={() => navigateToFolder(row.folder)}
											>
												<span className={s.rowIcon}>
													<FolderIcon />
												</span>
												<span className={s.rowText}>
													<span className={s.fileName}>{row.folder.ObjectName}</span>
													<span className={s.fileSize}>Folder</span>
												</span>
											</button>
										)}

										{row.type === "media" && (
											<div
												className={s.mediaRow}
												style={{
													gridTemplateColumns: `repeat(${mediaColumns}, minmax(0, 1fr))`,
												}}
											>
												{row.files.map((file) => {
													const filePath = getFilePath(file);
													const selected = isAssetSelected(filePath);

													return (
														<button
															type="button"
															key={file.Guid}
															className={`${s.fileItem} ${selected ? s.selected : ""}`}
															onClick={(event) => {
																if (selectionMode === "multiple" && event.detail > 1) {
																	return;
																}
																toggleAsset(file);
															}}
															onDoubleClick={(event) => {
																if (selectionMode === "multiple") {
																	event.preventDefault();
																	return;
																}
																selectAsset(file);
															}}
														>
															<div className={s.mediaPreview}>
																{isImageFile(file.ObjectName) ? (
																	<SmoothThumbnail
																		src={buildThumbnailUrl(cdnHostname, filePath, {
																			width: 480,
																			height: 360,
																			quality: 75,
																		})}
																		alt={file.ObjectName}
																		frameClassName={s.thumbnailFrame}
																		imageClassName={s.thumbnail}
																		loadedClassName={s.thumbnailLoaded}
																		errorClassName={s.thumbnailError}
																		fallback={<FileIcon />}
																		loading="lazy"
																	/>
																) : (
																	<div className={s.videoThumb}>
																		<PlayIcon />
																	</div>
																)}
															</div>
															<div className={s.mediaFooter}>
																<span
																	className={`${s.selectionBox} ${
																		selected ? s.selectionBoxSelected : ""
																	}`}
																	aria-hidden="true"
																>
																	{selected ? "✓" : ""}
																</span>
																<span className={s.mediaName}>{file.ObjectName}</span>
															</div>
														</button>
													);
												})}
											</div>
										)}

										{row.type === "file" &&
											(() => {
												const selected = isAssetSelected(getFilePath(row.file));

												return (
													<button
														type="button"
														className={`${s.rowItem} ${selected ? s.selected : ""}`}
														onClick={(event) => {
															if (selectionMode === "multiple" && event.detail > 1) {
																return;
															}
															toggleAsset(row.file);
														}}
														onDoubleClick={(event) => {
															if (selectionMode === "multiple") {
																event.preventDefault();
																return;
															}
															selectAsset(row.file);
														}}
													>
														<span className={s.rowIcon}>
															<FileIcon />
														</span>
														<span
															className={`${s.selectionBox} ${
																selected ? s.selectionBoxSelected : ""
															}`}
															aria-hidden="true"
														>
															{selected ? "✓" : ""}
														</span>
														<span className={s.rowText}>
															<span className={s.fileName}>{row.file.ObjectName}</span>
															<span className={s.fileSize}>
																{formatFileSize(row.file.Length)} ·{" "}
																{getContentType(row.file.ObjectName)}
															</span>
														</span>
													</button>
												);
											})()}

										{row.type === "empty" && (
											<div className={s.empty}>
												<div className={s.emptyTitle}>
													{hasSearchQuery ? "No files match your search" : "This folder is empty"}
												</div>
												<div className={s.emptyText}>
													{hasSearchQuery
														? "Try a different filename or clear the filter."
														: "Upload files to add them to this folder."}
												</div>
												{!hasSearchQuery && (
													<Button
														buttonType="primary"
														buttonSize="s"
														onClick={() => fileInputRef.current?.click()}
														disabled={isUploading}
													>
														Upload files
													</Button>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</section>
				)}

				<div className={s.footer}>
					<div className={s.selectedInfo}>
						{selectionMode === "multiple" ? (
							<>
								<strong>
									{selectedAssets.length} {selectedAssets.length === 1 ? "asset" : "assets"}{" "}
									selected
								</strong>
								<span>Click assets to add or remove them from the selection.</span>
							</>
						) : selectedAsset ? (
							<>
								<strong>{selectedAsset.filename}</strong>
								<span>
									{formatFileSize(selectedAsset.size)}
									{selectedAsset.contentType !== "application/octet-stream" &&
										` · ${selectedAsset.contentType}`}
								</span>
							</>
						) : (
							<>
								<strong>No asset selected</strong>
								<span>Select a file or double-click one to choose it.</span>
							</>
						)}
					</div>
					<Button
						buttonType="primary"
						onClick={handleSelect}
						disabled={selectedAssets.length === 0}
					>
						{selectionMode === "multiple"
							? `Select ${selectedAssets.length} ${
									selectedAssets.length === 1 ? "asset" : "assets"
								}`
							: "Select asset"}
					</Button>
				</div>
			</div>
		</Canvas>
	);
}

function getUploadContentType(file: File): string {
	return file.type || getContentType(file.name);
}

function getStorageDashboardUrl(): string {
	return "https://dash.bunny.net/storage";
}

function getVirtualRowSize(row: VirtualPickerRow | undefined): number {
	if (!row) return STANDARD_ROW_HEIGHT;

	switch (row.type) {
		case "media":
			return MEDIA_CARD_HEIGHT + ROW_GAP;
		case "empty":
			return EMPTY_ROW_HEIGHT + ROW_GAP;
		case "parent":
		case "folder":
		case "file":
			return STANDARD_ROW_HEIGHT + ROW_GAP;
	}
}

function FolderIcon() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden="true"
		>
			<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
		</svg>
	);
}

function FileIcon() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden="true"
		>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	);
}

function PlayIcon() {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M8 5v14l11-7z" />
		</svg>
	);
}
