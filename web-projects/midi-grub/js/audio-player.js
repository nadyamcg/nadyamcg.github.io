// grub tune audio player using web audio api square wave oscillators (simulates pc speaker)
const AudioPlayer = (function() {
  'use strict';

  // max gain value
  // slider 100% maps to this
  const MAX_VOLUME = 0.12;

  let audioContext = null;
  let isPlaying = false;
  let scheduledOscillators = [];
  let onEndCallback = null;
  let endTimeout = null;
  let gainNode = null;

  // parse grub tune string: tempo freq duration [freq duration ...]
  function parseTuneString(tuneStr) {
    if (!tuneStr || typeof tuneStr !== 'string') return null;

    const parts = tuneStr.trim().split(/\s+/).map(Number);

    // validate: must have at least 3 numbers (tempo + 1 note)
    // and odd count (tempo + pairs)
    if (parts.length < 3 || parts.length % 2 === 0) {
      return null;
    }

    // check all are valid numbers
    if (parts.some(isNaN)) {
      return null;
    }

    const tempo = parts[0];
    const notes = [];

    for (let i = 1; i < parts.length; i += 2) {
      notes.push({
        frequency: parts[i],
        duration: parts[i + 1]
      });
    }

    return { tempo, notes };
  }

  // calculate total tune duration in milliseconds
  function calculateDuration(tuneObj) {
    if (!tuneObj || !tuneObj.notes) return 0;

    let totalSeconds = 0;
    for (const note of tuneObj.notes) {
      // duration in seconds = (60 / tempo) * duration_bars
      totalSeconds += (60 / tuneObj.tempo) * note.duration;
    }
    return totalSeconds * 1000;
  }

  // play a grub tune string with optional volume parameter (backwards compatible)
  function play(tuneStr, volume, onEnd) {
    // handle backward compatibility (volume optional)
    if (typeof volume === 'function') {
      onEnd = volume;
      volume = MAX_VOLUME;
    }
    volume = volume || MAX_VOLUME;

    const tuneObj = parseTuneString(tuneStr);
    if (!tuneObj) {
      console.error('AudioPlayer: Invalid tune format');
      return false;
    }

    stop(); // stop all playback

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('AudioPlayer: Web Audio API not supported');
      return false;
    }

    isPlaying = true;
    onEndCallback = onEnd;
    scheduledOscillators = [];

    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = volume; // use parameter instead of hardcoded 0.125

    let baseTime = audioContext.currentTime;
    let totalDuration = 0;

    for (let i = 0; i < tuneObj.notes.length; i++) {
      const note = tuneObj.notes[i];
      const durationSeconds = (60 / tuneObj.tempo) * note.duration;
      totalDuration += durationSeconds;

      // only create oscillator for non-zero frequencies (not rests)
      if (note.frequency > 0) {
        const oscillator = audioContext.createOscillator();
        oscillator.connect(gainNode);
        oscillator.type = 'square'; // square wave like PC speaker
        oscillator.frequency.value = note.frequency;

        oscillator.start(baseTime);
        oscillator.stop(baseTime + durationSeconds);

        scheduledOscillators.push(oscillator);
      }

      baseTime += durationSeconds;
    }

    // set up timeout to handle playback end
    endTimeout = setTimeout(function() {
      handlePlaybackEnd();
    }, totalDuration * 1000 + 100); // small buffer

    return true;
  }

  // cleanup after playback ends (stop oscillators, close context, call callback)
  function handlePlaybackEnd() {
    if (!isPlaying) return;

    isPlaying = false;
    scheduledOscillators = [];

    if (endTimeout) {
      clearTimeout(endTimeout);
      endTimeout = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(function() {});
      audioContext = null;
    }

    if (onEndCallback) {
      const cb = onEndCallback;
      onEndCallback = null;
      cb();
    }
  }

  // stop playback immediately
  function stop() {
    if (!isPlaying) return;

    // Stop all oscillators
    for (const osc of scheduledOscillators) {
      try {
        osc.stop();
      } catch (e) {
        // already stopped or not started
      }
    }

    handlePlaybackEnd();
  }

  // validate tune string format and return {valid, error}
  function validate(tuneStr) {
    if (!tuneStr || typeof tuneStr !== 'string') {
      return { valid: false, error: 'empty input' };
    }

    const trimmed = tuneStr.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'empty input' };
    }

    const parts = trimmed.split(/\s+/);

    // check all parts are numbers
    for (const part of parts) {
      if (isNaN(part) || part === '' || !Number.isInteger(Number(part))) {
        return { valid: false, error: 'input must contain only whole numbers' };
      }
    }

    if (parts.length < 3) {
      return { valid: false, error: 'need at least tempo + one note (see syntax reference below)' };
    }

    if (parts.length % 2 === 0) {
      return { valid: false, error: 'missing duration for last frequency' };
    }

    const tempo = parseInt(parts[0], 10);
    if (tempo <= 0) {
      return { valid: false, error: 'tempo must be positive' };
    }

    return { valid: true };
  }

  // get tune info (note count, duration in ms, tempo)
  function getTuneInfo(tuneStr) {
    const tuneObj = parseTuneString(tuneStr);
    if (!tuneObj) return null;

    return {
      noteCount: tuneObj.notes.filter(n => n.frequency > 0).length,
      durationMs: calculateDuration(tuneObj),
      tempo: tuneObj.tempo
    };
  }

  // check if audio is currently playing
  function getIsPlaying() {
    return isPlaying;
  }

  // adjust volume during playback (0-1)
  function setVolume(volume) {
    if (!isPlaying || !audioContext || !gainNode) return;
    gainNode.gain.value = volume;
  }

  // render tune to audio buffer using offline context
  function renderToBuffer(tuneStr) {
    return new Promise(function(resolve, reject) {
      const tuneObj = parseTuneString(tuneStr);
      if (!tuneObj) {
        reject(new Error('invalid tune format'));
        return;
      }

      const duration = calculateDuration(tuneObj) / 1000;
      const sampleRate = 44100;

      const offlineCtx = new OfflineAudioContext(1, duration * sampleRate, sampleRate);
      const gainNode = offlineCtx.createGain();
      gainNode.connect(offlineCtx.destination);
      gainNode.gain.value = 0.3;

      let baseTime = 0;

      for (let i = 0; i < tuneObj.notes.length; i++) {
        const note = tuneObj.notes[i];
        const durationSeconds = (60 / tuneObj.tempo) * note.duration;

        if (note.frequency > 0) {
          const oscillator = offlineCtx.createOscillator();
          oscillator.connect(gainNode);
          oscillator.type = 'square';
          oscillator.frequency.value = note.frequency;
          oscillator.start(baseTime);
          oscillator.stop(baseTime + durationSeconds);
        }

        baseTime += durationSeconds;
      }

      offlineCtx.startRendering().then(resolve).catch(reject);
    });
  }

  // convert audio buffer to wav blob
  function bufferToWav(buffer) {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    let pos = 0;

    function setString(str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos++, str.charCodeAt(i));
      }
    }

    // wav header
    setString('RIFF');
    view.setUint32(pos, 36 + length, true); pos += 4;
    setString('WAVE');
    setString('fmt ');
    view.setUint32(pos, 16, true); pos += 4;
    view.setUint16(pos, 1, true); pos += 2;
    view.setUint16(pos, buffer.numberOfChannels, true); pos += 2;
    view.setUint32(pos, buffer.sampleRate, true); pos += 4;
    view.setUint32(pos, buffer.sampleRate * buffer.numberOfChannels * 2, true); pos += 4;
    view.setUint16(pos, buffer.numberOfChannels * 2, true); pos += 2;
    view.setUint16(pos, 16, true); pos += 2;
    setString('data');
    view.setUint32(pos, length, true); pos += 4;

    // write pcm samples
    const channels = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 0;
    while (offset < buffer.length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]));
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // export tune as audio file
  function exportAudio(tuneStr, format) {
    return renderToBuffer(tuneStr).then(function(buffer) {
      if (format === 'wav') {
        return bufferToWav(buffer);
      } else if (format === 'ogg') {
        // ogg via mediarecorder (if supported)
        return new Promise(function(resolve, reject) {
          const offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;

          const dest = offlineCtx.createMediaStreamDestination();
          source.connect(dest);

          const chunks = [];
          const mediaRecorder = new MediaRecorder(dest.stream, { mimeType: 'audio/ogg; codecs=opus' });

          mediaRecorder.ondataavailable = function(e) {
            chunks.push(e.data);
          };

          mediaRecorder.onstop = function() {
            resolve(new Blob(chunks, { type: 'audio/ogg' }));
          };

          mediaRecorder.onerror = reject;

          mediaRecorder.start();
          source.start(0);

          setTimeout(function() {
            mediaRecorder.stop();
          }, buffer.length / buffer.sampleRate * 1000 + 100);
        });
      }
    });
  }

  // public API
  return {
    play: play,
    stop: stop,
    validate: validate,
    getTuneInfo: getTuneInfo,
    isPlaying: getIsPlaying,
    setVolume: setVolume,
    parseTuneString: parseTuneString,
    calculateDuration: calculateDuration,
    exportAudio: exportAudio,
    MAX_VOLUME: MAX_VOLUME
  };
})();

// export for Node.js if available
if (typeof module !== 'undefined') {
  module.exports = AudioPlayer;
}
