import type { RenderConfigScreenCtx } from "datocms-plugin-sdk";
import {
	Button,
	Canvas,
	FieldGroup,
	Form,
	SelectField,
	SwitchField,
	TextField,
} from "datocms-react-ui";
import { useState } from "react";
import type { PluginParams } from "../types";
import {
	DEFAULT_S3_REGION,
	DEFAULT_STORAGE_HOST_SUFFIX,
	getStorageBaseUrl,
	getStorageRegionOption,
	S3_STORAGE_REGION_OPTIONS,
	STORAGE_REGION_OPTIONS,
} from "../types";

type Props = {
	ctx: RenderConfigScreenCtx;
};

type ValidParams = PluginParams;

function getInitialParams(ctx: RenderConfigScreenCtx): ValidParams {
	const params = ctx.plugin.attributes.parameters as Partial<ValidParams>;
	return {
		storageZoneName: params.storageZoneName || "",
		storageApiKey: params.storageApiKey || "",
		cdnHostname: params.cdnHostname || "",
		storageRegion: getStorageRegionOption(params.storageRegion || "de").value,
		useCustomHostSuffix: params.useCustomHostSuffix ?? Boolean(params.storageHostSuffix?.trim()),
		storageHostSuffix: params.storageHostSuffix || "",
		s3Enabled: params.s3Enabled ?? false,
	};
}

export default function ConfigScreen({ ctx }: Props) {
	const [values, setValues] = useState<ValidParams>(getInitialParams(ctx));
	const [errors, setErrors] = useState<Partial<Record<keyof ValidParams, string>>>({});
	const [saving, setSaving] = useState(false);
	const [dirty, setDirty] = useState(false);

	const update = <K extends keyof ValidParams>(field: K, value: ValidParams[K]) => {
		setValues((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: undefined }));
		setDirty(true);
	};

	const validate = (): boolean => {
		const next: Partial<Record<keyof ValidParams, string>> = {};
		if (!values.storageZoneName) next.storageZoneName = "Required";
		if (!values.storageApiKey) next.storageApiKey = "Required";
		if (!values.cdnHostname) next.cdnHostname = "Required";
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const handleSubmit = async () => {
		if (!validate()) return;
		setSaving(true);
		try {
			await ctx.updatePluginParameters(values);
			setDirty(false);
			ctx.notice("Settings saved successfully!");
		} catch {
			ctx.alert("Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	const regionOptions = values.s3Enabled ? S3_STORAGE_REGION_OPTIONS : STORAGE_REGION_OPTIONS;
	const selectedRegion = getStorageRegionOption(values.storageRegion);

	return (
		<Canvas ctx={ctx}>
			<Form onSubmit={handleSubmit}>
				<FieldGroup>
					<TextField
						id="storageZoneName"
						name="storageZoneName"
						label="Storage Zone Name"
						hint="The name of your bunny.net storage zone"
						required
						value={values.storageZoneName}
						error={errors.storageZoneName}
						onChange={(val) => update("storageZoneName", val)}
					/>
					<TextField
						id="storageApiKey"
						name="storageApiKey"
						label="Storage API Key"
						hint="Found in your storage zone's FTP & API Access settings"
						required
						value={values.storageApiKey}
						error={errors.storageApiKey}
						textInputProps={{ monospaced: true }}
						onChange={(val) => update("storageApiKey", val)}
					/>
					<TextField
						id="cdnHostname"
						name="cdnHostname"
						label="CDN Hostname"
						hint={`Your pull zone hostname, e.g. myzone.b-cdn.net. Files will be served from https://${
							values.cdnHostname || "your-hostname.b-cdn.net"
						}/`}
						placeholder="myzone.b-cdn.net"
						required
						value={values.cdnHostname}
						error={errors.cdnHostname}
						onChange={(val) => update("cdnHostname", val)}
					/>
					<SelectField
						id="storageRegion"
						name="storageRegion"
						label="Storage Region"
						hint={`Storage API base URL: ${getStorageBaseUrl(
							values.storageRegion,
							values.useCustomHostSuffix ? values.storageHostSuffix : undefined,
							values.s3Enabled,
						)}`}
						value={selectedRegion}
						selectInputProps={{ options: regionOptions }}
						onChange={(option) => {
							if (option && "value" in option) {
								update("storageRegion", option.value);
							}
						}}
					/>
					<SwitchField
						id="s3Enabled"
						name="s3Enabled"
						label="This is an S3 Storage Zone"
						hint="Tick this if S3-compatible access is enabled for this zone in the bunny.net dashboard. S3 zones are only available in Frankfurt, New York, and Singapore."
						value={Boolean(values.s3Enabled)}
						onChange={(val) => {
							update("s3Enabled", val);
							if (val && !getStorageRegionOption(values.storageRegion).s3Available) {
								update("storageRegion", DEFAULT_S3_REGION);
							}
						}}
					/>
					<SwitchField
						id="useCustomHostSuffix"
						name="useCustomHostSuffix"
						label="Use custom storage host suffix"
						hint={`Advanced: point this plugin at a non-production deployment (default: ${DEFAULT_STORAGE_HOST_SUFFIX}).`}
						value={Boolean(values.useCustomHostSuffix)}
						onChange={(val) => update("useCustomHostSuffix", val)}
					/>
					{values.useCustomHostSuffix && (
						<TextField
							id="storageHostSuffix"
							name="storageHostSuffix"
							label="Storage host suffix"
							hint="The host suffix is combined with the selected region's prefix to form the API base URL shown above."
							placeholder={DEFAULT_STORAGE_HOST_SUFFIX}
							value={values.storageHostSuffix || ""}
							textInputProps={{ monospaced: true }}
							onChange={(val) => update("storageHostSuffix", val)}
						/>
					)}
				</FieldGroup>
				<Button
					type="submit"
					fullWidth
					buttonSize="l"
					buttonType="primary"
					disabled={saving || !dirty}
				>
					{saving ? "Saving..." : "Save settings"}
				</Button>
			</Form>
		</Canvas>
	);
}
