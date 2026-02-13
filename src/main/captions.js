// ============================================
// Caption Generator & Styling
// ============================================

const fs = require('fs');
const path = require('path');

// Caption style templates
const CAPTION_TEMPLATES = {
  minimal: {
    name: 'Minimal',
    fontName: 'Arial',
    fontSize: 42,
    primaryColor: '&H00FFFFFF',
    secondaryColor: '&H00FFFFFF',
    outlineColor: '&H00000000',
    backColor: '&H80000000',
    bold: 0,
    outline: 2,
    shadow: 1,
    alignment: 2, // Bottom center
    marginV: 30,
    animation: 'fade'
  },
  boldPop: {
    name: 'Bold Pop',
    fontName: 'Arial Black',
    fontSize: 52,
    primaryColor: '&H00FFFFFF',
    secondaryColor: '&H0000FFFF',
    outlineColor: '&H00000000',
    backColor: '&H00000000',
    bold: 1,
    outline: 3,
    shadow: 0,
    alignment: 2,
    marginV: 40,
    animation: 'pop'
  },
  highlight: {
    name: 'Highlight',
    fontName: 'Arial',
    fontSize: 48,
    primaryColor: '&H00FFFFFF',
    secondaryColor: '&H0000FFFF',
    outlineColor: '&H00000000',
    backColor: '&H00000000',
    bold: 1,
    outline: 2,
    shadow: 1,
    alignment: 2,
    marginV: 35,
    animation: 'highlight'
  },
  box: {
    name: 'Box Background',
    fontName: 'Arial',
    fontSize: 44,
    primaryColor: '&H00FFFFFF',
    secondaryColor: '&H00FFFFFF',
    outlineColor: '&H00000000',
    backColor: '&HCC000000',
    bold: 0,
    outline: 0,
    shadow: 0,
    alignment: 2,
    marginV: 30,
    borderStyle: 3, // Opaque box
    animation: 'none'
  },
  hormozi: {
    name: 'Hormozi Style',
    fontName: 'Impact',
    fontSize: 64,
    primaryColor: '&H00FFFFFF',
    secondaryColor: '&H0000FF00',
    outlineColor: '&H00000000',
    backColor: '&H00000000',
    bold: 1,
    outline: 4,
    shadow: 2,
    alignment: 5, // Center
    marginV: 0,
    animation: 'none'
  },
  karaoke: {
    name: 'Karaoke',
    fontName: 'Arial',
    fontSize: 48,
    primaryColor: '&H00FFFFFF',
    secondaryColor: '&H0000FFFF',
    outlineColor: '&H00000000',
    backColor: '&H00000000',
    bold: 1,
    outline: 2,
    shadow: 1,
    alignment: 2,
    marginV: 35,
    animation: 'karaoke'
  },
  outline: {
    name: 'Outline',
    fontName: 'Arial Black',
    fontSize: 50,
    primaryColor: '&H00FFFFFF',
    secondaryColor: '&H00FFFFFF',
    outlineColor: '&H00000000',
    backColor: '&H00000000',
    bold: 1,
    outline: 4,
    shadow: 0,
    alignment: 2,
    marginV: 35,
    animation: 'none'
  },
  gradient: {
    name: 'Gradient',
    fontName: 'Arial',
    fontSize: 48,
    primaryColor: '&H00FF88FF',
    secondaryColor: '&H00FFFF00',
    outlineColor: '&H00000000',
    backColor: '&H00000000',
    bold: 1,
    outline: 2,
    shadow: 1,
    alignment: 2,
    marginV: 35,
    animation: 'none'
  }
};

// Font size multipliers
const SIZE_MULTIPLIERS = {
  small: 0.8,
  medium: 1.0,
  large: 1.25
};

// Position alignments
const POSITION_ALIGNMENTS = {
  top: 8,      // Top center
  center: 5,   // Middle center
  bottom: 2    // Bottom center
};

class CaptionGenerator {
  constructor() {
    this.templates = CAPTION_TEMPLATES;
  }

  // Get available templates
  getTemplates() {
    return Object.entries(this.templates).map(([id, template]) => ({
      id,
      name: template.name
    }));
  }

  // Convert color from hex to ASS format (&HAABBGGRR)
  hexToASS(hex) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Convert to ASS format (BGR)
    const bHex = b.toString(16).padStart(2, '0').toUpperCase();
    const gHex = g.toString(16).padStart(2, '0').toUpperCase();
    const rHex = r.toString(16).padStart(2, '0').toUpperCase();

