# DatoCMS bunny.net Picker

Select files from a bunny.net Storage Zone inside DatoCMS and save the selected asset data in JSON fields.

## Features

- Browse bunny.net Storage folders from a DatoCMS field
- Search files in the current folder
- Upload files from the picker, including drag and drop
- Select a single asset or multiple assets
- Preview images and media files in the picker
- Open selected assets in a new tab from the field
- Supports localized JSON fields

## Requirements

- A bunny.net Storage Zone
- A bunny.net Storage API key
- A bunny.net Pull Zone hostname for serving selected files
- A DatoCMS JSON field

## Plugin settings

After installing the plugin, configure:

| Setting           | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| Storage Zone Name | The name of your bunny.net Storage Zone                     |
| Storage API Key   | The API key from the Storage Zone FTP & API Access settings |
| CDN Hostname      | Your Pull Zone hostname, for example `my-zone.b-cdn.net`    |
| Storage Region    | The region where your Storage Zone is hosted                |

Supported regions:

- Frankfurt, DE
- London, UK
- New York, US
- Los Angeles, US
- Singapore, SG
- Stockholm, SE
- São Paulo, BR
- Johannesburg, ZA
- Sydney, AU

## Field setup

Create or edit a JSON field in DatoCMS, then choose one of these manual field editors:

- **bunny.net Asset** — select one asset
- **bunny.net Assets** — select multiple assets

## Stored value

The plugin stores a stringified JSON value in the JSON field.

Single asset, after parsing:

```json
{
  "path": "folder/image.jpg",
  "filename": "image.jpg",
  "size": 153240,
  "contentType": "image/jpeg",
  "url": "https://my-zone.b-cdn.net/folder/image.jpg",
  "guid": "8e3b3b4e-1f6a-4b2a-9b8a-2f1e6d7c8a9b",
  "lastChanged": "2025-04-30T10:21:00.000"
}
```

Multiple assets, after parsing:

```json
[
  {
    "path": "folder/image.jpg",
    "filename": "image.jpg",
    "size": 153240,
    "contentType": "image/jpeg",
    "url": "https://my-zone.b-cdn.net/folder/image.jpg",
    "guid": "8e3b3b4e-1f6a-4b2a-9b8a-2f1e6d7c8a9b",
    "lastChanged": "2025-04-30T10:21:00.000"
  }
]
```

Example frontend usage:

```js
const asset = JSON.parse(record.bunnyAsset);
const url = asset.url;
```

For the multiple-asset editor, parse the field as an array.

## Image transformations with bunny.net Optimizer

If your Pull Zone has [bunny Optimizer](https://docs.bunny.net/optimizer/quickstart) enabled, you can transform images on the fly by appending query parameters to the stored `url`.

```js
const asset = JSON.parse(record.bunnyAsset);

const thumbnail = `${asset.url}?width=400&height=300&aspect_ratio=4:3`;
const webp = `${asset.url}?format=webp&quality=80`;
```

Common parameters:

- `width`, `height` for resizing the image
- `aspect_ratio` to crop to a ratio, for example `16:9`
- `format` to convert to `webp`, `avif`, `jpg`, or `png`
- `quality` for compression quality from `0` to `100`

See the [bunny Optimizer docs](https://docs.bunny.net/optimizer/quickstart) for the full list of options. Optimizer must be enabled on your Pull Zone for these parameters to take effect.

## Notes

- The Storage API key is used by the plugin inside DatoCMS to list and upload files.
- Editors with access to fields using this plugin can browse and upload to the configured Storage Zone.
- Image thumbnails use bunny.net image query parameters for smaller previews when supported by the Pull Zone.

## Development

```bash
npm install
npm run dev
npm run build
```
