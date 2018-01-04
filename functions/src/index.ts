'use strict';

process.env.DEBUG = 'actions-on-google:*';

import * as functions from 'firebase-functions';
const { DialogflowApp } = require('actions-on-google');
import { sprintf } from 'sprintf-js';
import { Note, Distance, Scale } from 'tonal'; // Interval, Distance, Chord
import { scale, chord } from "tonal-detector";
//import * as Interval from 'tonal-interval';

const DEFAULT_LOCALE = 'en-US';
const localizedStrings = {
    'en-US': require('./strings_en-US.js')
};

const DEBUG_LOGS = true;

const IMAGE_URL = `https://us-central1-music-scales-2d18d.cloudfunctions.net/scoreImage`;

/** Dialogflow Actions {@link https://dialogflow.com/docs/actions-and-parameters#actions} */
const Actions = {
    DECODE_SCALE: 'decode.scale',
    ENCODE_SCALE: 'encode.scale',
    DECODE_CHORD: 'decode.chord', // TODO
    ENCODE_CHORD: 'encode.chord', // TODO
    INTERVAL: 'interval',
    NOTE_FREQ: 'note.freq',
    REPEAT: 'repeat',
    UNRECOGNIZED_DEEP_LINK: 'deeplink.unknown',
};
/** Dialogflow Parameters {@link https://dialogflow.com/docs/actions-and-parameters#parameters} */
const Parameters = {
    ROOT_NOTE: 'root-note',
    SCALE: 'scale',
    TARGET_NOTE: 'target-note',
    INTERVAL: 'interval',
    CHORD_NOTES: 'notes',
    NOTE: 'note',
    OCTAVE: 'octave',
    NOTES: {
        NOTE1: 'note1',
        NOTE2: 'note2',
        NOTE3: 'note3',
        NOTE4: 'note4',
        NOTE5: 'note5',
        NOTE6: 'note6',
        NOTE7: 'note7'
    }
};

const ask = (app, inputPrompt, noInputPrompts?) => {
    app.data.lastPrompt = inputPrompt;
    app.data.lastNoInputPrompts = noInputPrompts;
    app.ask(inputPrompt, noInputPrompts);
};

/**
 * @template T
 * @param {Array<T>} array The array to get a random value from
 */
const getRandomValue = array => array[Math.floor(Math.random() * array.length)];

/**
 * Greet the user and direct them to next turn
 * @param {DialogflowApp} app DialogflowApp instance
 * @return {void}
 */
const unhandledDeepLinks = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const rawInput = app.getRawInput();
    const response = sprintf(strings.general.unhandled, rawInput);
    const screenOutput = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT);
    if (!screenOutput) {
        ask(app, response, strings.general.noInputs);
    }
    const suggestions = strings.categories.map(category => category.suggestion);
    const richResponse = app
        .buildRichResponse()
        .addSimpleResponse(response)
        .addSuggestions(suggestions);

    ask(app, richResponse, strings.general.noInputs);
};


/**
 * Set up app.data for use in the action
 * @param {DialogflowApp} app DialogflowApp instance
 */
const initData = app => {
    const data = app.data;
    if (!data.tips) {
        data.tips = {
            content: {},
            cats: null
        };
    }

    if (!data.tuning) {
        data.tuning = {
            content: {}
        };
    }
    return data;
};

const normalizeNote = (input: string) => {
    const simplified = Note.simplify(input)
        .replace(/[A-G]/, match => `${match.substr(0, 1)}</say-as>`)
        .replace('b', '<sub alias="flat">\u266d</sub>', true)
        .replace('#', '<sub alias="sharp">\u266f</sub>', true);

    return `<say-as interpret-as="verbatim">${simplified}`;
}

/**
 * Return a list of notes for a given scale name
 * @param app 
 */
const decodeScale = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const data = initData(app);

    const scaleName = app.getArgument(Parameters.SCALE);
    const rootNote = app.getArgument(Parameters.ROOT_NOTE); // Default is 'C' - set in DialogFlow

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', scaleName, rootNote);
    }

    if (scaleName) {
        const decodedScale: string = Scale
            .notes(rootNote + ' ' + scaleName)
            .map(scaleNote => normalizeNote(scaleNote))
            .join(' – </s><s>');

        const verbalResponse = sprintf(
            getRandomValue(strings.scale.decode),
            {
                rootNote: normalizeNote(rootNote),
                scaleName,
                decodedScale: `<p><s>${decodedScale}</s></p>`
            }
        );

        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(`<speak>${verbalResponse}</speak>`)
            // .addBasicCard(card)
        );

    }
};

