// midi to grub tune converter
// converts midi tracks to grub_init_tune format
const MidiConverter = (function() {
  'use strict';

  // polyphony resolution modes
  const POLYPHONY_MODES = {
    HIGHEST: 'highest',
    LOWEST: 'lowest',
    LOUDEST: 'loudest',
    FIRST: 'first'
  };

  // convert midi note number to frequency in hz (A4 = 440hz)
  function midiNoteToFrequency(midiNote) {
    return Math.round(440 * Math.pow(2, (midiNote - 69) / 12));
  }

  // channel state tracker for pitch bend and rpn
  function createChannelState() {
    return {
      pitchBend: 8192,           // current pitch bend value (center)
      pitchBendRange: 2,         // semitones (±2 default per midi spec)
      rpnMsb: null,              // rpn msb (cc 101)
      rpnLsb: null,              // rpn lsb (cc 100)
      dataEntryMsb: null         // data entry msb (cc 6)
    };
  }

  // get or create channel state from state map
  function getChannelState(channelStates, channel) {
    if (!channelStates.has(channel)) {
      channelStates.set(channel, createChannelState());
    }
    return channelStates.get(channel);
  }

  // apply pitch bend to base midi note frequency
  function applyPitchBend(midiNote, pitchBendValue, pitchBendRange) {
    // semitone shift from pitch bend value
    const semitoneShift = (pitchBendValue - 8192) / (8192 / pitchBendRange);

    // base frequency using equal temperament (a4 = 440hz)
    const baseFreq = 440 * Math.pow(2, (midiNote - 69) / 12);

    // adjusted frequency: freq × 2^(semitoneShift/12)
    const adjustedFreq = baseFreq * Math.pow(2, semitoneShift / 12);

    // round to nearest hz (grub requires integers)
    return Math.round(adjustedFreq);
  }

  // extract tempo from midi data (defaults to 120 bpm if not found)
  function extractTempo(midiData, trackIndex) {
    const DEFAULT_BPM = 120;

    // for format 1, tempo is usually in track 0
    // for format 0 or 2, check the selected track
    const tracksToSearch = [];
    if (midiData.formatType === 1 && midiData.track[0]) {
      tracksToSearch.push(midiData.track[0]);
    }
    if (midiData.track[trackIndex]) {
      tracksToSearch.push(midiData.track[trackIndex]);
    }

    for (const track of tracksToSearch) {
      if (!track || !track.event) continue;
      for (const event of track.event) {
        if (event.type === 0xFF && event.metaType === 0x51) {
          // data is microseconds per beat
          const microsecondsPerBeat = event.data;
          if (microsecondsPerBeat > 0) {
            return 60000000 / microsecondsPerBeat; // convert to BPM
          }
        }
      }
    }
    return DEFAULT_BPM;
  }

  // get time division (ticks per beat) from midi data
  function getTicksPerBeat(midiData) {
    if (Array.isArray(midiData.timeDivision)) {
      // sMPTE format: [framesPerSecond, ticksPerFrame]
      return midiData.timeDivision[0] * midiData.timeDivision[1];
    }
    return midiData.timeDivision || 480; // default to 480 if missing
  }

  // extract note events from track (note on/off events with timing)
  function extractNoteEvents(track) {
    const notes = [];
    const activeNotes = new Map(); // map<channel:noteNumber, {startTick, velocity}>
    const channelStates = new Map();
    let currentTick = 0;

    if (!track || !track.event) return notes;

    for (const event of track.event) {
      currentTick += event.deltaTime || 0;

      // track pitch bend and rpn state per channel
      const channel = event.channel || 0;
      const channelState = getChannelState(channelStates, channel);

      // process pitch bend events (type 0xE)
      if (event.type === 0xE && event.data) {
        // pitch bend is 14-bit: data[0]=lsb, data[1]=msb
        const lsb = event.data[0];
        const msb = event.data[1];
        const newPitchBend = (msb << 7) | lsb;

        // check if pitch bend actually changed
        if (newPitchBend !== channelState.pitchBend) {
          // split any active notes on this channel at this tick
          for (const [key, noteData] of activeNotes.entries()) {
            const [noteChannel, noteNum] = key.split(':').map(Number);
            if (noteChannel === channel) {
              // avoid zero-duration segments
              if (currentTick > noteData.startTick) {
                // end current segment and add to notes array
                notes.push({
                  note: noteNum,
                  velocity: noteData.velocity,
                  startTick: noteData.startTick,
                  endTick: currentTick,
                  channel: channel,
                  pitchBend: channelState.pitchBend,
                  pitchBendRange: channelState.pitchBendRange
                });

                // start new segment with updated pitch bend
                noteData.startTick = currentTick;
              }
            }
          }

          // update channel pitch bend state
          channelState.pitchBend = newPitchBend;
        }
      }

      // process control change events for rpn (type 0xB)
      if (event.type === 0xB && event.data) {
        const ccNum = event.data[0];
        const ccValue = event.data[1];

        if (ccNum === 101) {
          // rpn msb
          channelState.rpnMsb = ccValue;
        } else if (ccNum === 100) {
          // rpn lsb
          channelState.rpnLsb = ccValue;
        } else if (ccNum === 6) {
          // data entry msb, check if this is pitch bend sensitivity (rpn 0,0)
          if (channelState.rpnMsb === 0 && channelState.rpnLsb === 0) {
            channelState.pitchBendRange = ccValue; // set range in semitones
          }
        }
      }

      // Note On: type 0x9, Note Off: type 0x8
      // Note On with velocity 0 is treated as Note Off
      if (event.type === 0x9 && event.data && event.data[1] > 0) {
        // Note On
        const noteNum = event.data[0];
        const velocity = event.data[1];
        const key = `${channel}:${noteNum}`;
        activeNotes.set(key, { startTick: currentTick, velocity });
      } else if (event.type === 0x8 || (event.type === 0x9 && event.data && event.data[1] === 0)) {
        // Note Off
        const noteNum = event.data[0];
        const key = `${channel}:${noteNum}`;
        if (activeNotes.has(key)) {
          const noteData = activeNotes.get(key);
          notes.push({
            note: noteNum,
            velocity: noteData.velocity,
            startTick: noteData.startTick,
            endTick: currentTick,
            channel: channel,
            pitchBend: channelState.pitchBend,
            pitchBendRange: channelState.pitchBendRange
          });
          activeNotes.delete(key);
        }
      }
    }

    // handle any notes that never got a note-off (use last tick as end)
    for (const [key, noteData] of activeNotes) {
      const [channel, noteNum] = key.split(':').map(Number);
      const channelState = getChannelState(channelStates, channel);
      notes.push({
        note: noteNum,
        velocity: noteData.velocity,
        startTick: noteData.startTick,
        endTick: currentTick,
        channel: channel,
        pitchBend: channelState.pitchBend,
        pitchBendRange: channelState.pitchBendRange
      });
    }

    // sort by start time, then by note number for consistency
    notes.sort((a, b) => a.startTick - b.startTick || a.note - b.note);
    return notes;
  }

  // detect if track has overlapping notes (polyphony)
  function detectPolyphony(notes) {
    for (let i = 0; i < notes.length - 1; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        // if next note starts after current ends, no more overlaps possible
        if (notes[j].startTick >= notes[i].endTick) break;
        // overlap detected
        return true;
      }
    }
    return false;
  }

  // detect if track uses pitch bend events
  function detectPitchBend(track) {
    if (!track || !track.event) return false;
    for (const event of track.event) {
      if (event.type === 0xE) return true;
    }
    return false;
  }

  // resolve polyphony by selecting which note to play from overlapping notes
  function selectNote(overlappingNotes, mode) {
    if (overlappingNotes.length === 0) return null;
    if (overlappingNotes.length === 1) return overlappingNotes[0];

    switch (mode) {
      case POLYPHONY_MODES.HIGHEST:
        return overlappingNotes.reduce((max, n) => n.note > max.note ? n : max);
      case POLYPHONY_MODES.LOWEST:
        return overlappingNotes.reduce((min, n) => n.note < min.note ? n : min);
      case POLYPHONY_MODES.LOUDEST:
        return overlappingNotes.reduce((max, n) => n.velocity > max.velocity ? n : max);
      case POLYPHONY_MODES.FIRST:
      default:
        // return the note that started first
        return overlappingNotes.reduce((first, n) =>
          n.startTick < first.startTick ? n : first);
    }
  }

  // convert polyphonic notes to monophonic timeline (starts from first note, not tick 0)
  function resolveToMonophonic(notes, mode) {
    if (notes.length === 0) return [];

    // find the first note's start tick
    // this is our starting point
    const firstNoteTick = Math.min(...notes.map(n => n.startTick));

    // create a list of all events (note starts and ends)
    const events = [];
    for (const note of notes) {
      events.push({ tick: note.startTick, type: 'start', note });
      events.push({ tick: note.endTick, type: 'end', note });
    }
    // sort by tick, with ends before starts at same tick
    events.sort((a, b) => a.tick - b.tick || (a.type === 'end' ? -1 : 1));

    const timeline = [];
    // start from the first note, not from tick 0
    let currentTick = firstNoteTick;
    let activeNotes = [];

    for (const event of events) {
      // skip events before our starting point (shouldn't happen, but safety check)
      if (event.tick < firstNoteTick) continue;

      // Output segment for the time between last event and this one
      if (event.tick > currentTick) {
        if (activeNotes.length > 0) {
          const selected = selectNote(activeNotes, mode);
          // apply pitch bend if present (backward compatible with old note format)
          const pitchBend = selected.pitchBend !== undefined ? selected.pitchBend : 8192;
          const pitchBendRange = selected.pitchBendRange !== undefined ? selected.pitchBendRange : 2;
          const freq = applyPitchBend(selected.note, pitchBend, pitchBendRange);
          timeline.push({
            frequency: freq,
            durationTicks: event.tick - currentTick
          });
        } else {
          // rest/silence (only for gaps between notes, not leading silence)
          timeline.push({
            frequency: 0,
            durationTicks: event.tick - currentTick
          });
        }
      }

      currentTick = event.tick;

      if (event.type === 'start') {
        activeNotes.push(event.note);
      } else {
        activeNotes = activeNotes.filter(n => n !== event.note);
      }
    }

    // merge consecutive segments with same frequency
    const merged = [];
    for (const segment of timeline) {
      if (merged.length > 0 && merged[merged.length - 1].frequency === segment.frequency) {
        merged[merged.length - 1].durationTicks += segment.durationTicks;
      } else if (segment.durationTicks > 0) {
        merged.push({ ...segment });
      }
    }

    return merged;
  }

  // main conversion function: midi track → grub tune string with warnings
  function convert(midiData, trackIndex, options) {
    const {
      polyphonyMode = POLYPHONY_MODES.HIGHEST,
      maxDurationSeconds = 20
    } = options || {};

    const warnings = [];
    const track = midiData.track[trackIndex];

    if (!track) {
      return { tuneString: '', noteCount: 0, durationMs: 0, grubTempo: 0, warnings: ['track not found!'] };
    }

    // get tempo and time division
    const bpm = extractTempo(midiData, trackIndex);
    const ticksPerBeat = getTicksPerBeat(midiData);

    // GRUB tempo = ticks per minute (bpm * ticksPerBeat)
    // 1 duration unit = 1 tick
    const grubTempo = Math.round(bpm * ticksPerBeat);

    // extract notes from track
    const notes = extractNoteEvents(track);

    if (notes.length === 0) {
      return { tuneString: '', noteCount: 0, durationMs: 0, grubTempo, warnings: ['no notes found in track!'] };
    }

    // check for polyphony
    const hasPolyphony = detectPolyphony(notes);
    if (hasPolyphony) {
      warnings.push('track contains polyphonic sections! using "' + polyphonyMode + '" resolution.');
    }

    // check for pitch bend usage
    const usesPitchBend = detectPitchBend(track);
    if (usesPitchBend) {
      warnings.push('track uses pitch bend. frequencies adjusted accordingly.');
    }

    // resolve to monophonic
    const timeline = resolveToMonophonic(notes, polyphonyMode);

    // calculate max duration in ticks
    // duration formula: ticks / grubTempo * 60 = seconds
    // so: maxTicks = maxSeconds * grubTempo / 60
    const maxDurationTicks = maxDurationSeconds * grubTempo / 60;

    let truncated = false;
    const limitedTimeline = [];
    let accumulatedTicks = 0;

    for (const item of timeline) {
      if (accumulatedTicks >= maxDurationTicks) {
        truncated = true;
        break;
      }

      let duration = item.durationTicks;
      if (accumulatedTicks + duration > maxDurationTicks) {
        duration = Math.round(maxDurationTicks - accumulatedTicks);
        truncated = true;
      }

      if (duration > 0) {
        limitedTimeline.push({ frequency: item.frequency, durationTicks: duration });
        accumulatedTicks += duration;
      }

      if (truncated) break;
    }

    if (truncated) {
      warnings.push('track truncated to ' + maxDurationSeconds + ' seconds.');
    }

    // build GRUB tune string
    // format: tempo freq duration [freq duration ...]
    const parts = [grubTempo.toString()];
    let noteCount = 0;
    let totalDurationTicks = 0;

    for (const item of limitedTimeline) {
      const durationBars = Math.round(item.durationTicks);
      if (durationBars > 0) {
        parts.push(item.frequency.toString());
        parts.push(durationBars.toString());
        if (item.frequency > 0) noteCount++;
        totalDurationTicks += durationBars;
      }
    }

    const tuneString = parts.join(' ');
    // duration = totalTicks / grubTempo * 60 seconds * 1000 ms
    const durationMs = (totalDurationTicks / grubTempo) * 60 * 1000;

    return {
      tuneString,
      noteCount,
      durationMs,
      grubTempo,
      warnings
    };
  }

  // get track info (note count and name) for track selector display
  function getTrackInfo(track) {
    let noteCount = 0;
    let trackName = null;

    if (!track || !track.event) return { noteCount: 0, trackName: null };

    for (const event of track.event) {
      // count note-on events with velocity > 0
      if (event.type === 0x9 && event.data && event.data[1] > 0) {
        noteCount++;
      }
      // track name meta event (type 0xFF, metaType 0x03)
      if (event.type === 0xFF && event.metaType === 0x03 && typeof event.data === 'string') {
        trackName = event.data;
      }
    }

    return { noteCount, trackName };
  }

  // public API
  return {
    POLYPHONY_MODES,
    convert,
    extractTempo,
    getTrackInfo,
    midiNoteToFrequency,
    detectPolyphony,
    getTicksPerBeat
  };
})();

// export for Node.js if available
if (typeof module !== 'undefined') {
  module.exports = MidiConverter;
}
