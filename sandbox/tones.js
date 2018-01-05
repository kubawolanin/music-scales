// https://github.com/firebase/functions-samples/blob/master/ffmpeg-convert-audio/functions/index.js

const tone = require('tonegenerator');
const tonal = require("tonal");
const header = require('waveheader');
const fs = require('fs');

const bpm = 100;

const len = {
  whole: 4 * (60 / bpm),
  half: 2 * (60 / bpm),
  quarter: 1 * (60 / bpm),
  eight: 0.5 * (60 / bpm),
  sixteenth: 0.25 * (60 / bpm)
}

/**
 * Construct a param for tone()
 * @param {number} frequency
 */
const freq = frequency => {
  return {
    freq: frequency,
    lengthInSecs: len.quarter,
    volume: tone.MAX_16 * 0.8,
    shape: 'sine'
  }
}

const input = process.argv[2] || "c d d# f g a b";
console.log(input);

/**
 * Convert a note string to an array of samples
 * @param {string} note
 */
const noteToTone = (note, index, notes) => {
  const token = tonal.Note.tokenize(note);
  if (!token[2]) { // If there's no octave, add the default one
    token[2] = "4";
  }
  const name = tonal.Note.name(token.splice(0, 3).join(''));
  const frequency = tonal.Note.freq(name) || 0;
  // const param = Object.assign(freq(frequency), {
  //     volume: tone.MAX_16 / notes.length
  // })
  return tone(freq(frequency));
}

/**
 * One note at a time
 * @param {string[]|string} input
 */
const arpeggio = input => {
  let notes = input;
  if (typeof input === 'string') {
    notes = input.split(' ');
  }

  const arrays = notes.map(noteToTone);
  return [].concat(...arrays);
}

/**
 * Multiple notes simultaneously
 * @param {string[]|string} input
 */
const chord = input => {
  let notes = input;
  if (typeof input === 'string') {
    notes = input.split(' ');
  }

  const arrays = notes.map(noteToTone);
  const volume = tone.MAX_16 / notes.length;

  const result = arrays[0].concat(arrays[1], arrays[2]);

  for (const i = 0; i < arrays[0].length; i++) {
    result.push(arrays[i] + arrays[i] + arrays[i])
  }

  return result;
}

// By adding values of the tones for each sample,
// we play them simultaneously, as a chord
// for(const i = 0; i < tone1.length; i++) {
//   samples.push(tone1[i] + tone2[i] + tone3[i])
// }

const samples = arpeggio(input);


const fileName = tonal.PcSet.chroma(input.split(' '));
const file = fs.createWriteStream(`${fileName}.wav`);
console.log('Saved to file: ', fileName);

file.write(header(samples.length * 2, { bitDepth: 16 }))

const data = Int16Array.from(samples);
const size = data.length * 2; // 2 bytes per sample
const buffer = Buffer.allocUnsafe && Buffer.allocUnsafe(size) || new Buffer(size);

data.forEach((value, index) => buffer.writeInt16LE(value, index * 2))

file.write(buffer);
file.end();