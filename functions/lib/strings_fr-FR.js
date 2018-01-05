/* eslint quote-props: ["error", "always"] */
/* eslint quotes: ["error", "double"] */

// eslint-disable-next-line quotes
const deepFreeze = require('deep-freeze');

const scale = {
  "decode": [
    "%(rootNote)s %(scaleName)s est fait de ces notes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s ont les notes suivantes: %(decodedScale)s",
    "%(rootNote)s %(scaleName) gamme de contient les notes suivantes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s compose les notes suivantes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s est définie par ces notes: %(decodedScale)s"
  ],
  "encode": [
    "Cela ressemble à %(scaleNames)s gamme pour moi.",
    "Cela ressemble à un %(scaleNames) à l'gamme de l'art.",
    "Cela peut être %(scaleNames)s gamme.",
    "Je pense qu'il est %(scaleNames) gamme de.",
    "Je pense que cela est %(scaleNames)s à l'gamme.",
    "Je crois qu'il est un %(scaleNames) à l'gamme de l'art.",
    "Ceci est un %(scaleNames) à l'gamme de l'art."
  ],
  "notfound": {
    "decode": [
      "Désolé, je ne pouvais trouver aucune information sur cette gamme. Quel est le nom d'gamme?"
    ],
    "encode": [
      "Désolé, je ne pouvais pas trouver une gamme contenant ces notes. S'il vous plaît fournir au moins cinq notes uniques appartenant à cette gamme."
    ]
  }
};

const chord = {
  "names": {
    "flat": "bémol",
    "sharp": "dièse",
    "omit": "omettre",
    "halfdiminished": "à moitié diminué",
    "major": "majeur",
    "minor": "mineur",
    "suspended": "suspendu",
    "augmented": "augmenté",
    "diminished": "diminué",
  },
  "encode": [
    "Cela ressemble à %(chords)s pour moi.",
    "Cela ressemble à %(chords)s.",
    "Ceci est %(chords)s"
  ],
  "notfound": [
    "Désolé, je ne pouvais pas trouver un accord contenant ces notes. S'il vous plaît fournir une liste d'au moins trois notes uniques faisant cet accord."
  ]
};

const interval = {
  "decode": [
    "<p><s>L'intervalle entre %(rootNote)s et %(targetNote)s est %(intervalName)s. </s> <s> La distance entre ces notes est %(semitones) les demi-tons de.</s></p>",
    "<p><s>I trouvé que l'intervalle entre %(rootNote)s et %(targetNote)s est %(intervalName)s qui est égale à %(semitones)s les demi-tons de.</s></p>",
    "<p><s>Intervalle entre %(rootNote)s et %(targetNote)s est appelé %(intervalName)s. La distance entre eux est %(semitones)s demi-tons. </s></p>"
  ],
  "names": {
    "1P": "unisson",
    "2m": "seconde mineure",
    "2M": "seconde majeure",
    "3m": "tierce mineure",
    "3M": "tierce majeure",
    "4P": "quarte juste",
    "5P": "quinte juste",
    "6m": "sixte mineur",
    "6M": "sixte majeure",
    "7m": "septième mineur",
    "7M": "septième majeure",
    "8P": "octave juste",
    "2d": "seconde diminué",
    "1A": "l'unisson augmentée",
    "3d": "tierce diminué",
    "2A": "seconde augmentée",
    "4d": "quarte diminué",
    "3A": "tierce augmentée",
    "5d": "quinte diminuée",
    "4A": "quarte augmentée",
    "6d": "sixte diminué",
    "5A": "quinte augmentée",
    "7d": "septième diminuée",
    "6A": "sixte augmentée",
    "8d": "octave diminuée",
    "7A": "septième augmenté",
    "2AA": "seconde double-augmentée"
  },
  "notfound": [
    "Désolé, je ne pouvais trouver aucune information sur cet intervalle. Fournis s'il vous plaît exactement deux notes."
  ]
};

const note = {
  "names": {
    "A": "La",
    "B": "Si",
    "C": "Do",
    "D": "Re",
    "E": "Mi",
    "F": "Fa",
    "G": "Sol"
  },
  "freq": [
    " %(note)s en %(octave)s de l'octave a une fréquence de %(frequency)s Hz et son numéro MIDI est %(midi)s."
  ],
  "notfound": [
    "Désolé, je ne pouvais pas trouver des informations sur votre note. Fournis s'il vous plaît une note et son octave."
  ]
};

const general = {
  "or": "ou",
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