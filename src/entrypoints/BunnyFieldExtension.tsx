import type { RenderFieldExtensionCtx } from "datocms-plugin-sdk";
import { Canvas, Button } from "datocms-react-ui";
import type { PluginParams, BunnyAsset } from "../types";
import { isImageFile, formatFileSize, buildCdnUrl } from "../types";
import s from "./BunnyFieldExtension.module.css";

type Props = {
	ctx: RenderFieldExtensionCtx;
};

function getCurrentValue(ctx: RenderFieldExtensionCtx): BunnyAsset | null {
	const raw = ctx.formValues[ctx.fieldPath] as string | null | undefined;
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed && parsed.path ? parsed : null;
	} catch {
		return null;
	}
}

export default function BunnyFieldExtension({ ctx }: Props) {
	const params = ctx.plugin.attributes.parameters as PluginParams;
	const { cdnHostname } = params;
	const asset = getCurrentValue(ctx);

	ctx.startAutoResizer();

	const openPicker = async () => {
		const result = (await ctx.openModal({
			id: "bunnyPicker",
			title: "Select from bunny.net",
			width: "xl",
		})) as BunnyAsset | null;

		if (result) {
			await ctx.setFieldValue(ctx.fieldPath, JSON.stringify(result));
		}
	};

	const clearAsset = async () => {
		await ctx.setFieldValue(ctx.fieldPath, null);
	};

	if (!asset) {
		return (
			<Canvas ctx={ctx}>
				<div className={s.empty}>
					<Button buttonType="primary" onClick={openPicker}>
						Choose bunny.net asset
					</Button>
				</div>
			</Canvas>
		);
	}

	const cdnUrl = buildCdnUrl(cdnHostname, asset.path);
	const isImage = isImageFile(asset.filename);

	return (
		<Canvas ctx={ctx}>
			<div className={s.preview}>
				{isImage ? (
					<img
						src={cdnUrl}
						alt={asset.filename}
						className={s.previewImage}
					/>
				) : (
					<div className={s.previewFile}>
						<svg
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
					</div>
				)}
				<div className={s.meta}>
					<span className={s.filename}>{asset.filename}</span>
					<span className={s.details}>
						{formatFileSize(asset.size)}
						{asset.contentType !== "application/octet-stream" &&
							` \u00B7 ${asset.contentType}`}
					</span>
					<span className={s.path}>{cdnUrl}</span>
				</div>
				<div className={s.actions}>
					<Button buttonType="primary" buttonSize="s" onClick={openPicker}>
						Replace
					</Button>
					<Button buttonType="negative" buttonSize="s" onClick={clearAsset}>
						Clear
					</Button>
				</div>
			</div>
		</Canvas>
	);
}
