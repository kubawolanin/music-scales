'use strict';

process.env.DEBUG = 'actions-on-google:*';

import * as functions from 'firebase-functions';
const { DialogflowApp } = require('actions-on-google');
import { sprintf } from 'sprintf-js';
import { Note, Chord, Distance, transpose, scale } from 'tonal';
import * as Arr from 'tonal-array';
import * as Detect from 'tonal-detector';

const DEFAULT_LOCALE = 'en-US';
const config = require('./config.js');
const localizedStrings = {
    'en-US': require('./strings_en-US.js'),
    'fr-FR': require('./strings_fr-FR.js')
};

const DEBUG_LOGS = true;

// const IMAGE_URL = config.imageUrl; // TODO: Code
const SOUND_URL = config.soundUrl;

/** Dialogflow Actions {@link https://dialogflow.com/docs/actions-and-parameters#actions} */
const Actions = {
    DECODE_SCALE: 'decode.scale',
    ENCODE_SCALE: 'encode.scale',
    DECODE_CHORD: 'decode.chord', // TODO
    ENCODE_CHORD: 'encode.chord',
    INTERVAL: 'interval',
    NOTE_FREQ: 'note.freq',
    REPEAT: 'repeat',
    UNRECOGNIZED_DEEP_LINK: 'deeplink.unknown',
};
/** Dialogflow Contexts {@link https://dialogflow.com/docs/contexts} */
const Contexts = {
    DECODE_SCALE: 'decode-scale',
    ENCODE_SCALE: 'encode-scale',
    DECODE_CHORD: 'decode-chord', // TODO
    ENCODE_CHORD: 'encode-chord',
    INTERVAL: 'interval',
    NOTE_FREQ: 'note-freq'
};
/** Dialogflow Context Lifespans {@link https://dialogflow.com/docs/contexts#lifespan} */
const Lifespans = {
    DEFAULT: 5,
    END: 0
};
/** Dialogflow Parameters {@link https://dialogflow.com/docs/actions-and-parameters#parameters} */
const Parameters = {
    ROOT_NOTE: 'root-note',
    ROOT_NOTE_OCTAVE: 'root-note-octave',
    SCALE: 'scale',
    TARGET_NOTE: 'target-note',
    TARGET_NOTE_OCTAVE: 'target-note-octave',
    INTERVAL: 'interval',
    NOTES: 'notes',
    NOTE: 'note',
    OCTAVE: 'octave',
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
 * Case insensitive string replacing
 * @param text Text to replace
 * @param mapObject Map object
 */
const replaceAll = (text: string, mapObject: any) => {
    const pattern = new RegExp(Object.keys(mapObject).join("|"), "g");

    return text.replace(pattern, function (matched) {
        return mapObject[matched];
    });
};

const list = (array, strings) => {
    let items = array.toString();

    if (array.length > 1) {
        items = array
            .map((item, index, arr) => {
                if (index === arr.length - 1) {
                    return `${strings.general.or} ${item}`;
                }
                if (index === arr.length - 2) {
                    return item;
                }
                return `${item},`;
            })
            .join(' ');
    }

    return items;
}

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
 * Make the note pronounceable
 * @param input Note
 */
const normalizeNote = (input: string, strings) => {
    const simplified = Note.simplify(input)
        .replace(/[A-G]/, match => `${strings.note.names[match.substr(0, 1)]}</say-as>`)
        .replace('b', `<sub alias="${strings.chord.names.flat}">\u266d</sub>`, true)
        .replace('#', `<sub alias="${strings.chord.names.sharp}">\u266f</sub>`, true);

    return `<say-as interpret-as="verbatim">${simplified}`;
}

const normalizeChord = (input: string, strings) => {
    const map = {
        'no': `<sub alias="${strings.chord.names.omit}">no</sub>`,

        'ø': `<sub alias="${strings.chord.names.halfdiminished}">ø</sub>`,
        'm7b5': `<sub alias="${strings.chord.names.halfdiminished}">m7b5</sub>`,

        'Maj': `<sub alias="${strings.chord.names.major}">Maj</sub>`,
        'maj': `<sub alias="${strings.chord.names.major}">maj</sub>`,
        'M': `<sub alias="${strings.chord.names.major}">M</sub>`,

        'Min': `<sub alias="${strings.chord.names.minor}">Min</sub>`,
        'min': `<sub alias="${strings.chord.names.minor}">min</sub>`,
        'm': `<sub alias="${strings.chord.names.minor}">m</sub>`,

        'sus': `<sub alias="${strings.chord.names.suspended}">sus</sub>`,

        '\\+': `<sub alias="${strings.chord.names.augmented}">+</sub>`,
        'aug': `<sub alias="${strings.chord.names.augmented}">aug</sub>`,

        'o': `<sub alias="${strings.chord.names.diminished}">o</sub>`,
        'dim': `<sub alias="${strings.chord.names.diminished}">dim</sub>`,

        'b': `<sub alias="${strings.chord.names.flat}">\u266d</sub>`,
        '#': `<sub alias="${strings.chord.names.sharp}">\u266f</sub>`
    }

    const token = Chord.tokenize(input);
    const tonic = normalizeNote(token[0], strings);
    const type = replaceAll(token[1], map);

    return `${tonic}${type}`;
}

/**
 * Set up app.data for use in the action
 * @param {DialogflowApp} app DialogflowApp instance
 */
const initData = app => {
    const data = app.data;
    return data;
};

const ssml = (spokenText: string, notes: string[], sequence = true, parallel?: boolean) => {
    const token = note => Note.tokenize(note);
    // Convert all notes to sharps only and place them in <audio> elements
    const audios = notes
        .map(note => Note.simplify(note, token(note)[1] === '#'))
        .map(note => {
            const name = note
                .toLowerCase()
                .replace('#', '_sharp_')
                .replace(/[0-9]/, '');
            const octave = ['4', '5'].includes(token(note)[2]) ? token(note)[2] : 4;
            return `${SOUND_URL}${name}${octave}.ogg`
        })
        .map(url => `<audio src="${url}"/>`);

    const sequenceTemplate = sequence ? `<media>${audios.join('\n')}</media>` : '';
    const parallelTemplate = parallel ? `<par>${
        audios.map(audio => `<media>${audio}</media>`).join('\n')
        }</par>` : '';

    return `<speak>
        <seq>
            <media><speak>${spokenText}</speak></media>
            ${sequenceTemplate}
            ${parallelTemplate}
        </seq>
    </speak>`;
}

const plainText = (ssmlText: string) => ssmlText.replace(/<[^>]*>/g, '').trim();

const simpleResponse = (ssmlText: string) => { return { speech: ssmlText, displayText: plainText(ssmlText) } };
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
        const notes: string[] = scale(scaleName).map(transpose(`${rootNote}4`));
        const decodedScale: string = notes
            .map(note => note.replace(/[0-9]/, ''))
            .map(scaleNote => normalizeNote(scaleNote, strings))
            .join(' – </s><s>');
        // Add ending note 12 tones higher
        notes.push(transpose(notes[0], '8P'));

        const verbal = sprintf(
            getRandomValue(strings.scale.decode),
            {
                scaleName,
                rootNote: normalizeNote(rootNote, strings),
                decodedScale: `<p><s>${decodedScale}</s></p>`
            }
        );

        const verbalResponse = ssml(verbal, notes);

        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(simpleResponse(verbalResponse))
            // .addBasicCard(card)
        );
    } else {
        ask(app, getRandomValue(strings.scale.notfound.decode))
    }
};

