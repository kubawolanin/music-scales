/* eslint quote-props: ["error", "always"] */
/* eslint quotes: ["error", "double"] */

// eslint-disable-next-line quotes
const deepFreeze = require('deep-freeze');

const scale = {
  "decode": [
    "%(rootNote)s %(scaleName)s is made of these notes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s have the following notes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s scale contains the following notes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s consists the following notes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s is defined by these notes: %(decodedScale)s"
  ],
  "encode": [
    "This looks like %(scaleNames)s scale to me.",
    "This sounds like a %(scaleNames)s scale.",
    "This can be %(scaleNames)s scale.",
    "I think it's %(scaleNames)s scale.",
    "I think this is %(scaleNames)s scale.",
    "I believe it's a %(scaleNames)s scale.",
    "This is a %(scaleNames)s scale."
  ],
  "notfound": {
    "decode": [
      "Sorry, I couldn't find any information on that scale. What's the scale name?"
    ],
    "encode": [
      "Sorry, I couldn't find any scale containing those notes. Please provide at least five unique notes belonging to that scale."
    ]
  }
};

const chord = {
  "names": {
    "flat": "flat",
    "sharp": "sharp",
    "omit": "omit",
    "halfdiminished": "half-diminished",
    "major": "major",
    "minor": "minor",
    "suspended": "suspended",
    "augmented": "augmented",
    "diminished": "diminished",
  },
  "encode": [
    "This looks like %(chords)s to me.",
    "This sounds like %(chords)s.",
    "This is %(chords)s"
  ],
  "notfound": [
    "Sorry, I couldn't find any chord containing those notes. Please provide a list of at least three unique notes making this chord."
  ]
};

const interval = {
  "decode": [
    "<p><s>The interval between %(rootNote)s and %(targetNote)s is %(intervalName)s.</s><s>The distance between those notes is %(semitones)s semitones.</s></p>",
    "<p><s>I found that the interval between %(rootNote)s and %(targetNote)s is %(intervalName)s which is equal to %(semitones)s semitones.</s></p>",
    "<p><s>Interval between %(rootNote)s and %(targetNote)s is called %(intervalName)s. The distance between them is %(semitones)s semitones.</s></p>"
  ],
  "names": {
    "1P": "perfect unison",
    "2m": "minor second",
    "2M": "major second",
    "3m": "minor third",
    "3M": "major third",
    "4P": "perfect fourth",
    "5P": "perfect fifth",
    "6m": "minor sixth",
    "6M": "major sixth",
    "7m": "minor seventh",
    "7M": "major seventh",
    "8P": "perfect octave",
    "2d": "diminished second",
    "1A": "augmented unison",
    "3d": "diminished third",
    "2A": "augmented second",
    "4d": "diminished fourth",
    "3A": "augmented third",
    "5d": "diminished fifth",
    "4A": "augmented fourth",
    "6d": "diminished sixth",
    "5A": "augmented fifth",
    "7d": "diminished seventh",
    "6A": "augmented sixth",
    "8d": "diminished octave",
    "7A": "augmented seventh",
    "2AA": "double-augmented second"
  },
  "notfound": [
    "Sorry, I couldn't find any information on the interval. Please provide exactly two notes."
  ]
};

const note = {
  "names": {
    "A": "A",
    "B": "B",
    "C": "C",
    "D": "D",
    "E": "E",
    "F": "F",
    "G": "G"
  },
  "freq": [
    "%(note)s in %(octave)s octave has a frequency of %(frequency)s Hz and its MIDI number is %(midi)s"
  ],
  "notfound": [
    "Sorry, I couldn't find any information on your note. Please provide a note and its octave."
  ]
};

const general = {
  "or": "or",
  "heardItAll": "Actually it looks like you heard it all. Thanks for listening!",
  /** Used to give responses for no inputs */
  "noInputs": [
    "I didn't hear that.",
    "If you're still there, say that again.",
    "We can stop here. See you soon."
  ],
  "suggestions": {
    /** Google Assistant will respond to more confirmation variants than just these suggestions */
    "confirmation": [
      "Sure",
      "No thanks"
    ]
  },
  "acknowledgers": [
    "OK",
    "Sure",
    "Alright",
    "You got it",
    "There you go",
    "Got it"
  ]
};

// Use deepFreeze to make the constant objects immutable so they are not unintentionally modified
module.exports = deepFreeze({
  scale,
  chord,
  interval,
  note,
  general
});