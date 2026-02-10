const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class MetaConverter {
  constructor(cookies, options = {}) {
    this.cookies = cookies;
    this.headless = options.headless !== false;
    this.retryAttempts = options.retryAttempts || 3;
    this.delayBetween = options.delayBetween || 30;

    this.browser = null;
    this.context = null;
    this.page = null;
    this._running = false;
    this._capturedVideoUrls = [];
    this._progressCallback = null;
  }

  onProgress(callback) {
    this._progressCallback = callback;
  }

  isRunning() {
    return this._running;
  }

  async start() {
    if (this.browser) return;

    console.log('[BROWSER] Starting...');

    this.browser = await chromium.launch({
      headless: this.headless,
      args: ['--disable-blink-features=AutomationControlled']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Add cookies
    const cookieList = [];
    for (const [name, value] of Object.entries(this.cookies)) {
      if (value) {
        cookieList.push({
          name,
          value,
          domain: '.meta.ai',
          path: '/'
        });
      }
    }
    await this.context.addCookies(cookieList);

    this.page = await this.context.newPage();

    // Capture video URLs from network
    this._capturedVideoUrls = [];
    this.page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.mp4') && (url.includes('fbcdn') || url.includes('video'))) {
        if (!this._capturedVideoUrls.includes(url)) {
          this._capturedVideoUrls.push(url);
          console.log('[NETWORK] Captured video URL');
        }
      }
    });

    // Navigate to Meta AI
    console.log('[BROWSER] Navigating to Meta AI...');
    await this.page.goto('https://www.meta.ai', { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(2000);

    if (this.page.url().toLowerCase().includes('login')) {
      throw new Error('Not logged in. Please check your cookies.');
    }

    console.log('[BROWSER] Ready!');
    this._running = true;
  }

  async stop() {
    this._running = false;
    try {
      if (this.page) await this.page.close().catch(() => {});
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } catch (e) {
      console.error('[BROWSER] Error closing:', e);
    }
    this.page = null;
    this.context = null;
    this.browser = null;
    console.log('[BROWSER] Closed.');
  }

  async validateSession() {
    try {
      await this.start();
      return true;
    } catch (e) {
      return false;
    }
  }

  async _goToHome() {
    console.log('[NAV] Returning to home...');
    try {
      await this.page.goto('https://www.meta.ai', { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(1500);
    } catch (e) {
      await this.page.goto('https://www.meta.ai', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(2000);
    }
  }

  async _uploadImage(imagePath) {
    console.log(`[UPLOAD] ${path.basename(imagePath)}...`);

    // Try direct file input
    try {
      const fileInput = this.page.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(imagePath);
        await this.page.waitForTimeout(1500);
        console.log('[UPLOAD] Done via file input');
        return true;
      }
    } catch (e) {
      console.log('[UPLOAD] File input failed:', e.message);
    }

    // Try clicking + button
    const plusSelectors = [
      'div[aria-label="Add"]',
      'button:has-text("+")',
      '[data-testid="add-button"]',
      'div[role="button"]:has-text("+")'
    ];

    for (const selector of plusSelectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click();
          await this.page.waitForTimeout(500);

          const fileInput = this.page.locator('input[type="file"]').first();
          await fileInput.setInputFiles(imagePath);
          await this.page.waitForTimeout(1500);
          console.log(`[UPLOAD] Done via ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  }

  async _clickVideoMode() {
    console.log('[MODE] Switching to Video...');

    const videoSelectors = [
      'text=Video',
      'button:has-text("Video")',
      'div:has-text("Video"):not(:has(*))',
      '[aria-label*="Video"]'
    ];

    for (const selector of videoSelectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click();
          await this.page.waitForTimeout(800);
          console.log('[MODE] Video mode selected');
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    console.log('[MODE] Could not find Video button');
    return false;
  }

  async _typePromptAndAnimate(prompt) {
    console.log(`[ANIMATE] Prompt: ${prompt.substring(0, 40)}...`);

    // Input selectors
    const inputSelectors = [
      'textarea[placeholder*="animation" i]',
      'textarea[placeholder*="Describe" i]',
      'input[placeholder*="animation" i]',
      'div[contenteditable="true"]',
      'textarea'
    ];

    for (const selector of inputSelectors) {
      try {
        const elem = this.page.locator(selector).first();
        if (await elem.count() > 0 && await elem.isVisible()) {
          await elem.fill(prompt);
          await this.page.waitForTimeout(500);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Click Animate
    const animateSelectors = [
      'button:has-text("Animate")',
      'div[role="button"]:has-text("Animate")',
      '[aria-label*="Animate"]'
    ];

    for (const selector of animateSelectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click();
          console.log('[ANIMATE] Started');
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    console.log('[ANIMATE] Could not click Animate button');
    return false;
  }

  async _waitForVideo(timeout = 180) {
    console.log(`[VIDEO] Waiting (max ${timeout}s)...`);

    const startTime = Date.now();
    let lastLog = 0;

    while ((Date.now() - startTime) / 1000 < timeout) {
      if (!this._running) return null;

      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      // Log every 15 seconds
      if (elapsed - lastLog >= 15) {
        console.log(`[VIDEO] ${elapsed}s elapsed...`);
        lastLog = elapsed;
      }

      // Check network-captured URLs first
      if (this._capturedVideoUrls.length > 0) {
        const url = this._capturedVideoUrls[this._capturedVideoUrls.length - 1];
        console.log(`[VIDEO] Found via network capture! (${elapsed}s)`);
        return url;
      }

      // Check for video element
      try {
        const videoSelectors = ['video source[src]', 'video[src]', 'video source', 'video'];

        for (const selector of videoSelectors) {
          const videoElem = this.page.locator(selector).first();
          if (await videoElem.count() > 0) {
            let src = await videoElem.getAttribute('src');

            if (!src) {
              const parent = this.page.locator('video').first();
              if (await parent.count() > 0) {
                src = await parent.getAttribute('src');
              }
            }

            if (src && (src.includes('fbcdn') || src.includes('video')) && src.includes('.mp4')) {
              console.log(`[VIDEO] Found via ${selector}! (${elapsed}s)`);
              return src;
            }
          }
        }

        // Check page content
        const content = await this.page.content();
        const patterns = [
          /https:\/\/[^\s"'<>]+\.fbcdn\.net[^\s"'<>]+\.mp4[^\s"'<>]*/g,
          /https:\/\/[^\s"'<>]+fbcdn[^\s"'<>]+\.mp4[^\s"'<>]*/g
        ];

        for (const pattern of patterns) {
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            console.log(`[VIDEO] Found in page content! (${elapsed}s)`);
            return matches[0];
          }
        }

      } catch (e) {
        if (elapsed > 30) {
          console.log('[VIDEO] Detection error:', e.message);
        }
      }

      await this.page.waitForTimeout(1500);
    }

    console.log('[VIDEO] Timeout!');
    return null;
  }

  async _downloadVideo(videoUrl, outputPath) {
    console.log(`[DOWNLOAD] Saving to ${path.basename(outputPath)}...`);

    try {
      const response = await this.page.request.get(videoUrl);
      if (response.ok()) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const body = await response.body();
        fs.writeFileSync(outputPath, body);
        const sizeMb = body.length / (1024 * 1024);
        console.log(`[DOWNLOAD] Done (${sizeMb.toFixed(1)} MB)`);
        return true;
      }
    } catch (e) {
      console.log('[DOWNLOAD] Error:', e.message);
    }

    return false;
  }

  async _downloadWithRetry(videoUrl, outputPath, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[DOWNLOAD] Attempt ${attempt}/${maxRetries}...`);
      if (await this._downloadVideo(videoUrl, outputPath)) {
        return true;
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s between retries
      }
    }
    return false;
  }

  async retryDownload(videoUrl, outputPath) {
    console.log(`[RETRY] Downloading ${path.basename(outputPath)}...`);
    return await this._downloadWithRetry(videoUrl, outputPath, 3);
  }

  async convert(imagePath, outputPath, prompt, progressCallback) {
    const result = {
      success: false,
      videoUrl: null,
      outputPath,
      error: null,
      attempts: 0
    };

    const update = (stage, percent) => {
      if (progressCallback) {
        progressCallback(stage, percent);
      }
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      if (!this._running) break;

      result.attempts = attempt;

      try {
        if (attempt > 1) {
          console.log(`[RETRY] Attempt ${attempt}/${this.retryAttempts}`);
          update(`Retry ${attempt}/${this.retryAttempts}...`, 5);
        }

        // Clear captured URLs for new conversion
        this._capturedVideoUrls = [];

        if (!this.browser) {
          update('Starting browser...', 5);
          await this.start();
        } else {
          update('Preparing...', 5);
          await this._goToHome();
        }

        update('Uploading image...', 15);
        if (!await this._uploadImage(imagePath)) {
          throw new Error('Failed to upload image');
        }

        update('Selecting video mode...', 25);
        await this._clickVideoMode();

        update('Starting animation...', 35);
        if (!await this._typePromptAndAnimate(prompt)) {
          // Try just clicking Animate
          const btn = this.page.locator('button:has-text("Animate")').first();
          if (await btn.count() > 0) {
            await btn.click();
          }
        }

        update('Generating video...', 45);
        const videoUrl = await this._waitForVideo(180);

        if (!videoUrl) {
          // Save debug screenshot
          try {
            const debugPath = path.join(path.dirname(outputPath), `debug_${path.basename(imagePath, path.extname(imagePath))}.png`);
            await this.page.screenshot({ path: debugPath });
            console.log(`[DEBUG] Screenshot saved: ${debugPath}`);
          } catch (e) {}

          throw new Error('Video generation timed out - could not detect video URL');
        }

        result.videoUrl = videoUrl;

        update('Downloading...', 85);
        const downloadSuccess = await this._downloadWithRetry(videoUrl, outputPath);

        if (downloadSuccess) {
          update('Complete!', 100);
          result.success = true;
          result.downloadMethod = 'immediate';
          return result;
        } else {
          // Download failed but video was generated
          result.success = false;
          result.videoUrl = videoUrl;  // Store URL for retry
          result.downloadFailed = true; // Flag to distinguish from generation failure
          result.error = 'Download failed after retries';
          return result;
        }

      } catch (e) {
        result.error = e.message;
        console.log(`[ERROR] ${e.message}`);

        if (attempt < this.retryAttempts) {
          await this.page.waitForTimeout(2000);
          try {
            await this._goToHome();
          } catch (e) {}
        }
      }
    }

    update(`Failed after ${this.retryAttempts} attempts`, -1);
    return result;
  }
}

module.exports = { MetaConverter };
