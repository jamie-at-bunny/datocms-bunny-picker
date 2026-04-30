import { connect } from "datocms-plugin-sdk";
import "datocms-react-ui/styles.css";
import BunnyFieldExtension from "./entrypoints/BunnyFieldExtension";
import BunnyPickerModal from "./entrypoints/BunnyPickerModal";
import ConfigScreen from "./entrypoints/ConfigScreen";
import { render } from "./utils/render";

const FIELD_EXTENSION_ID = "bunnyNetPicker";
const MULTIPLE_FIELD_EXTENSION_ID = "bunnyNetMultiPicker";

connect({
	renderConfigScreen(ctx) {
		render(<ConfigScreen ctx={ctx} />);
	},
	manualFieldExtensions() {
		return [
			{
				id: FIELD_EXTENSION_ID,
				name: "bunny.net Asset",
				type: "editor",
				fieldTypes: ["json"],
			},
			{
				id: MULTIPLE_FIELD_EXTENSION_ID,
				name: "bunny.net Assets",
				type: "editor",
				fieldTypes: ["json"],
			},
		];
	},
	overrideFieldExtensions(field) {
		const fieldExtension = field.attributes.appearance.field_extension;

		if (
			field.attributes.field_type !== "json" ||
			(fieldExtension !== FIELD_EXTENSION_ID && fieldExtension !== MULTIPLE_FIELD_EXTENSION_ID)
		) {
			return;
		}

		return {
			editor: {
				id: fieldExtension,
			},
		};
	},
	renderFieldExtension(fieldExtensionId, ctx) {
		if (fieldExtensionId === FIELD_EXTENSION_ID) {
			render(<BunnyFieldExtension ctx={ctx} selectionMode="single" />);
		}

		if (fieldExtensionId === MULTIPLE_FIELD_EXTENSION_ID) {
			render(<BunnyFieldExtension ctx={ctx} selectionMode="multiple" />);
		}
	},
	renderModal(modalId, ctx) {
		if (modalId === "bunnyPicker") {
			render(<BunnyPickerModal ctx={ctx} />);
		}
	},
});
