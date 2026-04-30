import type { RenderConfigScreenCtx } from "datocms-plugin-sdk";
import { Button, Canvas, FieldGroup, Form, SelectField, TextField } from "datocms-react-ui";
import { useState } from "react";
import type { PluginParams } from "../types";
import { getStorageBaseUrl, getStorageRegionOption, STORAGE_REGION_OPTIONS } from "../types";

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
	};
}

export default function ConfigScreen({ ctx }: Props) {
	const [values, setValues] = useState<ValidParams>(getInitialParams(ctx));
	const [errors, setErrors] = useState<Partial<Record<keyof ValidParams, string>>>({});
	const [saving, setSaving] = useState(false);
	const [dirty, setDirty] = useState(false);

	const update = (field: keyof ValidParams, value: string) => {
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
						hint={`Storage API base URL: ${getStorageBaseUrl(values.storageRegion)}`}
						value={selectedRegion}
						selectInputProps={{ options: STORAGE_REGION_OPTIONS }}
						onChange={(option) => {
							if (option && "value" in option) {
								update("storageRegion", option.value);
							}
						}}
					/>
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
