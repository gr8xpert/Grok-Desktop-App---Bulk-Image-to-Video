# Meta Video Converter

A standalone desktop application to convert images to AI-animated videos using Meta AI.

## Features

- **Drag & Drop** - Simply drag images or folders onto the app
- **Thumbnail Previews** - See your images before converting
- **Batch Processing** - Convert multiple images at once
- **Animation Presets** - Cinematic, zoom, pan, parallax, and more
- **Custom Prompts** - Write your own animation descriptions
- **Resume Conversions** - Continue from where you left off after interruption
- **Conversion History** - Track all your conversions with search
- **Smart Rate Limiting** - Automatic delays to avoid Meta AI limits
- **Desktop Notifications** - Get notified when batches complete
- **Modern UI** - Beautiful glassmorphic dark theme

## Requirements

- Windows 10/11
- Meta AI account with valid cookies

## Installation

### From Release (Recommended)
1. Download the latest `MetaVideoConverter-Setup.exe` from Releases
2. Run the installer
3. Launch "Meta Video Converter" from Start Menu

### From Source
```bash
# Clone repository
git clone https://github.com/gr8xpert/meta-video-converter-electron.git
cd meta-video-converter-electron

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run in development
npm start

# Build for Windows
npm run build:win
```

## Usage

### 1. Get Meta AI Cookies
1. Open [meta.ai](https://meta.ai) in your browser
2. Make sure you're logged in
3. Open DevTools (F12)
4. Go to Application → Cookies → meta.ai
5. Copy the values for `datr` and `abra_sess`

### 2. Configure the App
1. Launch Meta Video Converter
2. Go to Settings tab
3. Paste your cookies
4. Click "Validate Cookies" to verify
5. Save Settings

### 3. Convert Images
1. Drag & drop images/folder or click to browse
2. Select output folder
3. Choose animation preset or write custom prompt
4. Click "Start Conversion"
5. Watch the progress!

## Animation Presets

| Preset | Description |
|--------|-------------|
| Cinematic | Smooth cinematic motion with dramatic camera |
| Zoom In | Slowly zoom into the center |
| Zoom Out | Slowly zoom out revealing more |
| Pan Left/Right | Horizontal camera pan |
| Parallax | Depth effect with layered motion |
| Floating | Dreamlike ethereal movement |
| Dramatic | Intense slow motion atmosphere |
| Nature | Natural wind, water, wildlife motion |
| Portrait | Subtle life-like motion for portraits |

## Rate Limits

Meta AI has daily generation limits (~6-10 per day). The app:
- Adds configurable delays between conversions (default: 30 seconds)
- Automatically pauses if rate limited
- Can resume the next day

## Tech Stack

- Electron 28
- Playwright (browser automation)
- Better-SQLite3 (history database)
- Modern HTML/CSS/JS

## Version

3.0.0

## License

MIT
