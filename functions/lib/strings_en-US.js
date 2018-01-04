/* eslint quote-props: ["error", "always"] */
/* eslint quotes: ["error", "double"] */

// eslint-disable-next-line quotes
const deepFreeze = require('deep-freeze');

const categories = [{
    "category": "headquarters",
    "suggestion": "Headquarters",
    "tips": [
      "Google's headquarters is in Mountain View, California.",
      "Google has over 30 cafeterias in its main campus.",
      "Google has over 10 fitness facilities in its main campus."
    ],
    "tipPrefix": "Okay, here's a headquarters tip."
  },
  {
    "category": "history",
    "suggestion": "History",
    "tips": [
      "Google was founded in 1998.",
      "Google was founded by Larry Page and Sergey Brin.",
      "Google went public in 2004.",
      "Google has more than 70 offices in more than 40 countries."
    ],
    "tipPrefix": "Sure, here's a history tip."
  }
];

const scale = {
  "decode": [
    "%(rootNote)s %(scaleName)s have the following notes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s scale contains the following notes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s consists the following notes: %(decodedScale)s",
    "%(rootNote)s %(scaleName)s is defined by these notes: %(decodedScale)s"
  ],
  "encode": {
    "one": [
      "This looks like a %(scaleNames[0])s scale to me.",
      "This sounds like a %(scaleNames[0])s scale.",
      "This is a %(scaleNames[0])s scale."
    ],
    "two": [
      "This looks like a %(scaleNames[0])s or %(scaleNames[1])s scale to me.",
      "This sounds like a %(scaleNames[0])s or %(scaleNames[1])s scale.",
      "This can be %(scaleNames[0])s or %(scaleNames[1])s scale.",
      "This is a %(scaleNames[0])s or %(scaleNames[1])s scale."
    ],
    "many": [
      "I found a few. This looks like a %(scaleNames[0])s, %(scaleNames[1])s or %(scaleNames[2])s scale to me.",
      "There are a few options. Sounds like a %(scaleNames[0])s, %(scaleNames[1])s or %(scaleNames[2])s scale.",
      "This can be %(scaleNames[0])s, %(scaleNames[1])s or %(scaleNames[2])s scale.",
      "This is a %(scaleNames[0])s, %(scaleNames[1])s or %(scaleNames[2])s scale."
    ]
  }
};

const interval = {
  "decode": [
    "<p><s>The interval between %(rootNote)s and %(targetNote)s is a %(intervalName)s.</s><s>The distance between those notes is %(semitones)s semitones.</s></p>"
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
    "7A": "augmented seventh"
  }
};

const note = {
  "freq": [
    "%(note)s in %(octave)s octave has a frequency of %(frequency)s Hz and its MIDI number is %(midi)s"
  ]
};

const content = {
  "images": [
    [
      "https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Search_GSA.2e16d0ba.fill-300x300.png",
      "Google app logo"
    ],
    [
      "https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Google_Logo.max-900x900.png",
      "Google logo"
    ],
    [
      "https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Dinosaur-skeleton-at-Google.max-900x900.jpg",
      "Stan the Dinosaur at Googleplex"
    ],
    [
      "https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Wide-view-of-Google-campus.max-900x900.jpg",
      "Googleplex"
    ],
    [
      "https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Bikes-on-the-Google-campus.2e16d0ba.fill-300x300.jpg",
      "Biking at Googleplex"
    ]
  ],
  "link": "https://www.google.com/about/"
};

const cats = {
  "suggestion": "Cats",
  "tips": [
    "When you tune a drum, it\u0027s good to use two drum keys simultaneously.",
    "When seating the bass drum head, it\u0027s a good practice to stretch it out before tuning.",
    "When tuning the front head, increase tension in very small increments. Try using a quarter or a half of a turn at a time, no more.",
    "Whatever style and sound you are trying to achieve, generally a drum will sound best if the batter head is tuned lower (slacker) than the resonant head.",
    "If you find the overall pitch too low, go back to the bottom head and take it up another pitch level, return to tuning the top head and it will come back into tune with the bottom after a few turns of the rods.",
    "Whenever detuning or loosening a rod, always end the movement with a slight re-tightening. This enables the rod to \u0027bite\u0027 and hold while getting the others sorted.",
    "Try using a stool as your tuning base. It\u0027s a great way to dampen the batter head while working on the resonant head and you can (normally) spin the drum round as you go."
  ],
  "images": [
    [
      "https://developers.google.com/web/fundamentals/accessibility/semantics-builtin/imgs/160204193356-01-cat-500.jpg",
      "Gray Cat"
    ]
  ],
  /**
   * This sample uses a sound clip from the Actions on Google Sound Library
   * https://developers.google.com/actions/tools/sound-library
   */
  "sounds": [
    "https://actions.google.com/sounds/v1/animals/cat_purr_close.ogg"
  ],
  "link": "https://www.google.com/search?q=cats",
  "tipPrefix": "Alright, here's a cat tip. <audio src=\"%s\"></audio>"
};

const transitions = {
  "content": {
    "heardItAll": "Looks like you've heard all there is to know about the %s of Google. I could tell you about its %s instead.",
    "alsoCats": "By the way, I can tell you about cats too."
  },
  "cats": {
    "heardItAll": "Looks like you've heard all there is to know about cats. Would you like to hear about Google?"
  }
};

const general = {
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
  ],
  "nexttip": "Would you like to hear another tip?",
  "linkOut": "Learn more",
  "wantWhat": "So what would you like to hear about?",
  "unhandled": "Welcome to Drum Tuner! I'd rather not talk about %s. Wouldn't you rather talk about drumming? I can tell you about Google's history or its headquarters. Which do you want to hear about?"
};

// Use deepFreeze to make the constant objects immutable so they are not unintentionally modified
module.exports = deepFreeze({
  scale,
  interval,
  note,
  categories,
  content,
  cats,
  transitions,
  general
});