    return `&H00${bHex}${gHex}${rHex}`;
  }

  // Generate ASS subtitle file from caption data
  generateASS(captionData, settings, outputPath) {
    const template = this.templates[settings.template] || this.templates.minimal;

    // Apply user customizations
    const fontSize = Math.round(template.fontSize * SIZE_MULTIPLIERS[settings.size || 'medium']);
    const alignment = POSITION_ALIGNMENTS[settings.position || 'bottom'];
    const primaryColor = settings.color ? this.hexToASS(settings.color) : template.primaryColor;
    const secondaryColor = settings.highlight ? this.hexToASS(settings.highlight) : template.secondaryColor;

    // Determine font name
    let fontName = settings.font || template.fontName;
    // Map common fonts
    const fontMap = {
      'Montserrat': 'Arial',
      'Roboto': 'Arial',
      'Poppins': 'Arial'
    };
    fontName = fontMap[fontName] || fontName;

    // Build ASS file content
    let ass = `[Script Info]
Title: Generated Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},${secondaryColor},${template.outlineColor},${settings.background ? '&H80000000' : template.backColor},${template.bold},0,0,0,100,100,0,0,${settings.background ? 3 : 1},${template.outline},${template.shadow},${alignment},10,10,${template.marginV},1
Style: Highlight,${fontName},${Math.round(fontSize * 1.1)},${secondaryColor},${secondaryColor},${template.outlineColor},${template.backColor},1,0,0,0,100,100,0,0,1,${template.outline + 1},${template.shadow},${alignment},10,10,${template.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Add dialogue lines
    if (captionData.segments) {
      for (const segment of captionData.segments) {
        const startTime = this.formatASSTime(segment.start);
        const endTime = this.formatASSTime(segment.end);
        let text = this.escapeASSText(segment.text);

        // Apply animation based on template
        if (template.animation === 'fade') {
          text = `{\\fad(200,200)}${text}`;
        } else if (template.animation === 'pop') {
          text = `{\\fad(100,100)\\t(0,100,\\fscx110\\fscy110)\\t(100,200,\\fscx100\\fscy100)}${text}`;
        } else if (template.animation === 'karaoke' && segment.words) {
          // Word-by-word karaoke effect
          text = this.generateKaraokeText(segment.words);
        } else if (template.animation === 'highlight' && segment.words) {
          // Highlight current word
          text = this.generateHighlightText(segment.words, secondaryColor);
        }

        ass += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
      }
    } else if (captionData.text) {
      // Simple text without timing
      ass += `Dialogue: 0,0:00:00.00,0:00:10.00,Default,,0,0,0,,${this.escapeASSText(captionData.text)}\n`;
    }

    // Write file
    fs.writeFileSync(outputPath, ass, 'utf-8');
    return outputPath;
  }

  // Format time for ASS (H:MM:SS.cs)
  formatASSTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);

    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  }

  // Escape special characters for ASS
  escapeASSText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\n/g, '\\N');
  }

  // Generate karaoke-style text with word timing
  generateKaraokeText(words) {
    let text = '';
    for (const word of words) {
      const duration = Math.round((word.end - word.start) * 100);
      text += `{\\kf${duration}}${word.text} `;
    }
    return text.trim();
  }

  // Generate highlight text (current word highlighted)
  generateHighlightText(words, highlightColor) {
    // For highlight effect, we'd need to generate multiple dialogue lines
    // This is a simplified version
    return words.map(w => w.text).join(' ');
  }

  // Parse SRT file to caption data
  parseSRT(srtContent) {
    const segments = [];
    const blocks = srtContent.trim().split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

        if (timeMatch) {
          const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
          const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
          const text = lines.slice(2).join(' ');

          segments.push({ start, end, text });
        }
      }
    }

    return { segments };
  }

  // Generate simple captions from text (without timing)
  generateSimpleCaptions(text, duration, wordsPerSegment = 6) {
    const words = text.split(/\s+/);
    const segments = [];
    const segmentDuration = duration / Math.ceil(words.length / wordsPerSegment);

    for (let i = 0; i < words.length; i += wordsPerSegment) {
      const segmentWords = words.slice(i, i + wordsPerSegment);
      const start = (i / wordsPerSegment) * segmentDuration;
      const end = start + segmentDuration;

      segments.push({
        start,
        end,
        text: segmentWords.join(' ')
      });
    }

    return { segments };
  }
}

module.exports = CaptionGenerator;
