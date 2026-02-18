# Grok Desktop App - Bulk Image to Video Converter v4.0.0

A powerful Windows desktop application that converts images to AI-animated videos, generates images/videos from text prompts, provides advanced image editing, video editing with transitions/voice over/music, and bulk AI upscaling — all powered by [Grok AI](https://grok.com).

![Electron](https://img.shields.io/badge/Electron-28+-47848F?logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)

---

## Features

### Image to Video Conversion
- **Bulk Processing** — Convert multiple images to AI-animated videos at once
- **Drag & Drop** — Easy file/folder selection
- **Animation Presets** — Cinematic, Zoom, Pan, Parallax, Floating, Dramatic, Nature, Portrait
- **Custom Prompts** — Write your own animation style descriptions
- **Progress Tracking** — Real-time per-file status updates
- **Auto-add to Video Editor** — Optionally send converted videos straight to the timeline
- **Headless Mode** — Run in background without a browser window
- **Resume Support** — Continue interrupted conversions
- **Retry Downloads** — Retry failed downloads without regenerating

### Text to Video Generation
- **Direct Video from Text** — Grok generates video directly from text prompts
- **Aspect Ratio Selection** — 9:16 (Shorts), 16:9 (YouTube), 1:1 (Square), 4:5 (Portrait)
- **Bulk Prompts** — Queue multiple prompts, import from `.txt` files
- **Naming Patterns** — Customizable output filenames with `{prompt}`, `{index}`, `{timestamp}`

### Text to Image Generation
- **AI Image Generation** — Generate images from text using Grok
- **Style Presets** — Realistic, Artistic, Anime, 3D Render, Fantasy, Cinematic, Minimalist
- **Aspect Ratios** — 16:9, 9:16, 1:1
- **Bulk Generation** — Queue multiple prompts
- **Import Prompts** — Load prompts from `.txt` files
- **Optional Video Conversion** — Automatically convert generated images to video

### Gallery
- **Media Browser** — View all generated images and videos
- **Filter by Type** — All, Images, Videos
- **Quick Actions** — View, edit, open in folder, delete
- **Auto-refresh** — Updates when new content is created

### Image Editor
Full-featured editor accessible from the Gallery:

| Category | Features |
|----------|----------|
| **Adjustments** | Brightness, Contrast, Saturation, Sharpness, Blur |
| **Filters** | Grayscale (B&W), Sepia, Negative/Invert |
| **Transform** | Rotate (90/180), Flip (H/V), Resize with aspect lock |
| **Export** | JPEG/PNG/WebP, quality slider, watermark |
| **Thumbnails** | One-click YouTube, Instagram, Twitter, Facebook sizes |
| **Presets** | Save/load adjustment presets, Before/After compare slider |

### Bulk Upscale
- **AI Upscale** — High-quality enhancement via Real-ESRGAN (bundled)
- **Scale Factors** — 2x, 3x, 4x enlargement
- **Output Format** — Same as original, PNG, JPG, or WebP
- **Batch Processing** — Process entire folders with progress tracking

### Video Editor
- **Drag & Drop Timeline** — Arrange clips visually with scroll navigation
- **10+ Transitions** — Fade, dissolve, slide, wipe, circle, pixelize
- **Voice Over** — Add voice audio with volume control; optionally replace original audio
- **Background Music** — Add music with independent volume controls and fade in/out
- **High-Quality Export** — H.264, AAC, Windows Media Player compatible
- **Real-time Preview** — Preview clips before export

---

## Screenshots

> _Add screenshots of the application here._

---

## Installation

### Prerequisites
- **Windows 10/11**
- **Node.js 18+**
- **Google Chrome** (required for Grok AI automation)

### Setup

```bash
# Clone the repository
git clone https://github.com/gr8xpert/Grok-Desktop-App---Bulk-Image-to-Video.git
cd Grok-Desktop-App---Bulk-Image-to-Video

# Install dependencies
npm install

# Run in development mode
npm start

# Build portable executable
npm run build:win
```

The portable `.exe` will be created in the `dist/` folder.

---

## Configuration

### Grok Authentication

To use AI generation features, you need Grok cookies:

1. Go to [grok.com](https://grok.com) and log in
2. Open DevTools (`F12`) → **Application** → **Cookies** → `grok.com`
3. Copy these cookie values:
   - `sso` (required)
   - `sso-rw` (required)
4. Paste them in the **Settings** tab of the app
5. Click **Validate Cookies** to verify

> **Note:** Image editing, gallery, bulk upscale, and video editor features work without authentication.

---

## Usage

### Image to Video
1. Drag & drop images or select files/folder
2. Choose output folder
3. Select an animation preset or write a custom prompt
4. Click **Start Conversion**

### Text to Video
1. Go to the **Text to Video** tab
2. Enter prompts (or import from `.txt`)
3. Select aspect ratio
4. Click **Start Generation**

### Text to Image
1. Go to the **Text to Image** tab
2. Enter prompts with optional style presets
3. Choose aspect ratio
4. Click **Start Generation**
5. Optionally enable **Convert to Video** for auto-animation

### Bulk Upscaling
1. Go to the **Upscale** tab
2. Add images via drag & drop
3. Select scale (2x / 3x / 4x) and output format
4. Click **Start Upscaling**

### Video Editing
1. Go to the **Video Editor** tab
2. Add videos to the timeline
3. Set transitions, add voice over or music
4. Click **Export Video**

### Image Editing
1. Go to **Gallery**, hover an image, click the edit icon
2. Adjust brightness, contrast, filters, etc.
3. Use **Before/After** toggle to compare
4. Click **Save** or **Save as New**

---

## Animation Presets

| Preset | Description |
|--------|-------------|
| Cinematic | Smooth cinematic motion with dramatic camera movement |
| Zoom In | Slowly zoom into the center with subtle motion |
| Zoom Out | Slowly zoom out revealing more of the scene |
| Pan Left | Smooth horizontal pan from right to left |
| Pan Right | Smooth horizontal pan from left to right |
| Parallax | Depth effect, foreground/background at different speeds |
| Floating | Gentle floating, dreamlike and ethereal |
| Dramatic | Dramatic slow motion with intense atmosphere |
| Nature | Natural movement — wind, water, wildlife |
| Portrait | Subtle life-like motion for portraits |
| Custom | Your own animation prompt |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron** | Desktop application framework |
| **Playwright** | Browser automation for Grok AI |
| **Sharp** | Image processing (edits, thumbnails, watermarks) |
| **FFmpeg** | Video processing (merge, transitions, music, voice over) |
| **Real-ESRGAN** | AI-powered image upscaling |
| **Node.js** | Backend runtime |

---

## Project Structure

```
grok-video-converter-electron/
├── assets/
│   ├── ffmpeg/                # Bundled FFmpeg binaries
│   │   ├── ffmpeg.exe
│   │   ├── ffprobe.exe
│   │   └── README.txt
│   └── realesrgan/            # Bundled Real-ESRGAN binaries & models
│       ├── realesrgan-ncnn-vulkan.exe
│       ├── vcomp140.dll
│       └── models/
├── src/
│   ├── main/
│   │   ├── main.js            # Electron main process & IPC handlers
│   │   ├── preload.js         # Secure IPC bridge (contextBridge)
│   │   ├── grok-converter.js  # Grok AI browser automation
│   │   ├── video-editor.js    # FFmpeg video processing
│   │   ├── captions.js        # Caption/subtitle generation (ASS format)
│   │   └── database.js        # JSON-based history storage
│   └── renderer/
│       ├── index.html         # UI — all tabs
│       ├── app.js             # Renderer logic
│       └── styles.css         # Dark glassmorphic theme
├── package.json
├── .gitignore
└── README.md
```

---

## Troubleshooting

### Cookies Invalid
- Make sure you're logged into [grok.com](https://grok.com) in Chrome
- Copy exact cookie values without extra spaces
- Cookies expire — refresh them if validation fails

### Conversion Fails
- Check your internet connection
- Grok may have rate limits — increase delay between files in **Settings**
- Try disabling **Headless Mode**

### AI Upscale Not Working
- Real-ESRGAN is bundled; ensure `assets/realesrgan/` has the `.exe` and models
- GPU drivers must be up to date (Vulkan support required)
- If no Vulkan GPU, upscale will fail — use Basic upscale as a fallback

### Video Editor Not Working
- FFmpeg is bundled in `assets/ffmpeg/`
- If missing, download from [gyan.dev/ffmpeg](https://www.gyan.dev/ffmpeg/builds/)
- Place `ffmpeg.exe` and `ffprobe.exe` in `assets/ffmpeg/`

### Video Not Downloading
- The app uses multiple download fallback methods
- Click **Retry Downloads** for failed ones
- If the URL expired, the video needs to be regenerated

---

## Changelog

### v4.0.0 — Grok Migration & Code Quality
- **Migrated from Meta AI to Grok AI** — all generation now uses grok.com
- **Security fixes** — removed `eval()`, fixed SVG injection, command injection prevention
- **Memory optimizations** — proper thumbnail generation, IPC listener cleanup
- **Code cleanup** — extracted shared image editing logic, removed dead code
- **Added global error handler** in renderer for better debugging
- **CSP fix** — Google Fonts now load correctly

### v3.27.0
- Auto-add to Video Editor, Voice Over, persistent settings
- Timeline scroll navigation, Windows Media Player compatibility

### v3.24.0
- Timeline scroll buttons, layout fixes, music fixes for silent videos

### v3.23.0
- Video Editor tab with timeline, transitions, background music, export

### v3.22.0
- Bulk Upscale tab with AI upscaling (Real-ESRGAN)

### v3.21.x
- Gallery, Image Editor, Before/After compare, watermarks, thumbnails, presets

### v3.20.x
- Text to Image generation, aspect ratios, style presets, bulk import

### v3.1x.x
- Initial bulk image-to-video, animation presets, retry, headless mode, history

---

## License

MIT License — see [LICENSE](LICENSE) for details.

## Author

**gr8xpert** (Shahzaib Aslam)

---

> **Disclaimer:** This tool is for personal use. Please respect Grok AI's terms of service and usage limits.
