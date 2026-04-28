import type { RenderFieldExtensionCtx } from "datocms-plugin-sdk";
import { Canvas, Button } from "datocms-react-ui";
import get from "lodash-es/get";
import type {
	PluginParams,
	BunnyAsset,
	SelectionMode,
	BunnyPickerResult,
} from "../types";
import {
	isImageFile,
	formatFileSize,
	buildCdnUrl,
	buildThumbnailUrl,
	hasRequiredPluginParams,
	parseStoredSingleAsset,
	parseStoredMultipleAssets,
} from "../types";
import SmoothThumbnail from "./SmoothThumbnail";
import s from "./BunnyFieldExtension.module.css";

type Props = {
	ctx: RenderFieldExtensionCtx;
	selectionMode: SelectionMode;
};

export default function BunnyFieldExtension({ ctx, selectionMode }: Props) {
	const params = ctx.plugin.attributes.parameters as Partial<PluginParams>;
	const pluginConfig = hasRequiredPluginParams(params) ? params : null;
	const isConfigured = Boolean(pluginConfig);
	const cdnHostname = pluginConfig?.cdnHostname || "";
	const rawValue = get(ctx.formValues, ctx.fieldPath);
	const singleAsset = parseStoredSingleAsset(rawValue);
	const multipleAssets = parseStoredMultipleAssets(rawValue);
	const selectedAssets =
		selectionMode === "multiple"
			? multipleAssets
			: singleAsset
				? [singleAsset]
				: [];

	ctx.startAutoResizer();

	const openPicker = async () => {
		const result = (await ctx.openModal({
			id: "bunnyPicker",
			title: "Select from bunny.net",
			width: "xl",
			parameters: {
				selectionMode,
				selectedAssets:
					selectionMode === "multiple" ? selectedAssets : undefined,
			},
		})) as BunnyPickerResult;

		if (!result) return;

		if (selectionMode === "multiple") {
			if (Array.isArray(result)) {
				await ctx.setFieldValue(ctx.fieldPath, JSON.stringify(result));
			}
			return;
		}

		if (!Array.isArray(result)) {
			await ctx.setFieldValue(ctx.fieldPath, JSON.stringify(result));
		}
	};

	const clearAsset = async () => {
		await ctx.setFieldValue(ctx.fieldPath, null);
	};

	const removeAsset = async (assetPath: string) => {
		if (selectionMode !== "multiple") return;

		const nextAssets = selectedAssets.filter(
			(asset) => asset.path !== assetPath,
		);

		await ctx.setFieldValue(
			ctx.fieldPath,
			nextAssets.length > 0 ? JSON.stringify(nextAssets) : null,
		);
	};

	if (!isConfigured) {
		return (
			<Canvas ctx={ctx}>
				<div className={s.assetBox}>
					<div className={s.emptyIcon}>
						<FileIcon />
					</div>
					<div className={s.meta}>
						<div className={s.filename}>bunny.net is not configured</div>
						<div className={s.details}>
							Add the storage zone, storage API key, CDN hostname, and
							region in the plugin settings.
						</div>
					</div>
				</div>
			</Canvas>
		);
	}

	if (selectionMode === "multiple") {
		return (
			<Canvas ctx={ctx}>
				<MultipleAssetField
					assets={selectedAssets}
					cdnHostname={cdnHostname}
					onOpenPicker={openPicker}
					onClear={clearAsset}
					onRemove={removeAsset}
				/>
			</Canvas>
		);
	}

	return (
		<Canvas ctx={ctx}>
			<SingleAssetField
				asset={singleAsset}
				cdnHostname={cdnHostname}
				onOpenPicker={openPicker}
				onClear={clearAsset}
			/>
		</Canvas>
	);
}

type SingleAssetFieldProps = {
	asset: BunnyAsset | null;
	cdnHostname: string;
	onOpenPicker: () => void;
	onClear: () => void;
};

function SingleAssetField({
	asset,
	cdnHostname,
	onOpenPicker,
	onClear,
}: SingleAssetFieldProps) {
	if (!asset) {
		return (
			<div className={s.assetBox}>
				<div className={s.emptyIcon}>
					<FileIcon />
				</div>
				<div className={s.meta}>
					<div className={s.filename}>No bunny.net asset selected</div>
					<div className={s.details}>
						Choose a file from your configured storage zone.
					</div>
				</div>
				<div className={s.actions}>
					<Button buttonType="primary" buttonSize="s" onClick={onOpenPicker}>
						Choose asset
					</Button>
				</div>
			</div>
		);
	}

	const cdnUrl = buildCdnUrl(cdnHostname, asset.path);

	return (
		<div className={s.assetBox}>
			<a
				className={s.thumbnailLink}
				href={cdnUrl}
				target="_blank"
				rel="noreferrer"
				title="Open asset"
			>
				<AssetThumbnail asset={asset} cdnHostname={cdnHostname} />
			</a>
			<div className={s.meta}>
				<a
					className={s.filenameLink}
					href={cdnUrl}
					target="_blank"
					rel="noreferrer"
					title="Open asset"
				>
					{asset.filename}
				</a>
				<div className={s.details}>{getAssetDetails(asset)}</div>
				<a
					className={s.pathLink}
					href={cdnUrl}
					target="_blank"
					rel="noreferrer"
					title="Open asset"
				>
					{cdnUrl}
				</a>
			</div>
			<div className={s.actions}>
				<Button buttonType="primary" buttonSize="s" onClick={onOpenPicker}>
					Replace
				</Button>
				<Button buttonType="muted" buttonSize="s" onClick={onClear}>
					Clear
				</Button>
			</div>
		</div>
	);
}

