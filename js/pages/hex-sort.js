// hex color sorter app for /web-projects/hex-sort.html

var colors = [];
var STORAGE_KEY = 'hex-sort-colors';

// dom refs
var hexInput = document.getElementById('hex-input');
var addBtn = document.getElementById('add-btn');
var status = document.getElementById('status');
var colorGrid = document.getElementById('color-grid');
var countEl = document.getElementById('count');
var sortHueBtn = document.getElementById('sort-hue');
var sortLumBtn = document.getElementById('sort-lum');
var clearBtn = document.getElementById('clear-all');
var exportBtn = document.getElementById('export-btn');
var importBtn = document.getElementById('import-btn');

// color conversion
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var l = (max + min) / 2;
  var h = 0;
  var s = 0;

  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d) + (g < b ? 6 : 0); break;
      case g: h = ((b - r) / d) + 2; break;
      case b: h = ((r - g) / d) + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

// validation
function normalizeHex(input) {
  var hex = input.trim().toLowerCase();
  if (hex.startsWith('#')) hex = hex.substring(1);
  if (!/^[0-9a-f]{6}$/.test(hex)) return null;
  return '#' + hex;
}

// persistence
function saveColors() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch (e) {
    console.error('failed to save:', e);
  }
}

function loadColors() {
  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      colors = JSON.parse(stored);
      render();
    }
  } catch (e) {
    console.error('failed to load:', e);
  }
}

// rendering
function render() {
  colorGrid.innerHTML = '';
  countEl.textContent = colors.length;

  if (colors.length === 0) {
    colorGrid.innerHTML = '<p class="small" style="grid-column:1/-1;">no colors yet.</p>';
    return;
  }

  colors.forEach(function (hex, index) {
    var square = document.createElement('div');
    square.className = 'color-square';
    square.style.backgroundColor = hex;
    square.title = hex;
    square.addEventListener('click', function () { removeColor(index); });
    colorGrid.appendChild(square);
  });
}

// actions
function addColor() {
  var normalized = normalizeHex(hexInput.value);
  if (!normalized) {
    status.textContent = 'invalid hex format. use #ff0000 or ff0000';
    status.style.color = 'var(--accent)';
    return;
  }

  if (colors.includes(normalized)) {
    status.textContent = 'color already in collection.';
    status.style.color = 'var(--muted)';
    return;
  }

  colors.push(normalized);
  saveColors();
  render();
  hexInput.value = '';
  status.textContent = 'added ' + normalized + '. total: ' + colors.length;
  status.style.color = 'var(--text)';
}

function removeColor(index) {
  var removed = colors[index];
  colors.splice(index, 1);
  saveColors();
  render();
  status.textContent = 'removed ' + removed + '. total: ' + colors.length;
  status.style.color = 'var(--text)';
}

function sortByHue() {
  colors.sort(function (a, b) {
    var rgb1 = hexToRgb(a);
    var rgb2 = hexToRgb(b);
    var hsl1 = rgbToHsl(rgb1[0], rgb1[1], rgb1[2]);
    var hsl2 = rgbToHsl(rgb2[0], rgb2[1], rgb2[2]);

    if (Math.abs(hsl1[0] - hsl2[0]) > 1) return hsl1[0] - hsl2[0];
    if (Math.abs(hsl1[1] - hsl2[1]) > 1) return hsl2[1] - hsl1[1];
    return hsl1[2] - hsl2[2];
  });
  saveColors();
  render();
  status.textContent = 'sorted by hue (red\u2192purple).';
  status.style.color = 'var(--text)';
}

function sortByLuminance() {
  colors.sort(function (a, b) {
    var rgb1 = hexToRgb(a);
    var rgb2 = hexToRgb(b);
    var hsl1 = rgbToHsl(rgb1[0], rgb1[1], rgb1[2]);
    var hsl2 = rgbToHsl(rgb2[0], rgb2[1], rgb2[2]);
    return hsl1[2] - hsl2[2];
  });
  saveColors();
  render();
  status.textContent = 'sorted by luminance (light\u2192dark).';
  status.style.color = 'var(--text)';
}

function clearAll() {
  if (colors.length === 0) return;
  if (!confirm('clear all ' + colors.length + ' colors?')) return;
  colors = [];
  saveColors();
  render();
  status.textContent = 'cleared all colors.';
  status.style.color = 'var(--text)';
}

async function exportColors() {
  if (colors.length === 0) {
    status.textContent = 'no colors to export.';
    status.style.color = 'var(--muted)';
    return;
  }

  var json = JSON.stringify(colors, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    status.textContent = 'copied ' + colors.length + ' colors to clipboard.';
    status.style.color = 'var(--text)';
  } catch (e) {
    status.textContent = 'failed to copy. check console for JSON.';
    status.style.color = 'var(--accent)';
    console.log('export json:', json);
  }
}

async function importColors() {
  try {
    var text = await navigator.clipboard.readText();
    var imported = JSON.parse(text);

    if (!Array.isArray(imported)) {
      throw new Error('not an array');
    }

    var valid = imported.filter(function (item) {
      return normalizeHex(item) !== null;
    }).map(function (item) {
      return normalizeHex(item);
    });

    if (valid.length === 0) {
      status.textContent = 'no valid hex colors found.';
      status.style.color = 'var(--accent)';
      return;
    }

    var merged = Array.from(new Set(colors.concat(valid)));
    colors = merged;
    saveColors();
    render();
    status.textContent = 'imported ' + valid.length + ' colors. total: ' + colors.length;
    status.style.color = 'var(--text)';
  } catch (e) {
    status.textContent = 'import failed. paste JSON array: ["#ff0000", "#00ff00"]';
    status.style.color = 'var(--accent)';
  }
}

// event listeners
addBtn.addEventListener('click', addColor);
hexInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') addColor();
});
sortHueBtn.addEventListener('click', sortByHue);
sortLumBtn.addEventListener('click', sortByLuminance);
clearBtn.addEventListener('click', clearAll);
exportBtn.addEventListener('click', exportColors);
importBtn.addEventListener('click', importColors);

// init
loadColors();