/**
 * Name an interval from two notes
 * @param app 
 */
const interval = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const data = initData(app);

    const rootNote = app.getArgument(Parameters.ROOT_NOTE);
    const targetNote = app.getArgument(Parameters.TARGET_NOTE);

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', rootNote, targetNote);
    }

    if (rootNote && targetNote) {
        const decodedInterval: string = Distance.interval(rootNote, targetNote);
        const semitones: string = Distance.semitones(rootNote, targetNote).toString();
        const intervalName: string = strings.interval.names[decodedInterval] || decodedInterval;

        const verbalResponse = sprintf(
            getRandomValue(strings.interval.decode),
            {
                rootNote: normalizeNote(rootNote),
                targetNote: normalizeNote(targetNote),
                intervalName,
                semitones
            }
        );

        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(`<speak>${verbalResponse}</speak>`)
            // .addBasicCard(card)
        );
    }
};

/**
 * Name an interval from two notes
 * @param app 
 */
const noteFreq = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const data = initData(app);

    const note = app.getArgument(Parameters.NOTE);
    const octave = app.getArgument(Parameters.OCTAVE);

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', note, octave);
    }

    if (note && octave) {
        const noteName = note.trim() + octave;
        const frequency: string = Note.freq(noteName).toString();
        const midi: string = Note.midi(noteName);

        const verbalResponse = sprintf(
            getRandomValue(strings.note.freq),
            {
                note: normalizeNote(note),
                octave: `<say-as interpret-as="ordinal">${octave}</say-as>`,
                frequency,
                midi
            }
        );

        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(`<speak>${verbalResponse}</speak>`)
            // .addBasicCard(card)
        );
    } else {
        ask(app, `Sorry, I couldn't find any information on your note. Please provide a note and its octave.`)
    }
};

/**
 * Detect a scale from provided notes
 * @param app 
 */
const encodeScale = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const data = initData(app);

    const note1 = app.getArgument(Parameters.NOTES.NOTE1);
    const note2 = app.getArgument(Parameters.NOTES.NOTE2);
    const note3 = app.getArgument(Parameters.NOTES.NOTE3);
    const note4 = app.getArgument(Parameters.NOTES.NOTE4);
    const note5 = app.getArgument(Parameters.NOTES.NOTE5);
    const note6 = app.getArgument(Parameters.NOTES.NOTE6);
    const note7 = app.getArgument(Parameters.NOTES.NOTE7);

    let scaleNames: string[] = scale([note1, note2, note3, note4, note5, note6, note7]);

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', note1, note2, note3, note4, note5, note6, note7);
        console.log('Detected scales', scaleNames);
    }

    if (scaleNames.length) {
        scaleNames = scaleNames.map(name => {
            const arr = name.split(' ');
            const tonic = normalizeNote(arr.shift());
            return `${tonic} ${arr.join(' ')}`
        });

        let label;

        if (scaleNames.length === 1) {
            label = strings.scale.encode.one;
        } else if (scaleNames.length === 2) {
            label = strings.scale.encode.two;
        } else if (scaleNames.length >= 3) {
            label = strings.scale.encode.many;
        }

        const verbalResponse = sprintf(
            getRandomValue(label),
            { scaleNames: scaleNames }
        );

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(`<speak>${verbalResponse}</speak>`)
            // .addBasicCard(card)
        );
    } else {
        // TODO: strings + getRandomValue
        ask(app, `Sorry, I couldn't find any scale containing those notes. Please provide a list of at least five notes belonging to that scale.`)
    }
};

/**
 * Detect a scale from provided notes
 * @param app 
 */
