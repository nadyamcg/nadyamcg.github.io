// midi to grub tune converter
// handles ui interactions and orchestrates conversion/playback
(function() {
  'use strict';

  // state
  let currentMidiData = null;

  // DOM Elements (cached after init)
  const el = {};

  // initialize application and set up event listeners
  function init() {
    cacheElements();
    syncSliderDisplays();
    syncDevModeState();
    setupEventListeners();
    setupTuneEditor();
    setupExampleGallery();
    checkUrlParams();
  }

  // sync slider display values with actual slider values (fixes browser autocomplete)
  function syncSliderDisplays() {
    el.durationValue.textContent = el.durationLimit.value;
    el.volumeValue.textContent = el.volumeSlider.value;
  }

  // sync dev mode state on page load (fixes browser persistence of checkbox state)
  function syncDevModeState() {
    if (el.devModeToggle.checked) {
      el.devModeWarning.classList.remove('hidden');
      el.durationLimit.disabled = true;
      el.durationValue.textContent = '∞';
    }
  }

  // cache dom element references for quick access
  function cacheElements() {
    // file upload
    el.dropZone = document.getElementById('drop-zone');
    el.fileInput = document.getElementById('file-input');
    el.fileInfo = document.getElementById('file-info');
    el.fileName = document.getElementById('file-name');
    el.clearFile = document.getElementById('clear-file');

    // track selection
    el.trackSection = document.getElementById('track-section');
    el.trackSelect = document.getElementById('track-select');
    el.trackInfo = document.getElementById('track-info');
    el.trackNoteCount = document.getElementById('track-note-count');

    // options
    el.optionsSection = document.getElementById('options-section');
    el.polyphonyMode = document.getElementById('polyphony-mode');
    el.durationLimit = document.getElementById('duration-limit');
    el.durationValue = document.getElementById('duration-value');
    el.convertBtn = document.getElementById('convert-btn');

    // settings
    el.volumeSlider = document.getElementById('volume-slider');
    el.volumeValue = document.getElementById('volume-value');

    // dev mode
    el.devModeToggle = document.getElementById('dev-mode-toggle');
    el.devModeWarning = document.getElementById('dev-mode-warning');

    // unified tune editor
    el.tuneEditorSection = document.getElementById('tune-editor-section');
    el.tuneInput = document.getElementById('tune-input');
    el.tuneSyntaxDisplay = document.getElementById('tune-syntax-display');
    el.tuneWarnings = document.getElementById('tune-warnings');
    el.tuneWarningList = document.getElementById('tune-warning-list');
    el.tuneInfo = document.getElementById('tune-info');
    el.tuneNoteCount = document.getElementById('tune-note-count');
    el.tuneDuration = document.getElementById('tune-duration');
    el.tuneTempo = document.getElementById('tune-tempo');
    el.playTuneBtn = document.getElementById('play-tune-btn');
    el.stopTuneBtn = document.getElementById('stop-tune-btn');
    el.copyTuneBtn = document.getElementById('copy-tune-btn');
    el.shareTuneBtn = document.getElementById('share-tune-btn');
    el.tuneFeedback = document.getElementById('tune-feedback');
    el.clearTuneBtn = document.getElementById('clear-tune-btn');

    // export modal
    el.exportAudioBtn = document.getElementById('export-audio-btn');
    el.exportModal = document.getElementById('export-modal');
    el.exportDuration = document.getElementById('export-duration');
    el.exportSizeEstimate = document.getElementById('export-size-estimate');
    el.exportCancelBtn = document.getElementById('export-cancel-btn');
    el.exportDownloadBtn = document.getElementById('export-download-btn');
    el.exportProgress = document.getElementById('export-progress');
  }

  // set up event listeners for ui interactions
  function setupEventListeners() {
    // drag and drop
    setupDragDrop();

    // file input change
    el.fileInput.addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    // clear file button
    el.clearFile.addEventListener('click', resetState);

    // track selection
    el.trackSelect.addEventListener('change', function() {
      const trackIndex = parseInt(this.value, 10);
      if (!isNaN(trackIndex) && currentMidiData) {
        const trackInfo = MidiConverter.getTrackInfo(currentMidiData.track[trackIndex]);
        showTrackInfo(trackInfo.noteCount);
      } else {
        hideSection(el.optionsSection);
      }
    });

    // duration slider
    el.durationLimit.addEventListener('input', function() {
      el.durationValue.textContent = this.value;
    });

    // volume slider
    el.volumeSlider.addEventListener('input', function() {
      el.volumeValue.textContent = this.value;
      if (AudioPlayer.isPlaying()) {
        AudioPlayer.setVolume(parseInt(this.value, 10) / 100 * AudioPlayer.MAX_VOLUME);
      }
    });

    // dev mode toggle
    el.devModeToggle.addEventListener('change', function() {
      if (this.checked) {
        el.devModeWarning.classList.remove('hidden');
        el.durationLimit.disabled = true;
        el.durationValue.textContent = '∞';
      } else {
        el.devModeWarning.classList.add('hidden');
        el.durationLimit.disabled = false;
        el.durationValue.textContent = el.durationLimit.value;
      }
    });

    // convert button
    el.convertBtn.addEventListener('click', convertSelectedTrack);

    // tune editor: play button
    el.playTuneBtn.addEventListener('click', function() {
      const tune = el.tuneInput.value.trim();
      if (!tune) return;

      const validation = AudioPlayer.validate(tune);
      if (!validation.valid) {
        showTuneFeedback(validation.error, true);
        return;
      }

      setPlaybackState(true);
      AudioPlayer.play(tune, parseInt(el.volumeSlider.value, 10) / 100 * AudioPlayer.MAX_VOLUME, function() {
        setPlaybackState(false);
      });
    });

    // tune editor: stop button
    el.stopTuneBtn.addEventListener('click', function() {
      AudioPlayer.stop();
      setPlaybackState(false);
    });

    // tune editor: copy button
    el.copyTuneBtn.addEventListener('click', function() {
      const tune = el.tuneInput.value.trim().replace(/\s+/g, ' ');
      copyToClipboard(tune, el.tuneFeedback, 'Copied!');

      // visual feedback on button
      const originalBg = this.style.backgroundColor;
      this.style.backgroundColor = 'var(--lavender-grey)';
      setTimeout(() => {
        this.style.backgroundColor = originalBg;
      }, 200);
    });

    // tune editor: share button
    el.shareTuneBtn.addEventListener('click', function() {
      const tune = el.tuneInput.value.trim().replace(/\s+/g, '+');
      const url = new URL(window.location.href);
      url.search = '?tune=' + encodeURIComponent(tune);
      copyToClipboard(url.href, el.tuneFeedback, 'URL copied!');

      // visual feedback on button
      const originalBg = this.style.backgroundColor;
      this.style.backgroundColor = 'var(--lavender-grey)';
      setTimeout(() => {
        this.style.backgroundColor = originalBg;
      }, 200);
    });

    // tune editor: clear button
    el.clearTuneBtn.addEventListener('click', function() {
      el.tuneInput.value = '';
      el.tuneSyntaxDisplay.innerHTML = '';
      el.tuneInfo.classList.add('hidden');
      el.tuneWarnings.classList.add('hidden');
      updateTuneEditorState('empty');
    });

    // export audio button
    el.exportAudioBtn.addEventListener('click', function() {
      const tune = el.tuneInput.value.trim();
      if (!tune) return;

      const validation = AudioPlayer.validate(tune);
      if (!validation.valid) return;

      const info = AudioPlayer.getTuneInfo(tune);
      el.exportDuration.textContent = (info.durationMs / 1000).toFixed(1) + 's';

      const samples = (info.durationMs / 1000) * 44100;
      const wavSize = Math.round((samples * 2 + 44) / 1024);
      const oggSize = Math.round(wavSize * 0.1);

      el.exportSizeEstimate.textContent = '~' + wavSize + 'KB (WAV) or ~' + oggSize + 'KB (OGG)';

      el.exportModal.classList.remove('hidden');
      el.exportProgress.classList.add('hidden');

      // visual feedback on button
      const originalBg = this.style.backgroundColor;
      this.style.backgroundColor = 'var(--lavender-grey)';
      setTimeout(() => {
        this.style.backgroundColor = originalBg;
      }, 200);
    });

    el.exportCancelBtn.addEventListener('click', function() {
      el.exportModal.classList.add('hidden');
    });

    el.exportDownloadBtn.addEventListener('click', function() {
      const tune = el.tuneInput.value.trim();
      const format = document.querySelector('input[name="export-format"]:checked').value;

      el.exportProgress.classList.remove('hidden');
      el.exportDownloadBtn.disabled = true;

      AudioPlayer.exportAudio(tune, format).then(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grub-tune-' + Date.now() + '.' + format;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        el.exportModal.classList.add('hidden');
        el.exportDownloadBtn.disabled = false;
        el.exportProgress.classList.add('hidden');
      }).catch(function(err) {
        console.error('Export error:', err);
        el.exportDownloadBtn.disabled = false;
        el.exportProgress.classList.add('hidden');
      });
    });

    el.exportModal.querySelector('.export-modal-overlay').addEventListener('click', function() {
      el.exportModal.classList.add('hidden');
    });
  }

  // set up drag and drop file upload handlers
  function setupDragDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
      el.dropZone.addEventListener(eventName, function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(function(eventName) {
      el.dropZone.addEventListener(eventName, function() {
        el.dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(function(eventName) {
      el.dropZone.addEventListener(eventName, function() {
        el.dropZone.classList.remove('drag-over');
      });
    });

    el.dropZone.addEventListener('drop', function(e) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    });
  }

  // set up tune editor with textarea input and syntax-highlighted display
  function setupTuneEditor() {
    const input = el.tuneInput;
    const display = el.tuneSyntaxDisplay;

    // clear any browser-cached values on page load
    input.value = '';
    display.innerHTML = '';
    el.tuneInfo.classList.add('hidden');
    el.tuneWarnings.classList.add('hidden');
    updateTuneEditorState('empty');

    // disable play button initially since input is empty
    el.playTuneBtn.disabled = true;

    // real-time syntax highlighting on input
    input.addEventListener('input', function() {
      const text = this.value || '';

      // update syntax-highlighted display
      display.innerHTML = applySyntaxHighlighting(text);

      // update info and state
      if (text.trim() === '') {
        el.tuneInfo.classList.add('hidden');
        updateTuneEditorState('empty');
        el.playTuneBtn.disabled = true; // disable play button when empty
      } else {
        const validation = AudioPlayer.validate(text);
        if (validation.valid) {
          updateTuneInfo(text);
          updateTuneEditorState('valid');
          el.playTuneBtn.disabled = false; // enable play button when valid
          // hide any previous error messages
          el.tuneFeedback.classList.add('hidden');
        } else {
          updateTuneEditorState('error');
          el.playTuneBtn.disabled = true; // disable play button on error
          // display the specific error message
          showTuneFeedback(validation.error, true);
        }
      }
    });

    // sync scroll between textarea and display
    input.addEventListener('scroll', function() {
      display.scrollTop = this.scrollTop;
      display.scrollLeft = this.scrollLeft;
    });
  }

  // apply syntax highlighting to tune string, preserving exact whitespace
  function applySyntaxHighlighting(tuneString) {
    if (!tuneString) return '';

    // match tokens (non-whitespace) and whitespace separately to preserve exact spacing
    const tokens = tuneString.match(/\S+|\s+/g);
    if (!tokens) return '';

    let html = '';
    let tokenIndex = 0; // counts only non-whitespace tokens

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // if whitespace, preserve it exactly
      if (/^\s+$/.test(token)) {
        html += token;
        continue;
      }

      // non-whitespace token, apply highlighting based on position
      if (tokenIndex === 0) {
        // first token is tempo
        html += '<span class="tune-tempo" data-label="tempo">' + escapeHtml(token) + '</span>';
      } else {
        // alternating freq/duration pairs (1-indexed: odd=freq, even=duration)
        const pairPosition = (tokenIndex - 1) % 2;
        if (pairPosition === 0) {
          // frequency
          const isRest = parseInt(token, 10) === 0;
          const freqClass = isRest ? 'tune-rest' : 'tune-frequency';
          const freqLabel = isRest ? 'rest' : 'pitch (Hz)';
          html += '<span class="' + freqClass + '" data-label="' + freqLabel + '">' + escapeHtml(token) + '</span>';
        } else {
          // duration
          html += '<span class="tune-duration" data-label="duration (ticks)">' + escapeHtml(token) + '</span>';
        }
      }

      tokenIndex++;
    }

    return html;
  }

  // escape HTML special characters
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // update tune info display with note count, duration, and tempo
  function updateTuneInfo(tuneString) {
    const info = AudioPlayer.getTuneInfo(tuneString);
    if (!info) {
      el.tuneInfo.classList.add('hidden');
      return;
    }

    el.tuneNoteCount.textContent = info.noteCount;
    el.tuneDuration.textContent = Math.round(info.durationMs) + 'ms';
    el.tuneTempo.textContent = info.tempo;
    el.tuneInfo.classList.remove('hidden');
  }

  // update tune editor border color based on state (valid, error, or midi output)
  function updateTuneEditorState(state) {
    const wrapper = document.querySelector('.tune-editor-wrapper');
    wrapper.classList.remove('has-content', 'has-error', 'has-midi-output');

    if (state === 'valid') {
      wrapper.classList.add('has-content');
    } else if (state === 'error') {
      wrapper.classList.add('has-error');
    } else if (state === 'midi-output') {
      wrapper.classList.add('has-midi-output');
    }
  }

  // load midi output into tune editor (shows overwrite warning if content exists)
  function loadMidiOutputIntoEditor(result) {
    const currentContent = el.tuneInput.value.trim();

    if (currentContent && currentContent !== result.tuneString) {
      showOverwriteWarning(result);
    } else {
      applyMidiOutput(result);
    }
  }

  // show modal warning before overwriting existing tune content
  function showOverwriteWarning(newResult) {
    const overlay = document.createElement('div');
    overlay.className = 'tune-overlay';

    const warning = document.createElement('div');
    warning.className = 'tune-overwrite-warning';
    warning.innerHTML = '<h3>overwrite existing tune?</h3>' +
      '<p>the tune editor already contains content!</p>' +
      '<div class="warning-actions">' +
      '<button class="btn-secondary" data-action="cancel">cancel</button>' +
      '<button class="btn-primary" data-action="replace">replace</button>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(warning);

    const closeModal = function() {
      document.body.removeChild(overlay);
      document.body.removeChild(warning);
    };

    warning.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);

    warning.querySelector('[data-action="replace"]').addEventListener('click', function() {
      closeModal();
      applyMidiOutput(newResult);
    });
  }

  // apply midi conversion result to editor with warnings and syntax highlighting
  function applyMidiOutput(result) {
    // stop any current playback
    AudioPlayer.stop();
    setPlaybackState(false);

    showSection(el.tuneEditorSection);

    // show warnings if any
    if (result.warnings && result.warnings.length > 0) {
      el.tuneWarningList.innerHTML = '';
      result.warnings.forEach(function(warning) {
        const li = document.createElement('li');
        li.textContent = warning;
        el.tuneWarningList.appendChild(li);
      });
      el.tuneWarnings.classList.remove('hidden');
    } else {
      el.tuneWarnings.classList.add('hidden');
    }

    // set content with syntax highlighting
    el.tuneInput.value = result.tuneString;
    el.tuneSyntaxDisplay.innerHTML = applySyntaxHighlighting(result.tuneString);
    updateTuneInfo(result.tuneString);
    updateTuneEditorState('midi-output');

    // enable play button if content is valid
    const validation = AudioPlayer.validate(result.tuneString);
    el.playTuneBtn.disabled = !validation.valid;

    // scroll into view
    el.tuneEditorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // set up example tune gallery with preview and copy buttons
  function setupExampleGallery() {
    const cards = document.querySelectorAll('.example-card');

    cards.forEach(function(card) {
      const tuneData = card.getAttribute('data-tune');
      const previewBtn = card.querySelector('.example-preview-btn');
      const copyBtn = card.querySelector('.example-copy-btn');

      // preview button: load into editor
      previewBtn.addEventListener('click', function(e) {
        e.stopPropagation();

        const result = {
          tuneString: tuneData,
          noteCount: 0,
          durationMs: 0,
          warnings: []
        };

        const info = AudioPlayer.getTuneInfo(tuneData);
        if (info) {
          result.noteCount = info.noteCount;
          result.durationMs = info.durationMs;
        }

        loadMidiOutputIntoEditor(result);
        el.tuneEditorSection.scrollIntoView({ behavior: 'smooth' });
      });

      // copy button: copy to clipboard
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        copyToClipboard(tuneData, el.tuneFeedback, 'Copied!');

        // visual feedback on button itself
        const originalText = this.textContent;
        this.classList.add('copied');
        this.textContent = '✓';

        setTimeout(function() {
          copyBtn.classList.remove('copied');
          copyBtn.textContent = originalText;
        }, 1500);
      });

      // card click: same as preview
      card.addEventListener('click', function() {
        previewBtn.click();
      });
    });
  }

  // handle midi file upload and parsing
  function handleFile(file) {
    if (!file.name.match(/\.(mid|midi)$/i)) {
      showError('Please select a MIDI file (.mid or .midi)');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const uint8Array = new Uint8Array(e.target.result);
        const midiData = MidiParser.Uint8(uint8Array);

        if (!midiData) {
          showError('Failed to parse MIDI file. It may be corrupted or invalid.');
          return;
        }

        currentMidiData = midiData;
        showFileInfo(file.name);
        populateTrackSelect(midiData);
      } catch (err) {
        showError('Error parsing MIDI file: ' + err.message);
      }
    };
    reader.onerror = function() {
      showError('Error reading file');
    };
    reader.readAsArrayBuffer(file);
  }

  // show uploaded file info in ui
  function showFileInfo(fileName) {
    el.fileName.textContent = fileName;
    el.fileInfo.classList.remove('hidden');
  }

  // populate track selector dropdown with midi tracks
  function populateTrackSelect(midiData) {
    el.trackSelect.innerHTML = '<option value="">-- select a track --</option>';

    for (let i = 0; i < midiData.tracks; i++) {
      const trackInfo = MidiConverter.getTrackInfo(midiData.track[i]);

      // skip tracks with 0 notes (conductor tracks, etc.)
      if (trackInfo.noteCount === 0) continue;

      const option = document.createElement('option');
      option.value = i;
      const name = trackInfo.trackName || ('Track ' + (i + 1));
      option.textContent = name + ' (' + trackInfo.noteCount + ' notes)';
      el.trackSelect.appendChild(option);
    }

    showSection(el.trackSection);
  }

  // show selected track info (note count) and conversion options
  function showTrackInfo(noteCount) {
    el.trackNoteCount.textContent = noteCount;
    el.trackInfo.classList.remove('hidden');
    showSection(el.optionsSection);
  }

  // convert selected midi track to grub tune string
  function convertSelectedTrack() {
    const trackIndex = parseInt(el.trackSelect.value, 10);
    if (isNaN(trackIndex) || !currentMidiData) {
      showError('Please select a track first');
      return;
    }

    const options = {
      polyphonyMode: el.polyphonyMode.value,
      maxDurationSeconds: el.devModeToggle.checked ? Infinity : parseInt(el.durationLimit.value, 10)
    };

    const result = MidiConverter.convert(currentMidiData, trackIndex, options);

    if (result.noteCount === 0 && result.warnings.length > 0) {
      showError('No notes found in this track. ' + result.warnings.join(' '));
      return;
    }

    loadMidiOutputIntoEditor(result);
  }

  // display conversion output (kept for url params)
  function showOutput(result) {
    // show warnings if any
    if (result.warnings && result.warnings.length > 0) {
      el.warningList.innerHTML = '';
      result.warnings.forEach(function(warning) {
        const li = document.createElement('li');
        li.textContent = warning;
        el.warningList.appendChild(li);
      });
      el.warnings.classList.remove('hidden');
    } else {
      el.warnings.classList.add('hidden');
    }

    // show tune info
    el.outputNotes.textContent = result.noteCount;
    el.outputDuration.textContent = Math.round(result.durationMs) + 'ms';

    // show tune string
    el.tuneOutput.value = result.tuneString;

    showSection(el.outputSection);
  }

  // load a direct tune string (kept for compatibility)
  function loadDirectTune(tuneStr) {
    if (!tuneStr || !tuneStr.trim()) {
      showError('please enter a tune string');
      return;
    }

    const validation = AudioPlayer.validate(tuneStr);
    if (!validation.valid) {
      showError('invalid tune format: ' + validation.error);
      return;
    }

    const info = AudioPlayer.getTuneInfo(tuneStr);
    showOutput({
      tuneString: tuneStr.trim().replace(/\s+/g, ' '),
      noteCount: info.noteCount,
      durationMs: info.durationMs,
      warnings: []
    });
  }

  // check url parameters for shared tune and load it
  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const tune = params.get('tune');
    if (tune) {
      const decoded = decodeURIComponent(tune).replace(/\+/g, ' ');

      const result = {
        tuneString: decoded,
        noteCount: 0,
        durationMs: 0,
        warnings: []
      };

      const info = AudioPlayer.getTuneInfo(decoded);
      if (info) {
        result.noteCount = info.noteCount;
        result.durationMs = info.durationMs;
      }

      applyMidiOutput(result);
    }
  }

  // toggle play/stop button visibility based on playback state
  function setPlaybackState(playing) {
    if (playing) {
      el.playTuneBtn.classList.add('hidden');
      el.stopTuneBtn.classList.remove('hidden');
    } else {
      el.playTuneBtn.classList.remove('hidden');
      el.stopTuneBtn.classList.add('hidden');
    }
  }

  // copy text to clipboard with visual feedback message
  function copyToClipboard(text, feedbackElement, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showCopyFeedback(feedbackElement, message);
      }).catch(function() {
        fallbackCopy(text, feedbackElement, message);
      });
    } else {
      fallbackCopy(text, feedbackElement, message);
    }
  }

  // fallback copy method using execCommand for older browsers
  function fallbackCopy(text, feedbackElement, message) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showCopyFeedback(feedbackElement, message);
    } catch (e) {
      showCopyFeedback(feedbackElement, 'copy failed!');
    }
    document.body.removeChild(textarea);
  }

  // show copy feedback message temporarily
  function showCopyFeedback(feedbackElement, message) {
    feedbackElement.textContent = message;
    feedbackElement.classList.remove('hidden');
    setTimeout(function() {
      feedbackElement.classList.add('hidden');
    }, 2000);
  }

  // show tune feedback
  let tuneFeedbackTimeout = null;
  function showTuneFeedback(message, isError) {
    // clear any pending hide timer
    if (tuneFeedbackTimeout) {
      clearTimeout(tuneFeedbackTimeout);
      tuneFeedbackTimeout = null;
    }

    el.tuneFeedback.textContent = message;
    el.tuneFeedback.classList.remove('hidden');
    el.tuneFeedback.style.color = isError ? '#ff4444' : '#00e6e6';

    // only auto-hide success messages
    if (!isError) {
      tuneFeedbackTimeout = setTimeout(function() {
        el.tuneFeedback.classList.add('hidden');
        el.tuneFeedback.style.color = '';
        tuneFeedbackTimeout = null;
      }, 3000);
    }
  }

  // show/hide ui sections
  function showSection(section) {
    section.classList.remove('hidden');
  }

  function hideSection(section) {
    section.classList.add('hidden');
  }

  // show error message to user
  function showError(message) {
    alert(message);
  }

  // reset application state and clear all data
  function resetState() {
    currentMidiData = null;
    el.fileInput.value = '';
    el.fileInfo.classList.add('hidden');
    hideSection(el.trackSection);
    hideSection(el.optionsSection);
    hideSection(el.outputSection);
    el.trackSelect.innerHTML = '<option value="">-- select a track --</option>';
    el.trackInfo.classList.add('hidden');
    el.tuneOutput.value = '';
    el.warnings.classList.add('hidden');
    AudioPlayer.stop();
    setPlaybackState(false);
  }

  // initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