/**
 * Detect a scale from provided notes
 * @param app 
 */
const encodeScale = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const data = initData(app);

    const notes = Arr.sort(app.getArgument(Parameters.NOTES));
    let scaleNames: string[] = Detect.scale(notes);

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', notes.join(', '));
        console.log('Detected scales', scaleNames);
    }

    if (scaleNames.length) {
        // Add ending note 12 tones higher
        notes.push(transpose(`${notes[0]}4`, '8P'));

        scaleNames = scaleNames.map(name => {
            const arr = name.split(' ');
            const tonic = normalizeNote(arr.shift(), strings);
            return `${tonic} ${arr.join(' ')}`
        });

        const verbal = sprintf(
            getRandomValue(strings.scale.encode),
            { scaleNames: list(scaleNames, strings) }
        );

        const verbalResponse = ssml(verbal, notes);

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(simpleResponse(verbalResponse))
            // .addBasicCard(card)
        );
    } else {
        ask(app, getRandomValue(strings.scale.notfound.encode))
    }
};

/**
 * Detect a chord from provided notes
 * @param app 
 */
const encodeChord = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const data = initData(app);

    const notes = app.getArgument(Parameters.NOTES);
    const chords: string[] = Detect.chord(notes);

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', notes);
        console.log('Detected chords', chords);
    }

    if (chords.length) {
        const normalized = chords.map(chord => normalizeChord(chord, strings));
        const verbal = sprintf(
            getRandomValue(strings.chord.encode),
            { chords: list(normalized, strings) }
        );

        const verbalResponse = ssml(verbal, notes, false, true);

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(simpleResponse(verbalResponse))
            // .addBasicCard(card)
        );
    } else {
        ask(app, getRandomValue(strings.chord.notfound))
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
    const rootOctave = app.getArgument(Parameters.ROOT_NOTE_OCTAVE);
    const targetOctave = app.getArgument(Parameters.TARGET_NOTE_OCTAVE);

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', rootNote, rootOctave, targetNote, targetOctave);
    }

    if (rootNote && targetNote) {
        const decodedInterval: string = Distance.interval(rootNote, targetNote);
        const semitones: string = Distance.semitones(rootNote, targetNote).toString();
        const intervalName: string = strings.interval.names[decodedInterval] || decodedInterval;

        const verbal = sprintf(
            getRandomValue(strings.interval.decode),
            {
                rootNote: normalizeNote(rootNote, strings),
                targetNote: normalizeNote(targetNote, strings),
                intervalName,
                semitones
            }
        );

        const verbalResponse = ssml(verbal, [rootNote, targetNote], true, true);

        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)

        app.tell(
            app.buildRichResponse()
                .addSimpleResponse(simpleResponse(verbalResponse))
            // .addBasicCard(card)
        );
    } else {
        ask(app, getRandomValue(strings.interval.notfound))
    }
};