const encodeChord = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const data = initData(app);

    const notes = app.getArgument(Parameters.CHORD_NOTES);

    let chords: string[] = chord(notes);

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', notes);
        console.log('Detected scales', chords);
    }

    if (chords.length) {
        chords = chords.map(name => {
            const arr = name.split(' ');
            const tonic = normalizeNote(arr.shift());
            return `${tonic} ${arr.join(' ')}`
        });

        let label;

        if (chords.length === 1) {
            label = strings.scale.encode.one; // TODO chords
        } else if (chords.length === 2) {
            label = strings.scale.encode.two;
        } else if (chords.length >= 3) {
            label = strings.scale.encode.many;
        }

        const verbalResponse = sprintf(
            getRandomValue(label),
            { chords: chords }
        );

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(`<speak>${verbalResponse}</speak>`)
            // .addBasicCard(card)
        );
    } else {
        // TODO: strings + getRandomValue
        ask(app, `Sorry, I couldn't find any chord containing those notes. Please provide a list of at least three notes making this chord.`)
    }
};

const repeat = app => {
    if (!app.data.lastPrompt) {
        // TODO: strings.
        ask(app, `Sorry, I didn't understand. What would you like to know?`);
    }
    // Move SSML start tags for simple response over
    if (typeof app.data.lastPrompt === 'string') {
        let repeatPrefix = `Sure, here's that again.`;
        const ssmlPrefix = `<speak>`;
        if (app.data.lastPrompt.startsWith(ssmlPrefix)) {
            app.data.lastPrompt = app.data.lastPrompt.slice(ssmlPrefix.length);
            repeatPrefix = ssmlPrefix + repeatPrefix;
        }
        ask(app, repeatPrefix + app.data.lastPrompt, app.data.lastNoInputPrompts);
    } else {
        ask(app, app.data.lastPrompt, app.data.lastNoInputPrompts);
    }
};

const actionMap = new Map();
actionMap.set(Actions.UNRECOGNIZED_DEEP_LINK, unhandledDeepLinks);
actionMap.set(Actions.DECODE_SCALE, decodeScale);
actionMap.set(Actions.ENCODE_SCALE, encodeScale);
// actionMap.set(Actions.ENCODE_CHORD, encodeChord); // TODO
actionMap.set(Actions.NOTE_FREQ, noteFreq);
actionMap.set(Actions.INTERVAL, interval);
actionMap.set(Actions.REPEAT, repeat);

/**
 * The entry point to handle a http request
 * @param {Request} request An Express like Request object of the HTTP request
 * @param {Response} response An Express like Response object to send back data
 */
const musicScales = functions.https.onRequest((request, response) => {
    const app = new DialogflowApp({
        request,
        response
    });
    console.log(`Request headers: ${JSON.stringify(request.headers)}`);
    console.log(`Request body: ${JSON.stringify(request.body)}`);
    app.handleRequest(actionMap);
});

const scoreImage = functions.https.onRequest((request, response) => {
    const notesString = request.query.notes;

    if (notesString === undefined || notesString.length === 0) {
        // Invalid parameter
        response.status(400).send('Bad Request - Requires `notes` GET parameters');
        return;
    }

    const notes = notesString.split(',').map(d => parseInt(d, 10));

    if (notes.length < 1 || notes.length > 10) {
        // Validate number of notes
        response.status(400).send('Bad Request - `notes` list must have between 1 and 10 values inclusive');
        return;
    }

    // Generate a canvas
    const Canvas = require('canvas-prebuilt');
    const Vex = require('vexflow');
    const cWidth = 500;
    const cHeight = 200;
    const canvas = new Canvas(cWidth, cHeight);
    const ctx = canvas.getContext('2d');

    const VF = Vex.Flow;
    const vf = new VF.Factory({});
    const score = vf.EasyScore();
    const vfSystem = vf.System();

    vfSystem.addStave({
        voices: [
            score.voice(
                score.notes('C4/8, D4, E4, F#4, G#4, A4, B4/q', {
                    stem: 'up'
                })
            )
        ]
    }).addClef('treble').addTimeSignature('4/4');

    vf.setContext(ctx).draw();

    response.set('Cache-Control', 'public, max-age=60, s-maxage=31536000');
    response.writeHead(200, {
        'Content-Type': 'image/png'
    });
    canvas.pngStream().pipe(response);
});

module.exports = {
    musicScales,
    scoreImage
};

// // Start writing Firebase Functions
// // https://firebase.google.com/functions/write-firebase-functions
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
