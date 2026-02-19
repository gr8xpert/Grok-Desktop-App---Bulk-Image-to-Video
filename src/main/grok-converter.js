const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

class GrokConverter {
  constructor(cookies, options = {}) {
    this.cookies = cookies;
    this.headless = options.headless !== false;
    this.retryAttempts = options.retryAttempts || 3;
    this.delayBetween = options.delayBetween || 5; // Grok seems faster, less delay needed

    this.browser = null;
    this.context = null;
    this.page = null;
    this._running = false;
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

    console.log('[GROK] Starting browser...');

    try {
      this.browser = await chromium.launch({
        headless: this.headless,
        channel: 'chrome',
        args: ['--disable-blink-features=AutomationControlled']
      });
    } catch (e) {
      if (e.message.includes('Executable doesn\'t exist') || e.message.includes('executable')) {
        throw new Error('Google Chrome is not installed. Please install Chrome from https://google.com/chrome');
      }
      throw e;
    }

    // Create temp folder for downloads to avoid cluttering user's Downloads folder
    const os = require('os');
    const tempDownloadDir = path.join(os.tmpdir(), 'grok-converter-downloads');
    if (!fs.existsSync(tempDownloadDir)) {
      fs.mkdirSync(tempDownloadDir, { recursive: true });
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      acceptDownloads: true
    });

    // Store temp dir for cleanup
    this._tempDownloadDir = tempDownloadDir;

    // Add cookies for grok.com
    const cookieList = [];

    // Grok cookies (from grok.com domain)
    const grokCookies = ['sso', 'sso-rw', 'x-userid', 'i18nextLng'];
    for (const name of grokCookies) {
      if (this.cookies[name]) {
        cookieList.push({
          name,
          value: this.cookies[name],
          domain: '.grok.com',
          path: '/'
        });
      }
    }

    // Also add x.ai cookies if provided (linked auth)
    if (this.cookies['sso_xai']) {
      cookieList.push({
        name: 'sso',
        value: this.cookies['sso_xai'],
        domain: '.x.ai',
        path: '/'
      });
    }
    if (this.cookies['sso-rw_xai']) {
      cookieList.push({
        name: 'sso-rw',
        value: this.cookies['sso-rw_xai'],
        domain: '.x.ai',
        path: '/'
      });
    }

    if (cookieList.length === 0) {
      throw new Error('No valid Grok cookies provided. Please provide sso and sso-rw cookies from grok.com');
    }

    await this.context.addCookies(cookieList);
    console.log(`[GROK] Added ${cookieList.length} cookies`);

    this.page = await this.context.newPage();

    // Navigate to Grok Imagine
    console.log('[GROK] Navigating to grok.com/imagine...');
    await this.page.goto('https://grok.com/imagine', { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(2000);

    const currentUrl = this.page.url();
    console.log('[GROK] Current URL:', currentUrl);

    // Check for login redirects
    if (currentUrl.toLowerCase().includes('login') ||
        currentUrl.toLowerCase().includes('auth') ||
        currentUrl.toLowerCase().includes('x.com/i/flow')) {
      throw new Error(`Not logged in. Redirected to: ${currentUrl}`);
    }

    // Check for logged-in state
    try {
      await this.page.waitForTimeout(2000);

      // Look for the message input area - if it exists, we're logged in
      const inputSelectors = [
        'textarea[placeholder*="imagine" i]',
        'textarea[placeholder*="type" i]',
        'div[contenteditable="true"]',
        '[data-placeholder]'
      ];

      let foundInput = false;
      for (const selector of inputSelectors) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          foundInput = true;
          console.log('[GROK] Found input area - logged in');
          break;
        }
      }

      if (!foundInput) {
        // Check for login prompts
        const loginIndicators = [
          'text="Sign in"',
          'text="Log in"',
          'text="Sign up"'
        ];

        for (const selector of loginIndicators) {
          const element = this.page.locator(selector).first();
          if (await element.count() > 0 && await element.isVisible()) {
            throw new Error('Not logged in. Please provide valid cookies.');
          }
        }
      }

      console.log('[GROK] Session verified');
    } catch (e) {
      if (e.message.includes('Not logged in')) {
        throw e;
      }
      console.log('[GROK] Login check warning:', e.message);
    }

