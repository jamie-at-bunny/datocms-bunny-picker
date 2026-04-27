import { useState, useEffect, useCallback, useRef } from "react";
import type { RenderModalCtx } from "datocms-plugin-sdk";
import { Canvas, Button, Spinner, TextInput } from "datocms-react-ui";
import type { PluginParams, StorageObject, BunnyAsset } from "../types";
import {
	getStorageBaseUrl,
	isImageFile,
	isMediaFile,
	formatFileSize,
	getContentType,
	buildCdnUrl,
} from "../types";
import s from "./BunnyPickerModal.module.css";

type Props = {
	ctx: RenderModalCtx;
};

type UploadingFile = {
	name: string;
	progress: "uploading" | "done" | "error";
	error?: string;
};

export default function BunnyPickerModal({ ctx }: Props) {
	const params = ctx.plugin.attributes.parameters as PluginParams;
	const { storageZoneName, storageApiKey, cdnHostname, storageRegion } = params;

	const [files, setFiles] = useState<StorageObject[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPath, setCurrentPath] = useState("/");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedFile, setSelectedFile] = useState<StorageObject | null>(null);
	const [uploading, setUploading] = useState<UploadingFile[]>([]);
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const storageBaseUrl = getStorageBaseUrl(storageRegion);

	const fetchFiles = useCallback(
		async (path: string) => {
			setLoading(true);
			setError(null);
			setSelectedFile(null);

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
				setError(
					err instanceof Error ? err.message : "Failed to load files",
				);
			} finally {
				setLoading(false);
			}
		},
		[storageBaseUrl, storageZoneName, storageApiKey],
	);

	useEffect(() => {
		fetchFiles(currentPath);
	}, [currentPath, fetchFiles]);

	const navigateToFolder = (folder: StorageObject) => {
		const newPath = `${folder.Path}${folder.ObjectName}/`.replace(
			`/${storageZoneName}/`,
			"/",
		);
		setCurrentPath(newPath);
		setSearchQuery("");
	};

	const navigateUp = () => {
		const parts = currentPath.replace(/\/$/, "").split("/").filter(Boolean);
		parts.pop();
		setCurrentPath(parts.length > 0 ? `/${parts.join("/")}/` : "/");
		setSearchQuery("");
	};

	const selectAsset = (file: StorageObject) => {
		const filePath = `${file.Path}${file.ObjectName}`.replace(
			`/${storageZoneName}/`,
			"",
		);

		const asset: BunnyAsset = {
			path: filePath,
			filename: file.ObjectName,
			size: file.Length,
			contentType: getContentType(file.ObjectName),
		};

		ctx.resolve(asset);
	};

	const handleSelect = () => {
		if (selectedFile) {
			selectAsset(selectedFile);
		}
	};

	const uploadFile = async (file: File): Promise<void> => {
		const pathPrefix = currentPath.replace(/^\//, "");
		const uploadUrl = `${storageBaseUrl}/${storageZoneName}/${pathPrefix}${file.name}`;

		const response = await fetch(uploadUrl, {
			method: "PUT",
			headers: {
				AccessKey: storageApiKey,
				"Content-Type": "application/octet-stream",
			},
			body: file,
		});

		if (!response.ok) {
			throw new Error(`Upload failed (${response.status})`);
		}
	};

	const handleUpload = async (fileList: FileList | File[]) => {
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
				setUploading((prev) =>
					prev.map((u, idx) =>
						idx === i ? { ...u, progress: "done" } : u,
					),
				);
			} catch (err) {
				setUploading((prev) =>
					prev.map((u, idx) =>
						idx === i
							? {
									...u,
									progress: "error",
									error:
										err instanceof Error
											? err.message
											: "Upload failed",
								}
							: u,
					),
				);
			}
		}

		// Refresh file list after all uploads complete
		await fetchFiles(currentPath);
		// Clear upload state after a short delay so user sees the results
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

	const filteredFiles = files.filter((file) => {
		if (!searchQuery) return true;
		return file.ObjectName.toLowerCase().includes(searchQuery.toLowerCase());
	});

	const directories = filteredFiles.filter((f) => f.IsDirectory);
	const mediaFiles = filteredFiles.filter(
		(f) => !f.IsDirectory && isMediaFile(f.ObjectName),
	);
	const otherFiles = filteredFiles.filter(
		(f) => !f.IsDirectory && !isMediaFile(f.ObjectName),
	);

	const breadcrumbs = currentPath
		.split("/")
		.filter(Boolean)
		.map((part, i, arr) => ({
			label: part,
			path: `/${arr.slice(0, i + 1).join("/")}/`,
		}));

	return (
		<Canvas ctx={ctx}>
			<div className={s.container}>
				<div className={s.toolbar}>
					<div className={s.breadcrumbs}>
						<button
							type="button"
							className={s.breadcrumb}
							onClick={() => setCurrentPath("/")}
						>
							{storageZoneName}
						</button>
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
						disabled={uploading.some((u) => u.progress === "uploading")}
					>
						Upload
					</Button>
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
								{u.progress === "uploading" && (
									<Spinner size={14} />
								)}
								{u.progress === "done" && (
									<span className={s.uploadDone}>Uploaded</span>
								)}
								{u.progress === "error" && (
									<span className={s.uploadError}>{u.error}</span>
								)}
							</div>
						))}
					</div>
				)}

				{loading && (
					<div className={s.loading}>
						<Spinner size={48} placement="centered" />
					</div>
				)}

				{error && <div className={s.error}>{error}</div>}

				{!loading && !error && (
					<div
						className={`${s.fileList} ${dragging ? s.fileListDragging : ""}`}
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
					>
						{dragging && (
							<div className={s.dropOverlay}>
								Drop files to upload to this folder
							</div>
						)}
						{currentPath !== "/" && (
							<button
								type="button"
								className={s.folderItem}
								onClick={navigateUp}
							>
								<span className={s.folderIcon}>&#8592;</span>
								<span className={s.fileName}>..</span>
							</button>
						)}

						{directories.map((dir) => (
							<button
								type="button"
								key={dir.Guid}
								className={s.folderItem}
								onClick={() => navigateToFolder(dir)}
							>
								<span className={s.folderIcon}>
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
									</svg>
								</span>
								<span className={s.fileName}>{dir.ObjectName}</span>
							</button>
						))}

						{mediaFiles.map((file) => {
							const filePath = `${file.Path}${file.ObjectName}`.replace(
								`/${storageZoneName}/`,
								"",
							);

							return (
								<button
									type="button"
									key={file.Guid}
									className={`${s.fileItem} ${selectedFile?.Guid === file.Guid ? s.selected : ""}`}
									onClick={() => setSelectedFile(file)}
									onDoubleClick={() => selectAsset(file)}
								>
									{isImageFile(file.ObjectName) ? (
										<img
											src={buildCdnUrl(cdnHostname, filePath)}
											alt={file.ObjectName}
											className={s.thumbnail}
											loading="lazy"
										/>
									) : (
										<div className={s.videoThumb}>
											<svg
												width="24"
												height="24"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										</div>
									)}
									<div className={s.fileMeta}>
										<span className={s.fileName}>{file.ObjectName}</span>
										<span className={s.fileSize}>
											{formatFileSize(file.Length)}
										</span>
									</div>
								</button>
							);
						})}

						{otherFiles.map((file) => (
							<button
								type="button"
								key={file.Guid}
								className={`${s.fileItem} ${selectedFile?.Guid === file.Guid ? s.selected : ""}`}
								onClick={() => setSelectedFile(file)}
								onDoubleClick={() => selectAsset(file)}
							>
								<div className={s.genericThumb}>
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
										<polyline points="14 2 14 8 20 8" />
									</svg>
								</div>
								<div className={s.fileMeta}>
									<span className={s.fileName}>{file.ObjectName}</span>
									<span className={s.fileSize}>
										{formatFileSize(file.Length)}
									</span>
								</div>
							</button>
						))}

						{!loading &&
							directories.length === 0 &&
							mediaFiles.length === 0 &&
							otherFiles.length === 0 && (
								<div className={s.empty}>
									{searchQuery
										? "No files match your search"
										: "This folder is empty"}
								</div>
							)}
					</div>
				)}

				{selectedFile && (
					<div className={s.footer}>
						<div className={s.selectedInfo}>
							<strong>{selectedFile.ObjectName}</strong>
							<span>{formatFileSize(selectedFile.Length)}</span>
						</div>
						<Button buttonType="primary" onClick={handleSelect}>
							Select asset
						</Button>
					</div>
				)}
			</div>
		</Canvas>
	);
}