/**
 * Get a frequency of a given note
 * @param app 
 */
const noteFreq = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const data = initData(app);

    const note = app.getArgument(Parameters.NOTE);
    const octave = app.getArgument(Parameters.OCTAVE) || 4;

    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', note, octave);
    }

    if (note && octave) {
        const noteName = note.trim() + octave;
        const freq = Note.freq(noteName);
        const frequency: string = freq ? freq.toFixed(2) : undefined;
        const midi: string = Note.midi(noteName);

        const verbal = sprintf(
            getRandomValue(strings.note.freq),
            {
                note: normalizeNote(note, strings),
                octave: `<say-as interpret-as="ordinal">${octave}</say-as>`,
                frequency,
                midi
            }
        );

        const verbalResponse = ssml(verbal, [Note.from({ oct: octave }, note)]);

        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)

        if (frequency && octave < 10) {
            app.tell(
                app.buildRichResponse()
                    .addSimpleResponse(simpleResponse(verbalResponse))
                // .addBasicCard(card)
            );
        } else {
            ask(app, getRandomValue(strings.note.notfound))
        }
    } else {
        ask(app, getRandomValue(strings.note.notfound))
    }
};

const repeat = app => {
    if (!app.data.lastPrompt) {
        // TODO: -> strings.
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
actionMap.set(Actions.ENCODE_CHORD, encodeChord);
actionMap.set(Actions.NOTE_FREQ, noteFreq);
actionMap.set(Actions.INTERVAL, interval);
// actionMap.set(Actions.REPEAT, repeat);

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
    const isChord = request.query.chord === "true" || false;

    if (notesString === undefined || notesString.length === 0) {
        // Invalid parameter
        response.status(400).send('Bad Request - Requires `notes` GET parameters');
        return;
    }

    const input = notesString.split(',').map(note => {
        return Note.simplify(note).toLowerCase();
    });

    if (input.length < 1 || input.length > 16) {
        // Validate number of notes
        response.status(400).send('Bad Request - `notes` list must have between 1 and 16 values inclusive');
        return;
    }


    response.set('Cache-Control', 'public, max-age=60, s-maxage=31536000');
    // TODO
    // canvas.pngStream().pipe(response);
});

module.exports = {
    musicScales,
    scoreImage
};