    console.log('[GROK] Ready!');
    this._running = true;
  }

  async stop() {
    this._running = false;
    try {
      if (this.page) await this.page.close().catch(() => {});
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } catch (e) {
      console.error('[GROK] Error closing:', e);
    }

    // Clean up temp download folder
    if (this._tempDownloadDir && fs.existsSync(this._tempDownloadDir)) {
      try {
        const files = fs.readdirSync(this._tempDownloadDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this._tempDownloadDir, file));
        }
        console.log(`[GROK] Cleaned up ${files.length} temp files`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    this.page = null;
    this.context = null;
    this.browser = null;
    console.log('[GROK] Closed.');
  }

  async validateSession() {
    try {
      await this.start();
      console.log('[GROK] Validation URL:', this.page.url());
      return true;
    } catch (e) {
      console.log('[GROK] Validation failed:', e.message);
      return false;
    } finally {
      await this.stop();
    }
  }

  async _navigateToImagine() {
    console.log('[GROK] Navigating to /imagine...');

    // Open a fresh page/tab for each generation (mimics the "new tab" unlimited generation trick)
    try {
      // Create new page (simulates opening new tab)
      const newPage = await this.context.newPage();

      // Close old page
      if (this.page) {
        await this.page.close().catch(() => {});
      }

      this.page = newPage;

      await this.page.goto('https://grok.com/imagine', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      await this.page.waitForTimeout(2000);

      console.log('[GROK] Fresh /imagine page loaded');
    } catch (e) {
      // Fallback: just navigate on current page
      await this.page.goto('https://grok.com/imagine', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await this.page.waitForTimeout(2000);
    }
  }

  async _clickImageButton() {
    console.log('[GROK] Looking for Image button...');

    // The Image button is in the top bar with a dropdown
    const imageButtonSelectors = [
      'button:has-text("Image")',
      '[aria-label*="Image" i]',
      'div[role="button"]:has-text("Image")',
      // Look for the button that opens the upload menu
      'button:has(svg) + button', // Adjacent to another button
      '[data-testid*="image" i]'
    ];

    for (const selector of imageButtonSelectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click();
          await this.page.waitForTimeout(800);
          console.log(`[GROK] Clicked Image button via: ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    console.log('[GROK] Could not find Image button');
    return false;
  }

  async _clickUploadOption() {
    console.log('[GROK] Looking for Upload option in menu...');

    // Wait for dropdown menu to appear
    await this.page.waitForTimeout(500);

    const uploadSelectors = [
      '[role="menuitem"]:has-text("Upload")',
      '[role="menuitem"]:first-child', // First menu item is Upload
      'div:has-text("Upload a file")',
      'text="Upload a file"',
      '[role="menu"] [role="menuitem"]:first-child'
    ];

    for (const selector of uploadSelectors) {
      try {
        const item = this.page.locator(selector).first();
        if (await item.count() > 0 && await item.isVisible()) {
          await item.click();
          await this.page.waitForTimeout(500);
          console.log(`[GROK] Clicked Upload option via: ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    console.log('[GROK] Could not find Upload option');
    return false;
  }

  async _uploadImage(imagePath) {
    console.log(`[GROK] Uploading: ${path.basename(imagePath)}...`);

    // Method 1: Try direct file input first
    try {
      const fileInput = this.page.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(imagePath);
        await this.page.waitForTimeout(2000);
        console.log('[GROK] Upload done via direct file input');
        await this._clickGenerateButton();
        return true;
      }
    } catch (e) {
      console.log('[GROK] Direct file input not available');
    }

    // Method 2: Click Image button to open menu, then Upload
    const triggerSelectors = [
      'button:has-text("Image")',
      '[aria-haspopup="menu"]',
      'button[aria-expanded]',
      'button:has(svg[viewBox])',
    ];

    for (const selector of triggerSelectors) {
      try {
        const triggers = this.page.locator(selector);
        const count = await triggers.count();

        for (let i = 0; i < count; i++) {
          const trigger = triggers.nth(i);
          if (await trigger.isVisible()) {
            await trigger.click();
            await this.page.waitForTimeout(800);

            const menu = this.page.locator('[role="menu"]');
            if (await menu.count() > 0 && await menu.isVisible()) {
              console.log(`[GROK] Menu opened via: ${selector}`);

              if (await this._clickUploadOption()) {
                const [fileChooser] = await Promise.all([
                  this.page.waitForEvent('filechooser', { timeout: 5000 }),
                ]).catch(() => [null]);

                if (fileChooser) {
                  await fileChooser.setFiles(imagePath);
                  await this.page.waitForTimeout(2000);
                  console.log('[GROK] Upload done via file chooser');
                  await this._clickGenerateButton();
                  return true;
                }

                const fileInput = this.page.locator('input[type="file"]').first();
                if (await fileInput.count() > 0) {
                  await fileInput.setInputFiles(imagePath);
                  await this.page.waitForTimeout(2000);
                  console.log('[GROK] Upload done via file input after menu');
                  await this._clickGenerateButton();
                  return true;
                }
              }
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Method 3: Generic setInputFiles
    try {
      await this.page.setInputFiles('input[type="file"]', imagePath);
      await this.page.waitForTimeout(2000);
      console.log('[GROK] Upload done via setInputFiles');
      await this._clickGenerateButton();
      return true;
    } catch (e) {
      console.log('[GROK] setInputFiles failed:', e.message);
    }

    return false;
  }

  async _selectVideoMode() {
    console.log('[GROK] Selecting Video mode...');

    try {
      // Look for the "Image" dropdown button near the input area
      // The button should be near the bottom of the page, close to the text input
      const dropdownSelectors = [
        'button:has-text("Image"):near(textarea)',
        'button:has-text("Image")',
        '[aria-expanded]:has-text("Image")',
      ];

      let dropdownClicked = false;
      for (const selector of dropdownSelectors) {
        try {
          const dropdowns = this.page.locator(selector);
          const count = await dropdowns.count();

          for (let i = 0; i < count; i++) {
            const dropdown = dropdowns.nth(i);
            if (await dropdown.isVisible()) {
              // Check if it looks like the Image/Video mode selector (should be near bottom)
              const box = await dropdown.boundingBox();
              if (box && box.y > 300) { // Should be in lower part of page
                await dropdown.click();
                console.log(`[GROK] Clicked dropdown via: ${selector}`);
                dropdownClicked = true;
                await this.page.waitForTimeout(1000);
                break;
              }
            }
          }
          if (dropdownClicked) break;
        } catch (e) {
          continue;
        }
      }

      if (!dropdownClicked) {
        console.log('[GROK] Could not find Image dropdown');
        return false;
      }

      // Debug screenshot (disabled in production)
      // try {
      //   await this.page.screenshot({ path: 'grok_dropdown_debug.png', fullPage: false });
      //   console.log('[GROK] Debug screenshot saved');
      // } catch (e) {}

      // Wait for menu to appear and look for Video option
      await this.page.waitForTimeout(500);

      // The menu should have "Video" with "Generate a video" as description
      // Try clicking on the label or the radio button
      const videoSelectors = [
        // Look for clickable elements with exact "Video" text followed by description
        'div:has(> span:text-is("Video"))',
        'label:has-text("Video"):has-text("Generate")',
        'div:has-text("VideoGenerate a video")',
        // Radio buttons or checkboxes
        'input[type="radio"] + label:has-text("Video")',
        'input[type="radio"][value*="video" i]',
        // Icon + text combination
        'svg + span:text-is("Video")',
        // Just try "Video" text that's not in a video tag warning
        'span:text-is("Video")',
      ];

      for (const selector of videoSelectors) {
        try {
          const elements = this.page.locator(selector);
          const count = await elements.count();
          console.log(`[GROK] Selector "${selector}" found ${count} elements`);

          for (let i = 0; i < count; i++) {
            const el = elements.nth(i);
            if (await el.isVisible()) {
              const text = await el.textContent().catch(() => '');
              // Skip video tag warnings
              if (text.includes('browser does not support')) continue;

              await el.click();
              console.log(`[GROK] Selected Video mode via: ${selector}`);
              await this.page.waitForTimeout(500);
              return true;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Last resort: try keyboard navigation
      console.log('[GROK] Trying keyboard navigation...');
      await this.page.keyboard.press('ArrowUp'); // Go to Video option
      await this.page.waitForTimeout(200);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(500);

      console.log('[GROK] Could not confirm Video mode selection');
      return false;

    } catch (e) {
      console.log('[GROK] Error selecting video mode:', e.message);
      return false;
    }
  }

  async _selectAspectRatio(ratio) {
    console.log(`[GROK] Selecting aspect ratio: ${ratio}`);

    try {
      // Wait for UI to stabilize after video mode selection
      await this.page.waitForTimeout(1000);

      // The aspect ratio buttons appear when clicking the "Video" button/badge in the input area
      // Look for the Video mode indicator and click it to reveal aspect ratio options
      const videoButtonSelectors = [
        'button:has-text("Video")',
        'div:has-text("Video"):not(:has(div))',
        'button:has(span:text-is("Video"))',
        'button:near(textarea):has-text("Video")',
      ];

      let foundVideoButton = false;
      for (const sel of videoButtonSelectors) {
        try {
          const btn = this.page.locator(sel).first();
          if (await btn.count() > 0 && await btn.isVisible()) {
            await btn.click();
            console.log(`[GROK] Opened aspect ratio options`);
            await this.page.waitForTimeout(800);
            foundVideoButton = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!foundVideoButton) {
        // Fallback: Try clicking on Video text at the bottom of the page
        const videoElements = await this.page.evaluate(() => {
          const elements = document.querySelectorAll('button, div, span');
          const found = [];
          elements.forEach(el => {
            const text = (el.textContent || '').trim();
            if (text === 'Video' || text === 'video') {
              const rect = el.getBoundingClientRect();
              if (rect.y > 400 && rect.width > 0 && rect.height > 0) {
                found.push({
                  x: Math.round(rect.x + rect.width / 2),
                  y: Math.round(rect.y + rect.height / 2)
                });
              }
            }
          });
          return found;
        });

        if (videoElements.length > 0) {
          const target = videoElements[0];
          await this.page.mouse.click(target.x, target.y);
          await this.page.waitForTimeout(800);
          foundVideoButton = true;
        }
      }

      // Direct aria-label selector for aspect ratio button
      const selector = `[aria-label="${ratio}"]`;
      let button = this.page.locator(selector).first();
      let count = await button.count();

      if (count > 0) {
        await button.click({ force: true });
        console.log(`[GROK] Clicked aspect ratio button via aria-label: ${ratio}`);
        await this.page.waitForTimeout(500);
        return true;
      }

      // Try text-based selectors
      const textSelectors = [
        `button:has-text("${ratio}")`,
        `span:text-is("${ratio}")`,
        `div:text-is("${ratio}")`,
      ];

      for (const sel of textSelectors) {
        try {
          const el = this.page.locator(sel).first();
          if (await el.count() > 0 && await el.isVisible()) {
            await el.click();
            console.log(`[GROK] Clicked aspect ratio via text selector`);
            await this.page.waitForTimeout(500);
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      console.log(`[GROK] Could not find aspect ratio button for ${ratio}`);
      return false;

    } catch (e) {
      console.log('[GROK] Error selecting aspect ratio:', e.message);
      return false;
    }
  }

  async _typePrompt(prompt) {
    console.log(`[GROK] Typing prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

    // Wait for textarea to be ready
    await this.page.waitForTimeout(1500);

    const inputSelectors = [
      'textarea[placeholder="Type to imagine"]',
      'textarea[aria-label="Ask Grok anything"]',
      'textarea[placeholder*="imagine" i]',
      'textarea[placeholder*="type" i]',
      'textarea[placeholder*="customiz" i]',
      'div[contenteditable="true"]',
      'textarea'
    ];

    for (const selector of inputSelectors) {
      try {
        const input = this.page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          // Method 1: Use React native value setter + event dispatch
          const reactSet = await this.page.evaluate(({ sel, text }) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            el.focus();
            // Use native setter to bypass React's value tracking
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype, 'value'
            ).set;
            nativeSetter.call(el, text);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return el.value === text;
          }, { sel: selector, text: prompt });

          if (reactSet) {
            console.log(`[GROK] Set prompt via React native setter into: ${selector}`);
            await this.page.waitForTimeout(500);
            return true;
          }

          // Method 2: Click + keyboard type as fallback
          await input.click();
          await this.page.waitForTimeout(300);
          await this.page.keyboard.press('Control+a');
          await this.page.keyboard.press('Backspace');
          await this.page.waitForTimeout(200);
          await this.page.keyboard.type(prompt, { delay: 30 });

          console.log(`[GROK] Typed prompt via keyboard into: ${selector}`);
          await this.page.waitForTimeout(500);
          return true;
        }
      } catch (e) {
        console.log(`[GROK] _typePrompt selector failed (${selector}):`, e.message);
        continue;
      }
    }

    console.log('[GROK] Could not find text input field for prompt');
    return false;
  }

  async _clickGenerateButton() {
    console.log('[GROK] Looking for generate/send button...');
    await this.page.waitForTimeout(1000);

    // Try various selectors for the generate/send button
    const generateSelectors = [
      'button[type="submit"]',
      'button:has-text("Make video")',
      'button:has-text("Generate")',
      'button:has-text("Send")',
      'button:has-text("Create")',
      'button:has-text("Redo")',
      '[aria-label*="send" i]',
      '[aria-label*="submit" i]',
      '[aria-label*="generate" i]',
      // Arrow/send button icons
      'button:has(svg[viewBox="0 0 24 24"])',
      'button[data-testid*="send" i]',
      // The submit button usually at the end of the input area
      'form button:last-child',
      'button.send-button',
      'button.submit-button'
    ];

    for (const selector of generateSelectors) {
      try {
        const buttons = this.page.locator(selector);
        const count = await buttons.count();

        for (let i = 0; i < count; i++) {
          const btn = buttons.nth(i);
          if (await btn.isVisible() && await btn.isEnabled()) {
            await btn.click();
            console.log(`[GROK] Clicked generate button via: ${selector}`);
            await this.page.waitForTimeout(2000);
            return true;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Try pressing Enter as fallback
    try {
      console.log('[GROK] Trying Enter key as fallback...');
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(2000);
      return true;
    } catch (e) {
      console.log('[GROK] Enter key failed:', e.message);
    }

    console.log('[GROK] Could not find generate button');
    return false;
  }

  async _waitForVideoGeneration(timeout = 180) {
    console.log(`[GROK] Waiting for video generation (max ${timeout}s)...`);

    const startTime = Date.now();
    let lastLog = 0;
    let videoUrl = null;
    const MIN_WAIT_SECONDS = 15; // Minimum wait before looking for videos (generation takes 20-30s)

    // Collect initial video URLs to ignore (pre-existing videos)
    const initialVideoUrls = new Set();
    try {
      const videos = this.page.locator('video');
      const count = await videos.count();
      for (let i = 0; i < count; i++) {
        const src = await videos.nth(i).getAttribute('src').catch(() => null);
        if (src) initialVideoUrls.add(src);
      }
      console.log(`[GROK] Found ${initialVideoUrls.size} pre-existing video elements`);
    } catch (e) {}

    // Set up response listener to capture the video URL
    const responseHandler = async (response) => {
      const url = response.url();
      // Look for generated video URLs in responses
      if (url.includes('generated_video.mp4') ||
          (url.includes('.mp4') && url.includes('grok'))) {
        console.log(`[GROK] Detected video response: ${url.substring(0, 100)}...`);
        videoUrl = url;
      }
    };

    this.page.on('response', responseHandler);

    try {
      while ((Date.now() - startTime) / 1000 < timeout) {
        if (!this._running) return null;

        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        // Log every 15 seconds
        if (elapsed - lastLog >= 15) {
          console.log(`[GROK] ${elapsed}s elapsed...`);
          lastLog = elapsed;
        }

        // Check if we captured a video URL from response listener (only after min wait)
        if (videoUrl && elapsed >= MIN_WAIT_SECONDS) {
          console.log(`[GROK] Video URL captured via response! (${elapsed}s)`);
          await this.page.waitForTimeout(2000);
          return videoUrl;
        }

        // Only start looking for video elements after minimum wait time
        if (elapsed >= MIN_WAIT_SECONDS) {
          // Look for video element in the page
          try {
            const videoSelectors = [
              'video[src*=".mp4"]',
              'video source[src*=".mp4"]',
              '[data-video-url]',
              'video'
            ];

            for (const selector of videoSelectors) {
              const videos = this.page.locator(selector);
              const count = await videos.count();

              for (let i = 0; i < count; i++) {
                const video = videos.nth(i);

                let src = await video.getAttribute('src').catch(() => null);
                if (!src) {
                  src = await video.getAttribute('data-video-url').catch(() => null);
                }
                if (!src) {
                  const source = video.locator('source').first();
                  if (await source.count() > 0) {
                    src = await source.getAttribute('src').catch(() => null);
                  }
                }

                // Only return if it's a NEW video URL (not pre-existing)
                if (src && src.includes('.mp4') && !initialVideoUrls.has(src)) {
                  console.log(`[GROK] Found NEW video element with src (${elapsed}s)`);
                  videoUrl = src;
                  await this.page.waitForTimeout(2000);
                  return videoUrl;
                }
              }
            }
          } catch (e) {
            // Continue waiting
          }

          // Check page content for video URLs
          try {
            const pageContent = await this.page.content();
            const videoPattern = /https?:\/\/[^\s"'<>]+generated_video\.mp4[^\s"'<>]*/g;
            const matches = pageContent.match(videoPattern);

            if (matches && matches.length > 0) {
              const newUrl = matches[0].replace(/&amp;/g, '&');
              if (!initialVideoUrls.has(newUrl)) {
                videoUrl = newUrl;
                console.log(`[GROK] Found video URL in page content (${elapsed}s)`);
                await this.page.waitForTimeout(2000);
                return videoUrl;
              }
            }
          } catch (e) {
            // Continue waiting
          }
        }

        // Check for download button appearance (indicates video is ready) - only after min wait
        if (elapsed >= MIN_WAIT_SECONDS) {
          try {
            const downloadBtn = this.page.locator('button:has-text("Download"), [aria-label*="download" i], a[download]').first();
            if (await downloadBtn.count() > 0 && await downloadBtn.isVisible()) {
              console.log(`[GROK] Download button appeared (${elapsed}s)`);

              // Try to get URL from download button
              const href = await downloadBtn.getAttribute('href').catch(() => null);
              if (href && href.includes('.mp4')) {
                videoUrl = href;
                return videoUrl;
              }

              // Click download and capture the download URL
              try {
                const [download] = await Promise.all([
                  this.page.waitForEvent('download', { timeout: 10000 }),
                  downloadBtn.click()
                ]);

                if (download) {
                  const downloadUrl = download.url();
                  console.log(`[GROK] Captured download URL (${elapsed}s): ${downloadUrl.substring(0, 80)}...`);
                  await download.cancel(); // Cancel browser download, we'll download ourselves

                  // Prefer real URLs, but accept blob URLs after 35 seconds (video generation takes ~30s)
                  if (downloadUrl.startsWith('blob:')) {
                    if (elapsed >= 35) {
                      console.log(`[GROK] Accepting blob URL after ${elapsed}s wait`);
                      videoUrl = downloadUrl;
                      return videoUrl;
                    } else {
                      console.log(`[GROK] Ignoring early blob URL (${elapsed}s), waiting for video to finish generating...`);
                    }
                  } else {
                    videoUrl = downloadUrl;
                    return videoUrl;
                  }
                }
              } catch (e) {
                console.log('[GROK] Download button click failed:', e.message);
              }
            }
          } catch (e) {
            // Continue waiting
          }
        }

        await this.page.waitForTimeout(2000);
      }

      console.log('[GROK] Timeout waiting for video!');
      return null;

    } finally {
      // Remove response handler
      this.page.off('response', responseHandler);
    }
  }

  async _downloadVideo(videoUrl, outputPath) {
    console.log(`[GROK] Downloading video to ${path.basename(outputPath)}...`);
    console.log(`[GROK] Video URL: ${videoUrl.substring(0, 150)}...`);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Handle blob URLs specially - fetch via page context
    if (videoUrl.startsWith('blob:')) {
      console.log('[GROK] Handling blob URL via page context...');
      try {
        const videoData = await this.page.evaluate(async (blobUrl) => {
          try {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            return Array.from(uint8Array);
          } catch (e) {
            return null;
          }
        }, videoUrl);

        if (videoData && videoData.length > 500000) { // At least 500KB for valid video
          const buffer = Buffer.from(videoData);
          fs.writeFileSync(outputPath, buffer);
          const sizeMb = buffer.length / (1024 * 1024);
          console.log(`[GROK] Download complete via blob fetch (${sizeMb.toFixed(1)} MB)`);
          return true;
        } else {
          console.log('[GROK] Blob fetch returned invalid data, file too small or empty');
        }
      } catch (e) {
        console.log('[GROK] Blob fetch failed:', e.message);
      }
      return false; // Blob URL handling failed
    }

    // Method 1: Use browser anchor click (this works with Grok's signed URLs)
    try {
      console.log('[GROK] Trying browser download method...');
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 30000 }),
        this.page.evaluate((url) => {
          const a = document.createElement('a');
          a.href = url;
          a.download = 'video.mp4';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, videoUrl)
      ]);

      if (download) {
        await download.saveAs(outputPath);
        const stats = fs.statSync(outputPath);
        const sizeMb = stats.size / (1024 * 1024);
        console.log(`[GROK] Download complete via browser (${sizeMb.toFixed(1)} MB)`);

        // Validate file size - real videos should be at least 500KB
        if (stats.size < 500000) {
          console.log('[GROK] File too small, likely corrupted. Deleting and retrying...');
          fs.unlinkSync(outputPath);
          return false;
        }
        return true;
      }
    } catch (e) {
      console.log('[GROK] Browser download method failed:', e.message);
    }

    // Method 2: Use Playwright's request API
    try {
      console.log('[GROK] Trying Playwright request API...');
      const response = await this.page.request.get(videoUrl, {
        headers: {
          'Accept': 'video/mp4,video/*,*/*',
          'Referer': 'https://grok.com/'
        }
      });
      console.log(`[GROK] HTTP status: ${response.status()}`);

      if (response.ok()) {
        const body = await response.body();
        const sizeMb = body.length / (1024 * 1024);
        console.log(`[GROK] Download complete via API (${sizeMb.toFixed(1)} MB)`);

        // Validate file size
        if (body.length < 500000) {
          console.log('[GROK] File too small via API, likely corrupted');
          return false;
        }

        fs.writeFileSync(outputPath, body);
        return true;
      } else {
        console.log(`[GROK] API download failed: HTTP ${response.status()}`);
      }
    } catch (e) {
      console.log('[GROK] Playwright request API failed:', e.message);
    }

    return false;
  }

  async _downloadWithRetry(videoUrl, outputPath, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[GROK] Download attempt ${attempt}/${maxRetries}...`);
      if (await this._downloadVideo(videoUrl, outputPath)) {
        return true;
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    return false;
  }

  async retryDownload(videoUrl, outputPath) {
    console.log(`[GROK] Retry download: ${path.basename(outputPath)}...`);
    return await this._downloadWithRetry(videoUrl, outputPath, 3);
  }

  async convert(imagePath, outputPath, prompt, progressCallback) {
    // Support old signature: convert(imagePath, outputPath, progressCallback)
    if (typeof prompt === 'function') {
      progressCallback = prompt;
      prompt = '';
    }

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
          console.log(`[GROK] Retry attempt ${attempt}/${this.retryAttempts}`);
          update(`Retry ${attempt}/${this.retryAttempts}...`, 5);
        }

        if (!this.browser) {
          update('Starting browser...', 5);
          await this.start();
        } else {
          update('Opening fresh tab...', 5);
          await this._navigateToImagine();
        }

        // Select Video mode (Grok defaults to Image mode on /imagine)
        update('Selecting video mode...', 10);
        await this._selectVideoMode();

        update('Uploading image...', 20);
        if (!await this._uploadImage(imagePath)) {
          throw new Error('Failed to upload image');
        }

        update('Generating video...', 40);
        const videoUrl = await this._waitForVideoGeneration(180);

        if (!videoUrl) {
          throw new Error('Video generation timed out - could not detect video URL');
        }

        result.videoUrl = videoUrl;

        update('Downloading video...', 85);
        const downloadSuccess = await this._downloadWithRetry(videoUrl, outputPath);

        if (downloadSuccess) {
          update('Complete!', 100);
          result.success = true;
          return result;
        } else {
          result.success = false;
          result.videoUrl = videoUrl;
          result.downloadFailed = true;
          result.error = 'Download failed after retries';
          return result;
        }

      } catch (e) {
        result.error = e.message;
        console.log(`[GROK] Error: ${e.message}`);

        if (attempt < this.retryAttempts) {
          await this.page.waitForTimeout(2000);
          try {
            await this._navigateToImagine();
          } catch (e) {}
        }
      }
    }

    update(`Failed after ${this.retryAttempts} attempts`, -1);
    return result;
  }

  // Batch convert multiple images
  async convertBatch(images, outputDir, progressCallback) {
    const results = [];
    const total = images.length;

    for (let i = 0; i < images.length; i++) {
      if (!this._running) break;

      const imagePath = images[i];
      const baseName = path.basename(imagePath, path.extname(imagePath));
      const outputPath = path.join(outputDir, `${baseName}.mp4`);

      console.log(`[GROK] Processing ${i + 1}/${total}: ${baseName}`);

      const result = await this.convert(imagePath, outputPath, (stage, percent) => {
        if (progressCallback) {
          const overallPercent = Math.floor((i / total) * 100 + (percent / total));
          progressCallback({
            current: i + 1,
            total,
            fileName: baseName,
            stage,
            percent: overallPercent
          });
        }
      });

      results.push({
        input: imagePath,
        output: outputPath,
        ...result
      });

      // Delay between conversions
      if (i < images.length - 1 && this._running) {
        console.log(`[GROK] Waiting ${this.delayBetween}s before next...`);
        await new Promise(r => setTimeout(r, this.delayBetween * 1000));
      }
    }

    return results;
  }

  // Text to Image - Generate image from text prompt
  async generateImage(prompt, outputPath, progressCallback) {
    const result = {
      success: false,
      imagePath: null,
      error: null
    };

    const update = (stage, percent) => {
      if (progressCallback) {
        progressCallback(stage, percent);
      }
    };

    try {
      if (!this.browser) {
        update('Starting browser...', 5);
        await this.start();
      } else {
        update('Opening fresh tab...', 5);
        await this._navigateToImagine();
      }

      update('Entering prompt...', 15);

      // Find and fill the text input
      const inputSelectors = [
        'textarea[placeholder*="imagine" i]',
        'textarea[placeholder*="type" i]',
        'textarea[placeholder*="describe" i]',
        'div[contenteditable="true"]',
        'textarea'
      ];

      let inputFound = false;
      for (const selector of inputSelectors) {
        try {
          const input = this.page.locator(selector).first();
          if (await input.count() > 0 && await input.isVisible()) {
            await input.click();
            await input.fill(prompt);
            console.log(`[GROK] Entered prompt via: ${selector}`);
            inputFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!inputFound) {
        throw new Error('Could not find text input field');
      }

      await this.page.waitForTimeout(500);

      update('Generating image...', 25);

      // Click generate/send button
      await this._clickGenerateButton();

      // Wait for image to be generated
      update('Waiting for image...', 40);
      const imageUrl = await this._waitForImageGeneration(120);

      if (!imageUrl) {
        throw new Error('Image generation timed out');
      }

      update('Downloading image...', 80);

      // Download the image
      const downloadSuccess = await this._downloadImage(imageUrl, outputPath);

      if (downloadSuccess) {
        update('Image generated!', 100);
        result.success = true;
        result.imagePath = outputPath;
      } else {
        throw new Error('Failed to download generated image');
      }

    } catch (e) {
      result.error = e.message;
      console.log(`[GROK] Image generation error: ${e.message}`);
    }

    return result;
  }

  async _waitForImageGeneration(timeout = 120) {
    console.log(`[GROK] Waiting for image generation (max ${timeout}s)...`);

    const startTime = Date.now();
    let lastLog = 0;
    let imageUrl = null;

    // Get all large images on the page (potential generated outputs)
    const getGeneratedImages = async () => {
      try {
        const images = await this.page.evaluate(() => {
          const allImages = document.querySelectorAll('img');
          const generatedImages = [];

          for (const img of allImages) {
            const src = img.src || '';
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;

            // Filter for large images (generated images are typically > 200x200)
            // Exclude small avatars and icons
            if (width > 150 && height > 150 &&
                !src.includes('avatar') &&
                !src.includes('profile') &&
                !src.includes('icon') &&
                !src.includes('emoji') &&
                !src.includes('logo') &&
                src.length > 10) {
              generatedImages.push({ src, width, height });
            }
          }
          return generatedImages;
        });
        return images;
      } catch (e) {
        return [];
      }
    };

    const initialImages = await getGeneratedImages();
    console.log(`[GROK] Found ${initialImages.length} existing images`);
    const initialImageSet = new Set(initialImages);

    // Set up response listener to capture NEW image URLs
    const responseHandler = async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      // Look for generated image URLs in responses
      if (url.includes('/generated/') &&
          !url.includes('video') &&
          (contentType.includes('image') || url.match(/\.(png|jpg|jpeg|webp)(\?|$)/i))) {
        console.log(`[GROK] Detected generated image response: ${url.substring(0, 100)}...`);
        if (!initialImageSet.has(url)) {
          imageUrl = url;
        }
      }
    };

    this.page.on('response', responseHandler);

    try {
      while ((Date.now() - startTime) / 1000 < timeout) {
        if (!this._running) return null;

        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        if (elapsed - lastLog >= 10) {
          console.log(`[GROK] ${elapsed}s elapsed...`);
          lastLog = elapsed;
        }

        // Check if we captured a new image URL from response
        if (imageUrl) {
          console.log(`[GROK] Image URL captured! (${elapsed}s)`);
          await this.page.waitForTimeout(2000);
          return imageUrl;
        }

        // Look for NEW generated images in the page (not in our initial set)
        if (elapsed >= 5) {
          try {
            const currentImages = await getGeneratedImages();

            // Find new images that weren't in our initial set
            for (const src of currentImages) {
              if (!initialImageSet.has(src) && src.includes('/generated/')) {
                console.log(`[GROK] Found NEW generated image (${elapsed}s)`);
                imageUrl = src;
                await this.page.waitForTimeout(2000);
                return imageUrl;
              }
            }
          } catch (e) {
            // Continue waiting
          }
        }

        await this.page.waitForTimeout(2000);
      }

      console.log('[GROK] Timeout waiting for image!');
      return null;

    } finally {
      this.page.off('response', responseHandler);
    }
  }

  async _downloadImage(imageUrl, outputPath) {
    console.log(`[GROK] Downloading image to ${path.basename(outputPath)}...`);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Method 1: Right-click and save image directly from the page
    try {
      console.log('[GROK] Trying to save image from page...');
      // Find the generated image element and get its actual rendered content
      const imageElement = this.page.locator('img[src*="generated"], img[src*="assets.grok.com"]').first();
      if (await imageElement.count() > 0) {
        // Take a screenshot of just the image element as a fallback
        const boundingBox = await imageElement.boundingBox();
        if (boundingBox && boundingBox.width > 100 && boundingBox.height > 100) {
          // This image is large enough to be the generated image
          // Try to get the actual image data via page context
          const imageData = await this.page.evaluate(async (selector) => {
            const img = document.querySelector(selector);
            if (!img || !img.src) return null;

            // Create a canvas and draw the image
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Get base64 data
            return canvas.toDataURL('image/png').split(',')[1];
          }, 'img[src*="generated"], img[src*="assets.grok.com"]');

          if (imageData) {
            const buffer = Buffer.from(imageData, 'base64');
            fs.writeFileSync(outputPath, buffer);
            console.log(`[GROK] Image saved via canvas extraction`);
            return true;
          }
        }
      }
    } catch (e) {
      console.log('[GROK] Canvas extraction failed:', e.message);
    }

    // Method 2: Try browser download method with retry
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[GROK] Browser download attempt ${attempt}/3...`);
        const [download] = await Promise.all([
          this.page.waitForEvent('download', { timeout: 30000 }),
          this.page.evaluate((url) => {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'image.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, imageUrl)
        ]);

        if (download) {
          await download.saveAs(outputPath);
          console.log(`[GROK] Image download complete via browser`);
          return true;
        }
      } catch (e) {
        console.log(`[GROK] Browser download attempt ${attempt} failed:`, e.message);
        if (attempt < 3) {
          await this.page.waitForTimeout(2000);
        }
      }
    }

    return false;
  }

  // Text to Video - Directly generate video from text prompt (Grok does this natively)
  async textToVideo(prompt, outputDir, options = {}, progressCallback) {
    const { namingPattern = '{prompt}', aspectRatio = '9:16' } = options;

    const result = {
      success: false,
      videoPath: null,
      videoUrl: null,
      error: null
    };

    const update = (stage, percent) => {
      if (progressCallback) {
        progressCallback(stage, percent);
      }
    };

    try {
      // Create safe filename from prompt
      const safePrompt = prompt.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/_$/, '');
      const timestamp = Date.now();

      // Remove any extension from naming pattern to get base name
      let baseName = namingPattern
        .replace('{prompt}', safePrompt)
        .replace('{timestamp}', timestamp)
        .replace(/\.(mp4|png|jpg|jpeg)$/i, ''); // Remove extension if present

      const videoPath = path.join(outputDir, `${baseName}.mp4`);

      // Ensure browser is started
      if (!this.browser) {
        update('Starting browser...', 5);
        await this.start();
      } else {
        update('Opening fresh tab...', 5);
        await this._navigateToImagine();
      }

      // Step 1: Select "Video" mode from the dropdown
      update('Selecting video mode...', 10);
      await this._selectVideoMode();

      // Step 1.5: Select aspect ratio
      if (aspectRatio && aspectRatio !== '9:16') {
        update('Selecting aspect ratio...', 12);
        await this._selectAspectRatio(aspectRatio);
      }

      // Step 2: Enter the text prompt
      update('Entering prompt...', 15);
      if (!await this._typePrompt(prompt)) {
        throw new Error('Could not find text input field');
      }

      // Step 3: Click generate button
      update('Starting video generation...', 20);
      await this._clickGenerateButton();

      // Wait for video to be generated (same as image-to-video)
      update('Generating video...', 30);
      const videoUrl = await this._waitForVideoGeneration(180);

      if (!videoUrl) {
        throw new Error('Video generation timed out');
      }

      result.videoUrl = videoUrl;

      // Download the video
      update('Downloading video...', 85);
      const downloadSuccess = await this._downloadWithRetry(videoUrl, videoPath);

      if (downloadSuccess) {
        update('Complete!', 100);
        result.success = true;
        result.videoPath = videoPath;
      } else {
        result.success = false;
        result.downloadFailed = true;
        result.error = 'Download failed after retries';
      }

    } catch (e) {
      result.error = e.message;
      console.log(`[GROK] Text to video error: ${e.message}`);
    }

    return result;
  }
}

module.exports = { GrokConverter };
