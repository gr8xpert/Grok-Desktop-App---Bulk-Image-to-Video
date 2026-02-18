const { contextBridge, ipcRenderer } = require('electron');

// Helper to safely register event listeners (removes previous to prevent leaks)
function onEvent(channel, callback) {
  ipcRenderer.removeAllListeners(channel);
  ipcRenderer.on(channel, (event, data) => callback(data));
}

contextBridge.exposeInMainWorld('api', {
  // Config
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // File dialogs
  selectFolder: (type) => ipcRenderer.invoke('select-folder', type),
  selectFiles: () => ipcRenderer.invoke('select-files'),

  // Scanning
  scanFolder: (path, includeSubfolders) => ipcRenderer.invoke('scan-folder', path, includeSubfolders),
  getThumbnail: (path) => ipcRenderer.invoke('get-thumbnail', path),

  // Cookies (Grok)
  validateCookies: (cookies) => ipcRenderer.invoke('validate-cookies', cookies),

  // Conversion (Grok)
  startConversion: (options) => ipcRenderer.invoke('start-conversion', options),
  stopConversion: () => ipcRenderer.invoke('stop-conversion'),
  onProgress: (callback) => onEvent('conversion-progress', callback),

  // Text to Video (Grok)
  startTextToVideo: (options) => ipcRenderer.invoke('start-text-to-video', options),
  onTTVProgress: (callback) => onEvent('ttv-progress', callback),
  importPromptsFile: () => ipcRenderer.invoke('import-prompts-file'),

  // History
  getHistory: (options) => ipcRenderer.invoke('get-history', options),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Resume
  getResumeData: () => ipcRenderer.invoke('get-resume-data'),
  saveResumeData: (data) => ipcRenderer.invoke('save-resume-data', data),

  // Utilities
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  showInFolder: (path) => ipcRenderer.invoke('show-in-folder', path),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  getPresets: () => ipcRenderer.invoke('get-presets'),
  fileExists: (path) => ipcRenderer.invoke('file-exists', path),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Retry download
  retryDownload: (data) => ipcRenderer.invoke('retry-download', data),

  // Gallery
  scanGallery: (folderPath) => ipcRenderer.invoke('scan-gallery', folderPath),
  deleteGalleryItem: (filePath) => ipcRenderer.invoke('delete-gallery-item', filePath),

  // Image Editing
  loadImageForEdit: (imagePath) => ipcRenderer.invoke('load-image-for-edit', imagePath),
  previewImageEdit: (data) => ipcRenderer.invoke('preview-image-edit', data),
  saveEditedImage: (data) => ipcRenderer.invoke('save-edited-image', data),

  // Advanced Image Editing
  rotateImage: (data) => ipcRenderer.invoke('rotate-image', data),
  flipImage: (data) => ipcRenderer.invoke('flip-image', data),
  cropImage: (data) => ipcRenderer.invoke('crop-image', data),
  resizeImage: (data) => ipcRenderer.invoke('resize-image', data),
  addWatermark: (data) => ipcRenderer.invoke('add-watermark', data),
  exportImage: (data) => ipcRenderer.invoke('export-image', data),

  // Upscaling
  upscaleBasic: (data) => ipcRenderer.invoke('upscale-basic', data),
  upscaleAI: (data) => ipcRenderer.invoke('upscale-ai', data),
  checkRealesrgan: () => ipcRenderer.invoke('check-realesrgan'),
  installRealesrgan: () => ipcRenderer.invoke('install-realesrgan'),
  onRealesrganProgress: (callback) => onEvent('realesrgan-progress', callback),

  // Presets
  savePreset: (data) => ipcRenderer.invoke('save-preset', data),
  loadPresets: () => ipcRenderer.invoke('load-presets'),
  deletePreset: (data) => ipcRenderer.invoke('delete-preset', data),

  // Batch & Thumbnails
  generateThumbnails: (data) => ipcRenderer.invoke('generate-thumbnails', data),
  batchEditImages: (data) => ipcRenderer.invoke('batch-edit-images', data),
  onBatchEditProgress: (callback) => onEvent('batch-edit-progress', callback),

  // Bulk Upscale
  startBulkUpscale: (options) => ipcRenderer.invoke('start-bulk-upscale', options),
  stopBulkUpscale: () => ipcRenderer.invoke('stop-bulk-upscale'),
  onBulkUpscaleProgress: (callback) => onEvent('bulk-upscale-progress', callback),

  // Video Editor
  selectVideos: () => ipcRenderer.invoke('select-videos'),
  selectAudio: () => ipcRenderer.invoke('select-audio'),
  getVideoInfo: (path) => ipcRenderer.invoke('get-video-info', path),
  exportVideo: (options) => ipcRenderer.invoke('export-video', options),
  cancelVideoExport: () => ipcRenderer.invoke('cancel-video-export'),
  checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg'),
  onVideoExportProgress: (callback) => onEvent('video-export-progress', callback)
});