type MultipleAssetFieldProps = {
	assets: BunnyAsset[];
	cdnHostname: string;
	onOpenPicker: () => void;
	onClear: () => void;
	onRemove: (assetPath: string) => void;
};

function MultipleAssetField({
	assets,
	cdnHostname,
	onOpenPicker,
	onClear,
	onRemove,
}: MultipleAssetFieldProps) {
	if (assets.length === 0) {
		return (
			<div className={s.assetBox}>
				<div className={s.emptyIcon}>
					<FileIcon />
				</div>
				<div className={s.meta}>
					<div className={s.filename}>No bunny.net assets selected</div>
					<div className={s.details}>
						Choose one or more files from your configured storage zone.
					</div>
				</div>
				<div className={s.actions}>
					<Button buttonType="primary" buttonSize="s" onClick={onOpenPicker}>
						Choose assets
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={s.multiBox}>
			<div className={s.multiHeader}>
				<div className={s.meta}>
					<div className={s.filename}>
						{assets.length} bunny.net{" "}
						{assets.length === 1 ? "asset" : "assets"} selected
					</div>
					<div className={s.details}>
						Use Edit selection to add or remove files.
					</div>
				</div>
				<div className={s.actions}>
					<Button buttonType="primary" buttonSize="s" onClick={onOpenPicker}>
						Edit selection
					</Button>
					<Button buttonType="muted" buttonSize="s" onClick={onClear}>
						Clear
					</Button>
				</div>
			</div>
			<div className={s.assetList}>
				{assets.map((asset) => (
					<MultipleAssetListItem
						key={asset.path}
						asset={asset}
						cdnHostname={cdnHostname}
						onRemove={onRemove}
					/>
				))}
			</div>
		</div>
	);
}

type MultipleAssetListItemProps = {
	asset: BunnyAsset;
	cdnHostname: string;
	onRemove: (assetPath: string) => void;
};

function MultipleAssetListItem({
	asset,
	cdnHostname,
	onRemove,
}: MultipleAssetListItemProps) {
	const cdnUrl = buildCdnUrl(cdnHostname, asset.path);

	return (
		<div className={s.assetListItem}>
			<a
				className={s.thumbnailLink}
				href={cdnUrl}
				target="_blank"
				rel="noreferrer"
				title="Open asset"
			>
				<AssetThumbnail asset={asset} cdnHostname={cdnHostname} />
			</a>
			<div className={s.meta}>
				<a
					className={s.filenameLink}
					href={cdnUrl}
					target="_blank"
					rel="noreferrer"
					title="Open asset"
				>
					{asset.filename}
				</a>
				<div className={s.details}>{getAssetDetails(asset)}</div>
				<a
					className={s.pathLink}
					href={cdnUrl}
					target="_blank"
					rel="noreferrer"
					title="Open asset"
				>
					{cdnUrl}
				</a>
			</div>
			<Button
				buttonType="muted"
				buttonSize="s"
				onClick={() => onRemove(asset.path)}
			>
				Remove
			</Button>
		</div>
	);
}

type AssetThumbnailProps = {
	asset: BunnyAsset;
	cdnHostname: string;
};

function AssetThumbnail({ asset, cdnHostname }: AssetThumbnailProps) {
	if (isImageFile(asset.filename)) {
		return (
			<SmoothThumbnail
				src={buildThumbnailUrl(cdnHostname, asset.path, {
					width: 160,
					height: 120,
					quality: 75,
				})}
				alt={asset.filename}
				frameClassName={s.previewImageFrame}
				imageClassName={s.previewImage}
				loadedClassName={s.previewImageLoaded}
				errorClassName={s.previewImageError}
				fallback={<FileIcon />}
			/>
		);
	}

	return (
		<div className={s.previewFile}>
			<FileIcon />
		</div>
	);
}

function getAssetDetails(asset: BunnyAsset): string {
	return `${formatFileSize(asset.size)}${
		asset.contentType !== "application/octet-stream"
			? ` \u00B7 ${asset.contentType}`
			: ""
	}`;
}

function FileIcon() {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	);
}
