import { connect } from "datocms-plugin-sdk";
import "datocms-react-ui/styles.css";
import ConfigScreen from "./entrypoints/ConfigScreen";
import BunnyFieldExtension from "./entrypoints/BunnyFieldExtension";
import BunnyPickerModal from "./entrypoints/BunnyPickerModal";
import { render } from "./utils/render";

const FIELD_EXTENSION_ID = "bunnyNetPicker";

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
		];
	},
	overrideFieldExtensions(field) {
		if (
			field.attributes.field_type !== "json" ||
			field.attributes.appearance.field_extension !== FIELD_EXTENSION_ID
		) {
			return;
		}

		return {
			editor: {
				id: FIELD_EXTENSION_ID,
			},
		};
	},
	renderFieldExtension(fieldExtensionId, ctx) {
		if (fieldExtensionId === FIELD_EXTENSION_ID) {
			render(<BunnyFieldExtension ctx={ctx} />);
		}
	},
	renderModal(modalId, ctx) {
		if (modalId === "bunnyPicker") {
			render(<BunnyPickerModal ctx={ctx} />);
		}
	},
});
