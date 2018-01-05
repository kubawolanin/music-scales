'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
process.env.DEBUG = 'actions-on-google:*';
const functions = require("firebase-functions");
const { DialogflowApp } = require('actions-on-google');
const sprintf_js_1 = require("sprintf-js");
const tonal_1 = require("tonal");
const Arr = require("tonal-array");
const Detect = require("tonal-detector");
const DEFAULT_LOCALE = 'en-US';
const localizedStrings = {
    'en-US': require('./strings_en-US.js'),
    'fr-FR': require('./strings_fr-FR.js')
};
const DEBUG_LOGS = true;
// const IMAGE_URL = `https://us-central1-music-scales-2d18d.cloudfunctions.net/scoreImage`; // TODO: Code
const SOUND_URL = `https://music-scales-2d18d.firebaseapp.com/sounds/`;
/** Dialogflow Actions {@link https://dialogflow.com/docs/actions-and-parameters#actions} */
const Actions = {
    DECODE_SCALE: 'decode.scale',
    ENCODE_SCALE: 'encode.scale',
    DECODE_CHORD: 'decode.chord',
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
    DECODE_CHORD: 'decode-chord',
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
const ask = (app, inputPrompt, noInputPrompts) => {
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
const replaceAll = (text, mapObject) => {
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
};
/**
 * Greet the user and direct them to next turn
 * @param {DialogflowApp} app DialogflowApp instance
 * @return {void}
 */
const unhandledDeepLinks = app => {
    const strings = localizedStrings[app.getUserLocale()] || localizedStrings[DEFAULT_LOCALE];
    const rawInput = app.getRawInput();
    const response = sprintf_js_1.sprintf(strings.general.unhandled, rawInput);
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
const normalizeNote = (input, strings) => {
    const simplified = tonal_1.Note.simplify(input)
        .replace(/[A-G]/, match => `${strings.note.names[match.substr(0, 1)]}</say-as>`)
        .replace('b', `<sub alias="${strings.chord.names.flat}">\u266d</sub>`, true)
        .replace('#', `<sub alias="${strings.chord.names.sharp}">\u266f</sub>`, true);
    return `<say-as interpret-as="verbatim">${simplified}`;
};
const normalizeChord = (input, strings) => {
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
    };
    const token = tonal_1.Chord.tokenize(input);
    const tonic = normalizeNote(token[0], strings);
    const type = replaceAll(token[1], map);
    return `${tonic}${type}`;
};
/**
 * Set up app.data for use in the action
 * @param {DialogflowApp} app DialogflowApp instance
 */
const initData = app => {
    const data = app.data;
    // if (!data.tips) {
    //     data.tips = {
    //         content: {},
    //         cats: null
    //     };
    // }
    return data;
};
const ssml = (spokenText, notes, sequence = true, parallel) => {
    const token = note => tonal_1.Note.tokenize(note);
    // Convert all notes to sharps only and place them in <audio> elements
    const audios = notes
        .map(note => tonal_1.Note.simplify(note, token(note)[1] === '#'))
        .map(note => {
        const name = note
            .toLowerCase()
            .replace('#', '_sharp_')
            .replace(/[0-9]/, '');
        const octave = ['4', '5'].includes(token(note)[2]) ? token(note)[2] : 4;
        return `${SOUND_URL}${name}${octave}.ogg`;
    })
        .map(url => `<audio src="${url}"/>`);
    const sequenceTemplate = sequence ? `<media>${audios.join('\n')}</media>` : '';
    const parallelTemplate = parallel ? `<par>${audios.map(audio => `<media>${audio}</media>`).join('\n')}</par>` : '';
    return `<speak>
        <seq>
            <media><speak>${spokenText}</speak></media>
            ${sequenceTemplate}
            ${parallelTemplate}
        </seq>
    </speak>`;
};
const plainText = (ssmlText) => ssmlText.replace(/<[^>]*>/g, '').trim();
const simpleResponse = (ssmlText) => { return { speech: ssmlText, displayText: plainText(ssmlText) }; };
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
        const notes = tonal_1.scale(scaleName).map(tonal_1.transpose(`${rootNote}4`));
        const decodedScale = notes
            .map(note => note.replace(/[0-9]/, ''))
            .map(scaleNote => normalizeNote(scaleNote, strings))
            .join(' – </s><s>');
        // Add ending note 12 tones higher
        notes.push(tonal_1.transpose(notes[0], '8P'));
        const verbal = sprintf_js_1.sprintf(getRandomValue(strings.scale.decode), {
            scaleName,
            rootNote: normalizeNote(rootNote, strings),
            decodedScale: `<p><s>${decodedScale}</s></p>`
        });
        const verbalResponse = ssml(verbal, notes);
        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)
        app.tell(app.buildRichResponse()
            .addSimpleResponse(simpleResponse(verbalResponse))
        // .addBasicCard(card)
        );
    }
    else {
        ask(app, getRandomValue(strings.scale.notfound.decode));
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
    let scaleNames = Detect.scale(notes);
    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', notes.join(', '));
        console.log('Detected scales', scaleNames);
    }
    if (scaleNames.length) {
        // Add ending note 12 tones higher
        notes.push(tonal_1.transpose(`${notes[0]}4`, '8P'));
        scaleNames = scaleNames.map(name => {
            const arr = name.split(' ');
            const tonic = normalizeNote(arr.shift(), strings);
            return `${tonic} ${arr.join(' ')}`;
        });
        const verbal = sprintf_js_1.sprintf(getRandomValue(strings.scale.encode), { scaleNames: list(scaleNames, strings) });
        const verbalResponse = ssml(verbal, notes);
        app.tell(app.buildRichResponse()
            .addSimpleResponse(simpleResponse(verbalResponse))
        // .addBasicCard(card)
        );
    }
    else {
        ask(app, getRandomValue(strings.scale.notfound.encode));
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
    const chords = Detect.chord(notes);
    if (DEBUG_LOGS) {
        console.log('Received data', data);
        console.log('Received parameters', notes);
        console.log('Detected chords', chords);
    }
    if (chords.length) {
        const normalized = chords.map(chord => normalizeChord(chord, strings));
        const verbal = sprintf_js_1.sprintf(getRandomValue(strings.chord.encode), { chords: list(normalized, strings) });
        const verbalResponse = ssml(verbal, notes, false, true);
        app.tell(app.buildRichResponse()
            .addSimpleResponse(simpleResponse(verbalResponse))
        // .addBasicCard(card)
        );
    }
    else {
        ask(app, getRandomValue(strings.chord.notfound));
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
        const decodedInterval = tonal_1.Distance.interval(rootNote, targetNote);
        const semitones = tonal_1.Distance.semitones(rootNote, targetNote).toString();
        const intervalName = strings.interval.names[decodedInterval] || decodedInterval;
        const verbal = sprintf_js_1.sprintf(getRandomValue(strings.interval.decode), {
            rootNote: normalizeNote(rootNote, strings),
            targetNote: normalizeNote(targetNote, strings),
            intervalName,
            semitones
        });
        const verbalResponse = ssml(verbal, [rootNote, targetNote], true, true);
        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)
        app.tell(app.buildRichResponse()
            .addSimpleResponse(simpleResponse(verbalResponse))
        // .addBasicCard(card)
        );
    }
    else {
        ask(app, getRandomValue(strings.interval.notfound));
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
        const freq = tonal_1.Note.freq(noteName);
        const frequency = freq ? freq.toFixed(2) : undefined;
        const midi = tonal_1.Note.midi(noteName);
        const verbal = sprintf_js_1.sprintf(getRandomValue(strings.note.freq), {
            note: normalizeNote(note, strings),
            octave: `<say-as interpret-as="ordinal">${octave}</say-as>`,
            frequency,
            midi
        });
        const verbalResponse = ssml(verbal, [tonal_1.Note.from({ oct: octave }, note)]);
        // const card = app.buildBasicCard()
        // .setImage(drum.getImageUrl(), `${drum.getFundamental()}`)
        if (frequency && octave < 10) {
            app.tell(app.buildRichResponse()
                .addSimpleResponse(simpleResponse(verbalResponse))
            // .addBasicCard(card)
            );
        }
        else {
            ask(app, getRandomValue(strings.note.notfound));
        }
    }
    else {
        ask(app, getRandomValue(strings.note.notfound));
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
    }
    else {
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
        return tonal_1.Note.simplify(note).toLowerCase();
    });
    if (input.length < 1 || input.length > 16) {
        // Validate number of notes
        response.status(400).send('Bad Request - `notes` list must have between 1 and 16 values inclusive');
        return;
    }
    response.set('Cache-Control', 'public, max-age=60, s-maxage=31536000');
    response.send(`
    <svg width="800" height="396" viewBox="0 0 400 198"><path stroke-width="1" fill="none" stroke="#999999" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" d="M15 80L365 80"></path><path stroke-width="1" fill="none" stroke="#999999" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" d="M15 90L365 90"></path><path stroke-width="1" fill="none" stroke="#999999" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" d="M15 100L365 100"></path><path stroke-width="1" fill="none" stroke="#999999" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" d="M15 110L365 110"></path><path stroke-width="1" fill="none" stroke="#999999" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" d="M15 120L365 120"></path><rect stroke-width="0.3" fill="black" stroke="black" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="15" y="79.5" width="1" height="41"></rect><rect stroke-width="0.3" fill="black" stroke="black" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41"></rect><path stroke-width="0.3" fill="black" stroke="none" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M20 110M34.0544 66.8288C34.112 66.80000000000001,34.1696 66.80000000000001,34.256 66.80000000000001C34.6016 66.80000000000001,35.0048 67.088,35.580799999999996 67.80799999999999C37.9136 70.4864,39.5552 75.152,39.5552 78.9536C39.5552 79.2416,39.4976 79.47200000000001,39.4976 79.76C39.2384 84.2816,37.3952 87.99680000000001,33.7376 91.5104L32.7584 92.4608L32.4128 92.8352L32.4128 92.9504L32.6144 93.8144L32.931200000000004 95.3696L33.248 96.8096C33.68 98.768,33.8528 99.776,33.8528 99.776C33.8528 99.776,33.8528 99.776,33.8528 99.776C33.8528 99.776,33.968 99.776,34.112 99.74719999999999C34.256 99.74719999999999,34.7168 99.6896,35.2064 99.6896C35.552 99.6896,35.8976 99.74719999999999,36.0704 99.74719999999999C40.1312 100.2656,43.270399999999995 103.1744,44.1632 107.264C44.336 107.9264,44.3936 108.6464,44.3936 109.3664C44.3936 113.2544,42.0608 116.9696,38.172799999999995 118.7264C37.9424 118.8704,37.855999999999995 118.89920000000001,37.855999999999995 118.89920000000001L37.855999999999995 118.928C37.855999999999995 118.928,38.028800000000004 119.5904,38.172799999999995 120.3392L38.6048 122.528L39.007999999999996 124.2848C39.2384 125.408,39.3536 126.2144,39.3536 126.9344C39.3536 127.568,39.2672 128.144,39.1232 128.8064C38.144 132.8096,34.6592 135.2,31.0304 135.2C29.244799999999998 135.2,27.401600000000002 134.624,25.788800000000002 133.328C24.3488 132.1184,23.7152 131.024,23.7152 129.584C23.7152 127.0496,25.759999999999998 125.264,27.891199999999998 125.264C28.64 125.264,29.3888 125.4944,30.108800000000002 125.9264C31.3184 126.7616,31.8656 128.0288,31.8656 129.2672C31.8656 131.168,30.540799999999997 133.04,28.2656 133.184L28.0352 133.184L28.208 133.29919999999998C29.1584 133.7024,30.108800000000002 133.904,31.0304 133.904C33.3632 133.904,35.552 132.7232,36.8768 130.6784C37.6256 129.5264,38.028800000000004 128.1728,38.028800000000004 126.8192C38.028800000000004 126.3008,37.9424 125.7824,37.827200000000005 125.2064C37.827200000000005 125.1488,37.7408 124.688,37.6256 124.256C36.992000000000004 121.1456,36.617599999999996 119.3312,36.617599999999996 119.3312C36.617599999999996 119.3312,36.617599999999996 119.3312,36.617599999999996 119.3312C36.56 119.3312,36.4448 119.3312,36.3584 119.3888C36.0704 119.4464,35.4656 119.5904,35.2064 119.6192C34.5728 119.7056,33.968 119.7344,33.391999999999996 119.7344C27.7472 119.7344,22.5056 115.9328,20.6912 110.3168C20.2304 108.8192,19.9712 107.3216,19.9712 105.824C19.9712 102.8288,20.9216 99.8912,22.7648 97.2704C24.7808 94.4192,26.7968 91.9712,29.273600000000002 89.4368L30.1376 88.544L29.936 87.4784L29.5616 85.7216L29.072 83.4752C28.927999999999997 82.64,28.755200000000002 81.8336,28.726399999999998 81.6608C28.5824 80.71039999999999,28.496000000000002 79.78880000000001,28.496000000000002 78.83840000000001C28.496000000000002 75.2096,29.6768 71.7248,31.894399999999997 68.9312C32.556799999999996 68.0672,33.7376 66.9152,34.0544 66.8288M35.8112 72.5312C35.7536 72.5312,35.6672 72.5312,35.580799999999996 72.5312C34.4 72.5312,32.873599999999996 73.62559999999999,31.8368 75.2384C30.7712 76.8224,30.224 78.9248,30.224 81.0848C30.224 81.6608,30.2528 82.2656,30.339199999999998 82.8704C30.4256 83.3024,30.4544 83.5904,30.6848 84.6272L31.088 86.4416C31.2032 86.9888,31.2896 87.4208,31.2896 87.4784L31.2896 87.4784C31.3184 87.4784,32.2112 86.4992,32.4992 86.1536C35.3792 82.89920000000001,37.1072 79.47200000000001,37.4816 76.44800000000001C37.510400000000004 76.16,37.510400000000004 75.9296,37.510400000000004 75.64160000000001C37.510400000000004 74.7488,37.3952 73.8848,37.1936 73.424C36.9632 72.9632,36.4448 72.58879999999999,35.8112 72.5312M31.4624 94.7936C31.4048 94.3904,31.3184 94.0736,31.3184 94.016C31.3184 94.016,31.3184 94.016,31.2896 94.016C31.232 94.016,29.9936 95.456,29.1296 96.464C27.660800000000002 98.2496,26.1056 100.3808,25.472 101.4176C24.2624 103.4624,23.6576 105.7376,23.6576 107.984C23.6576 109.4528,23.9456 110.864,24.464 112.2176C26.019199999999998 116.2208,29.5904 118.7264,33.4784 118.7264C33.9392 118.7264,34.4576 118.6976,34.947199999999995 118.6112C35.580799999999996 118.496,36.3584 118.2656,36.3584 118.1792L36.3584 118.1792C36.3584 118.1792,36.300799999999995 117.8912,36.2144 117.5744L35.3792 113.456L34.7168 110.3744L34.2848 108.2432L33.824 106.1696C33.5936 104.9312,33.5072 104.6144,33.5072 104.6144C33.5072 104.6144,33.5072 104.5856,33.4784 104.5856C33.3056 104.5856,32.384 105.0464,31.980800000000002 105.3344C30.4832 106.3712,29.7056 108.0128,29.7056 109.6256C29.7056 111.152,30.4544 112.6784,31.894399999999997 113.5712C32.2112 113.7728,32.3264 113.9456,32.3264 114.1472C32.3264 114.176,32.3264 114.2624,32.3264 114.2912C32.2688 114.6368,32.0672 114.7808,31.7792 114.7808C31.664 114.7808,31.52 114.752,31.3472 114.6656C28.6976 113.5136,26.912 110.7776,26.912 107.7824L26.912 107.7824C26.912 104.3264,29.072 101.3312,32.384 100.1504L32.556799999999996 100.0928L32.2688 98.6528L31.4624 94.7936M35.782399999999996 104.4128C35.552 104.384,35.321600000000004 104.384,35.1488 104.384C35.0912 104.384,35.0048 104.384,34.947199999999995 104.384L34.803200000000004 104.384L34.9184 104.9024L35.5232 107.7248L35.8976 109.568L36.300799999999995 111.3824L37.1072 115.3856L37.424 116.912C37.5392 117.3152,37.5968 117.6608,37.6256 117.6608C37.6256 117.6608,37.6256 117.6608,37.6256 117.6608C37.654399999999995 117.6608,38.144 117.3728,38.4608 117.1424C39.9296 116.1056,41.024 114.4928,41.4272 112.8224C41.571200000000005 112.2752,41.6288 111.6992,41.6288 111.152C41.6288 107.8112,39.152 104.7872,35.782399999999996 104.4128"></path><path stroke-width="1" fill="none" stroke="#999999" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M78.09696 130L118.11 130"></path><g class="vf-stavenote" id="vf-auto1039"><g class="vf-note" pointer-events="bounding-box"><g class="vf-notehead" pointer-events="bounding-box"><path stroke-width="0.3" fill="black" stroke="none" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M81.09696 130M88.79088 124.83328C89.09976 124.77712,89.40863999999999 124.77712,89.71752 124.77712C94.15415999999999 124.77712,97.86072 126.74272,98.39424 129.38224C98.42232 129.63496,98.47847999999999 129.8596,98.47847999999999 130.02808C98.47847999999999 132.92032,94.6596 135.25096,89.7456 135.25096C84.8316 135.25096,81.09696 132.86416,81.09696 130.02808C81.09696 129.69112,81.12504 129.35416,81.23736 128.98912C81.91127999999999 126.7708,85.05624 125.05792,88.79088 124.83328M89.21208 125.47912C89.07168 125.45104,88.87512 125.45104,88.73472 125.45104C86.96567999999999 125.45104,85.89864 126.96736,85.89864 128.84872C85.89864 129.8596,86.20752 130.95472,86.85336 132.04984C87.9204 133.73464,89.4648 134.57704,90.78456 134.57704C91.90776 134.57704,92.89056 133.98736,93.33984 132.75184C93.5364 132.2464,93.62064 131.74096,93.62064 131.20744C93.62064 128.68024,91.68312 125.87224,89.21208 125.47912"></path></g><g class="vf-notehead" pointer-events="bounding-box"><path stroke-width="0.3" fill="black" stroke="none" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M97.72847999999999 130M105.4224 124.83328C105.73128 124.77712,106.04015999999999 124.77712,106.34903999999999 124.77712C110.78567999999999 124.77712,114.49224 126.74272,115.02575999999999 129.38224C115.05384 129.63496,115.10999999999999 129.8596,115.10999999999999 130.02808C115.10999999999999 132.92032,111.29111999999999 135.25096,106.37711999999999 135.25096C101.46311999999999 135.25096,97.72847999999999 132.86416,97.72847999999999 130.02808C97.72847999999999 129.69112,97.75656 129.35416,97.86887999999999 128.98912C98.54279999999999 126.7708,101.68776 125.05792,105.4224 124.83328M105.8436 125.47912C105.7032 125.45104,105.50663999999999 125.45104,105.36623999999999 125.45104C103.59719999999999 125.45104,102.53016 126.96736,102.53016 128.84872C102.53016 129.8596,102.83904 130.95472,103.48487999999999 132.04984C104.55192 133.73464,106.09631999999999 134.57704,107.41608 134.57704C108.53927999999999 134.57704,109.52207999999999 133.98736,109.97135999999999 132.75184C110.16792 132.2464,110.25215999999999 131.74096,110.25215999999999 131.20744C110.25215999999999 128.68024,108.31464 125.87224,105.8436 125.47912"></path></g><g class="vf-notehead" pointer-events="bounding-box"><path stroke-width="0.3" fill="black" stroke="none" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M81.09696 120M88.79088 114.83328C89.09976 114.77712,89.40863999999999 114.77712,89.71752 114.77712C94.15415999999999 114.77712,97.86072 116.74272,98.39424 119.38224C98.42232 119.63496,98.47847999999999 119.8596,98.47847999999999 120.02808C98.47847999999999 122.92032,94.6596 125.25096,89.7456 125.25096C84.8316 125.25096,81.09696 122.86416,81.09696 120.02808C81.09696 119.69112,81.12504 119.35416,81.23736 118.98912C81.91127999999999 116.7708,85.05624 115.05792,88.79088 114.83328M89.21208 115.47912C89.07168 115.45104,88.87512 115.45104,88.73472 115.45104C86.96567999999999 115.45104,85.89864 116.96736,85.89864 118.84872C85.89864 119.8596,86.20752 120.95472,86.85336 122.04984C87.9204 123.73464,89.4648 124.57704,90.78456 124.57704C91.90776 124.57704,92.89056 123.98736,93.33984 122.75184C93.5364 122.2464,93.62064 121.74096,93.62064 121.20744C93.62064 118.68024,91.68312 115.87224,89.21208 115.47912"></path></g><g class="vf-notehead" pointer-events="bounding-box"><path stroke-width="0.3" fill="black" stroke="none" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M97.72847999999999 115M105.4224 109.83328C105.73128 109.77712,106.04015999999999 109.77712,106.34903999999999 109.77712C110.78567999999999 109.77712,114.49224 111.74272,115.02575999999999 114.38224C115.05384 114.63496,115.10999999999999 114.8596,115.10999999999999 115.02808C115.10999999999999 117.92032,111.29111999999999 120.25096,106.37711999999999 120.25096C101.46311999999999 120.25096,97.72847999999999 117.86416,97.72847999999999 115.02808C97.72847999999999 114.69112,97.75656 114.35416,97.86887999999999 113.98912C98.54279999999999 111.7708,101.68776 110.05792,105.4224 109.83328M105.8436 110.47912C105.7032 110.45104,105.50663999999999 110.45104,105.36623999999999 110.45104C103.59719999999999 110.45104,102.53016 111.96736,102.53016 113.84872C102.53016 114.8596,102.83904 115.95472,103.48487999999999 117.04984C104.55192 118.73464,106.09631999999999 119.57704,107.41608 119.57704C108.53927999999999 119.57704,109.52207999999999 118.98736,109.97135999999999 117.75184C110.16792 117.2464,110.25215999999999 116.74096,110.25215999999999 116.20744C110.25215999999999 113.68024,108.31464 110.87224,105.8436 110.47912"></path></g><g class="vf-notehead" pointer-events="bounding-box"><path stroke-width="0.3" fill="black" stroke="none" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M81.09696 110M88.79088 104.83328C89.09976 104.77712,89.40863999999999 104.77712,89.71752 104.77712C94.15415999999999 104.77712,97.86072 106.74272,98.39424 109.38224C98.42232 109.63496,98.47847999999999 109.8596,98.47847999999999 110.02808C98.47847999999999 112.92032,94.6596 115.25096,89.7456 115.25096C84.8316 115.25096,81.09696 112.86416,81.09696 110.02808C81.09696 109.69112,81.12504 109.35416,81.23736 108.98912C81.91127999999999 106.7708,85.05624 105.05792,88.79088 104.83328M89.21208 105.47912C89.07168 105.45104,88.87512 105.45104,88.73472 105.45104C86.96567999999999 105.45104,85.89864 106.96736,85.89864 108.84872C85.89864 109.8596,86.20752 110.95472,86.85336 112.04984C87.9204 113.73464,89.4648 114.57704,90.78456 114.57704C91.90776 114.57704,92.89056 113.98736,93.33984 112.75184C93.5364 112.2464,93.62064 111.74096,93.62064 111.20744C93.62064 108.68024,91.68312 105.87224,89.21208 105.47912"></path></g></g><g class="vf-modifiers"><path stroke-width="0.3" fill="black" stroke="none" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M57.4224 130M63.35952 115.36240000000001C63.4416 115.30768,63.46896 115.30768,63.5784 115.30768C63.852000000000004 115.30768,64.04352 115.41712,64.1256 115.66336L64.15296000000001 115.74544L64.18032000000001 119.3296L64.18032000000001 122.94112L64.89168000000001 122.7496C65.30208 122.64016,65.60304000000001 122.6128,65.79456 122.6128C66.0408 122.6128,66.15024 122.69488,66.23232 122.91376C66.25968 122.99584,66.25968 123.62512,66.25968 124.30912000000001C66.25968 124.96576,66.25968 125.64976,66.23232 125.67712C66.12288000000001 125.95072,66.0408 125.97808,65.30208 126.1696C64.37184 126.41584,64.18032000000001 126.4432,64.18032000000001 126.4432C64.18032000000001 126.4432,64.18032000000001 127.15456,64.18032000000001 128.2216C64.18032000000001 128.60464,64.18032000000001 129.01504,64.18032000000001 129.4528L64.18032000000001 132.40768L64.89168000000001 132.21616C65.32944 132.10672,65.60304000000001 132.07936,65.79456 132.07936C65.93136 132.07936,66.0408 132.10672,66.12288000000001 132.21616C66.25968 132.38032,66.25968 132.35296,66.25968 133.36528L66.25968 133.77568L66.25968 134.21344C66.25968 135.22576,66.25968 135.1984,66.12288000000001 135.3352C66.01344 135.44464,66.0408 135.44464,64.78224 135.7456C64.50864 135.82768,64.2624 135.90976,64.23504 135.90976L64.18032000000001 135.90976L64.18032000000001 139.54864L64.15296000000001 143.21488L64.1256 143.32432C64.04352 143.5432,63.82464 143.65264,63.5784 143.65264C63.41424000000001 143.65264,63.168000000000006 143.5432,63.05856 143.32432L63.031200000000005 143.21488L63.031200000000005 139.7128L63.031200000000005 136.21072L63.003840000000004 136.21072L62.37456 136.37488L61.198080000000004 136.67584C60.89712 136.75792,60.623520000000006 136.81264,60.623520000000006 136.81264C60.5688 136.81264,60.5688 137.00416,60.5688 140.5336L60.5688 144.30928L60.54144 144.39136C60.432 144.61024,60.21312 144.71968,60.02160000000001 144.71968C59.80272 144.71968,59.55648 144.61024,59.44704 144.39136L59.41968 144.30928L59.41968 140.69776C59.41968 137.35984,59.41968 137.1136,59.392320000000005 137.1136C59.392320000000005 137.1136,59.392320000000005 137.1136,59.392320000000005 137.1136C59.09136 137.19568,58.051680000000005 137.46928,57.942240000000005 137.46928C57.696000000000005 137.46928,57.53184 137.30512,57.4224 137.1136C57.4224 137.00416,57.4224 137.00416,57.4224 135.71824L57.4224 134.43232L57.449760000000005 134.32288C57.559200000000004 134.04928,57.559200000000004 134.04928,59.09136 133.66624L59.41968 133.58416L59.41968 130.60192C59.41968 127.83856,59.41968 127.64704,59.392320000000005 127.64704C59.392320000000005 127.64704,59.392320000000005 127.64704,59.392320000000005 127.64704C59.09136 127.72912,58.051680000000005 127.97536,57.942240000000005 127.97536C57.696000000000005 127.97536,57.53184 127.83856,57.4224 127.64704C57.4224 127.5376,57.4224 127.5376,57.4224 126.25168L57.4224 124.96576L57.449760000000005 124.85632C57.559200000000004 124.58272,57.559200000000004 124.58272,59.09136 124.19968L59.41968 124.1176L59.41968 120.47872L59.41968 116.83984L59.44704 116.7304C59.55648 116.53888,59.80272 116.37472,60.02160000000001 116.37472C60.103680000000004 116.37472,60.1584 116.42944,60.240480000000005 116.4568C60.349920000000004 116.48416,60.459360000000004 116.62096,60.54144 116.7304L60.5688 116.83984L60.5688 120.34192L60.5688 123.81664L60.732960000000006 123.81664C60.78768 123.78928,61.28016 123.67984,61.77264 123.5704L62.83968 123.24208L63.031200000000005 123.21472L63.031200000000005 119.49376L63.031200000000005 115.74544L63.05856 115.66336C63.140640000000005 115.55392,63.22272 115.41712,63.35952 115.36240000000001M63.031200000000005 129.75376C63.031200000000005 128.0848,63.031200000000005 126.74416,63.031200000000005 126.74416L63.031200000000005 126.74416C63.003840000000004 126.74416,62.73024 126.82624,62.401920000000004 126.90832L61.198080000000004 127.20928C60.89712 127.29136,60.623520000000006 127.34608,60.623520000000006 127.34608C60.5688 127.34608,60.5688 127.51024,60.5688 130.32832L60.5688 133.33792L60.732960000000006 133.2832C60.78768 133.25584,61.28016 133.1464,61.77264 133.03696L62.83968 132.76336L63.031200000000005 132.68128L63.031200000000005 129.75376"></path><path stroke-width="0.3" fill="black" stroke="none" stroke-dasharray="none" font-family="Arial" font-size="10pt" font-weight="normal" font-style="normal" x="365" y="79.5" width="1" height="41" d="M69.25968 115M75.1968 100.36240000000001C75.27888 100.30768,75.30624 100.30768,75.41568000000001 100.30768C75.68928 100.30768,75.88080000000001 100.41712,75.96288 100.66336L75.99024 100.74544L76.0176 104.3296L76.0176 107.94112L76.72896 107.7496C77.13936 107.64016,77.44032 107.6128,77.63184 107.6128C77.87808 107.6128,77.98752 107.69488,78.06960000000001 107.91376C78.09696 107.99584,78.09696 108.62512,78.09696 109.30912000000001C78.09696 109.96576,78.09696 110.64976,78.06960000000001 110.67712C77.96016 110.95072,77.87808 110.97808,77.13936 111.1696C76.20912 111.41584,76.0176 111.4432,76.0176 111.4432C76.0176 111.4432,76.0176 112.15456,76.0176 113.2216C76.0176 113.60464,76.0176 114.01504,76.0176 114.4528L76.0176 117.40768L76.72896 117.21616C77.16672 117.10672,77.44032 117.07936,77.63184 117.07936C77.76864 117.07936,77.87808 117.10672,77.96016 117.21616C78.09696 117.38032,78.09696 117.35296,78.09696 118.36528L78.09696 118.77568L78.09696 119.21344C78.09696 120.22576,78.09696 120.19839999999999,77.96016 120.3352C77.85072 120.44463999999999,77.87808 120.44463999999999,76.61952000000001 120.7456C76.34592 120.82768,76.09968 120.90976,76.07232 120.90976L76.0176 120.90976L76.0176 124.54864L75.99024 128.21488L75.96288 128.32432C75.88080000000001 128.5432,75.66192000000001 128.65264,75.41568000000001 128.65264C75.25152 128.65264,75.00528 128.5432,74.89584 128.32432L74.86848 128.21488L74.86848 124.7128L74.86848 121.21072L74.84112 121.21072L74.21184000000001 121.37488L73.03536 121.67584C72.73440000000001 121.75792,72.4608 121.81264,72.4608 121.81264C72.40608 121.81264,72.40608 122.00416,72.40608 125.5336L72.40608 129.30928L72.37872 129.39136C72.26928000000001 129.61024,72.0504 129.71968,71.85888 129.71968C71.64 129.71968,71.39376 129.61024,71.28432000000001 129.39136L71.25696 129.30928L71.25696 125.69776C71.25696 122.35984,71.25696 122.1136,71.2296 122.1136C71.2296 122.1136,71.2296 122.1136,71.2296 122.1136C70.92864 122.19568,69.88896 122.46928,69.77952 122.46928C69.53328 122.46928,69.36912000000001 122.30512,69.25968 122.1136C69.25968 122.00416,69.25968 122.00416,69.25968 120.71824L69.25968 119.43232L69.28704 119.32288C69.39648 119.04928,69.39648 119.04928,70.92864 118.66624L71.25696 118.58416L71.25696 115.60192C71.25696 112.83856,71.25696 112.64704,71.2296 112.64704C71.2296 112.64704,71.2296 112.64704,71.2296 112.64704C70.92864 112.72912,69.88896 112.97536,69.77952 112.97536C69.53328 112.97536,69.36912000000001 112.83856,69.25968 112.64704C69.25968 112.5376,69.25968 112.5376,69.25968 111.25168L69.25968 109.96576L69.28704 109.85632C69.39648 109.58272,69.39648 109.58272,70.92864 109.19968L71.25696 109.1176L71.25696 105.47872L71.25696 101.83984L71.28432000000001 101.7304C71.39376 101.53888,71.64 101.37472,71.85888 101.37472C71.94096 101.37472,71.99568000000001 101.42944,72.07776 101.4568C72.1872 101.48416,72.29664 101.62096,72.37872 101.7304L72.40608 101.83984L72.40608 105.34192L72.40608 108.81664L72.57024 108.81664C72.62496 108.78928,73.11744 108.67984,73.60992 108.5704L74.67696000000001 108.24208L74.86848 108.21472L74.86848 104.49376L74.86848 100.74544L74.89584 100.66336C74.97792 100.55392,75.06 100.41712,75.1968 100.36240000000001M74.86848 114.75376C74.86848 113.0848,74.86848 111.74416,74.86848 111.74416L74.86848 111.74416C74.84112 111.74416,74.56752 111.82624,74.2392 111.90832L73.03536 112.20928C72.73440000000001 112.29136,72.4608 112.34608,72.4608 112.34608C72.40608 112.34608,72.40608 112.51024,72.40608 115.32832L72.40608 118.33792L72.57024 118.2832C72.62496 118.25584,73.11744 118.1464,73.60992 118.03696L74.67696000000001 117.76336L74.86848 117.68128L74.86848 114.75376"></path></g></g></svg>
    `);
    // canvas.pngStream().pipe(response);
});
module.exports = {
    musicScales,
    scoreImage
};
//# sourceMappingURL=index.js.map