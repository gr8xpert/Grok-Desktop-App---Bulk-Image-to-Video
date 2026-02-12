# Meta Video Converter - Bulk Image to Video & Text to Image

A desktop application that converts images to AI-animated videos and generates images from text prompts using Meta AI. Process multiple images/prompts in bulk with customizable presets.

## Features

### Image to Video Conversion
- **Bulk Processing**: Convert multiple images to videos at once
- **Drag & Drop**: Easy file/folder selection with drag and drop support
- **Animation Presets**: Multiple built-in presets (Cinematic, Zoom, Pan, Parallax, etc.)
- **Custom Prompts**: Create your own animation styles with custom prompts
- **Progress Tracking**: Real-time progress tracking
- **Conversion History**: Track all conversions with retry option for failed ones
- **Headless Mode**: Run conversions in the background without browser window
- **Resume Support**: Continue interrupted conversions

### Text to Image Generation (NEW)
- **AI Image Generation**: Generate images from text prompts using Meta AI
- **Aspect Ratio Support**: Choose from 16:9 (YouTube), 9:16 (Reels), or 1:1 (Instagram)
- **Style Presets**: Realistic, Artistic, Anime, 3D Render, Fantasy, Cinematic, Minimalist
- **Bulk Generation**: Queue multiple prompts and generate them all at once
- **Import Prompts**: Load prompts from a .txt file for batch processing
- **Optional Video Conversion**: Automatically convert generated images to videos

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/gr8xpert/Meta-Desktop-App---Bulk-Image-to-Video.git
cd Meta-Desktop-App---Bulk-Image-to-Video
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm start
```

4. Build portable executable:
```bash
npm run build:win
```

The portable `.exe` will be created in the `dist` folder.

## Configuration

### Meta AI Authentication

To use this app, you need to provide your Meta AI cookies:

1. Go to [meta.ai](https://www.meta.ai) and log in
2. Open DevTools (F12) → Application → Cookies → meta.ai
3. Copy the following cookie values:
   - `datr` (required)
   - `abra_sess` (required)
   - `wd` (optional)
   - `dpr` (optional)
4. Paste them in the Settings tab of the app
5. Click "Validate Cookies" to verify

## Usage

### Image to Video Conversion
1. **Add Images**: Drag & drop images/folders or click "Select Files"/"Select Folder"
2. **Choose Output**: Select where to save the generated videos
3. **Select Preset**: Choose an animation style or create a custom prompt
4. **Start Conversion**: Click "Start Conversion" and wait for processing
5. **View Results**: Check the History tab for completed videos

### Text to Image Generation
1. **Go to "Text to Image" tab**
2. **Enter Prompt**: Describe the image you want to generate
3. **Select Style**: Choose a style preset (Realistic, Anime, etc.) or "None" for exact prompt
4. **Choose Aspect Ratio**: 16:9 (landscape), 9:16 (portrait), or 1:1 (square)
5. **Add to Queue**: Click "Add to Queue" (or import from .txt file)
6. **Generate**: Click "Start Generation" to process all prompts
7. **Optional**: Enable "Convert to Video" to also animate the generated images

## Animation Presets (Image to Video)

| Preset | Description |
|--------|-------------|
| Cinematic | Smooth cinematic motion with dramatic camera movement |
| Zoom In | Slowly zoom into the center with subtle motion |
| Zoom Out | Slowly zoom out revealing more of the scene |
| Pan Left | Smooth horizontal pan from right to left |
| Pan Right | Smooth horizontal pan from left to right |
| Parallax | Depth effect with foreground/background moving differently |
| Floating | Gentle floating motion, dreamlike and ethereal |
| Dramatic | Dramatic slow motion with intense atmosphere |
| Nature | Natural movement like wind, water, or wildlife |
| Portrait | Subtle life-like motion for portraits |
| Custom | Your own custom animation prompt |

## Style Presets (Text to Image)

| Preset | Prefix Added to Prompt |
|--------|------------------------|
| Realistic Photo | "Photorealistic image of " |
| Artistic | "Artistic illustration of " |
| Anime Style | "Anime style image of " |
| 3D Render | "3D rendered image of " |
| Fantasy Art | "Fantasy art of " |
| Cinematic | "Cinematic shot of " |
| Minimalist | "Minimalist design of " |
| None | No prefix - uses your exact prompt |

## Aspect Ratios (Text to Image)

| Ratio | Use Case | Orientation |
|-------|----------|-------------|
| 16:9 | YouTube thumbnails, desktop wallpapers | Landscape |
| 9:16 | Instagram Reels, TikTok, Stories | Portrait |
| 1:1 | Instagram posts, profile pictures | Square |

## Tech Stack

- **Electron** - Desktop application framework
- **Playwright** - Browser automation for Meta AI interaction
- **Sharp** - Image processing for aspect ratio cropping
- **Node.js** - Backend runtime

## Project Structure

```
meta-video-converter-electron/
├── src/
│   ├── main/
│   │   ├── main.js        # Electron main process
│   │   ├── preload.js     # Preload script for IPC
│   │   ├── converter.js   # Meta AI automation logic
│   │   └── database.js    # SQLite database for history
│   └── renderer/
│       ├── index.html     # Main UI
│       ├── app.js         # Renderer process logic
│       └── styles.css     # UI styling
├── package.json
└── README.md
```

## Troubleshooting

### Cookies Invalid
- Make sure you're logged into Meta AI in your browser
- Copy the exact cookie values without any extra spaces
- Cookies may expire - refresh them if validation fails

### Conversion Fails
- Check your internet connection
- Meta AI may have rate limits - increase delay between files
- Try disabling headless mode in Settings

### Video Not Downloading
- The app uses multiple fallback download methods
- If headless mode fails, it will automatically retry with visible browser

## License

MIT License

## Author

**gr8xpert**

## Disclaimer

This tool is for personal use only. Please respect Meta AI's terms of service and usage limits.
