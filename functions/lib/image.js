"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { document } = (new JSDOM(`<!DOCTYPE html><div id="svg"></div>`)).window;
const vex_1 = require("vexflow/src/vex");
const tonal_1 = require("tonal");
const VF = vex_1.Vex.Flow;
// Generate a canvas
// const Canvas = require('canvas-prebuilt');
// const cWidth = 500;
// const cHeight = 200;
// const canvas = new Canvas(cWidth, cHeight);
// const ctx = canvas.getContext('2d');
class ImageProvider {
    constructor(input, isChord) {
        this.arpeggio = () => {
            return this.notes.map(note => {
                const token = tonal_1.Note.tokenize(note);
                const staveNote = new VF.StaveNote({
                    clef: "treble",
                    keys: [token[0].toLowerCase() + '/' + token[2]],
                    duration: this.duration
                });
                if (token[1]) {
                    staveNote.addAccidental(0, new VF.Accidental(token[1]));
                }
                return staveNote;
            });
        };
        this.chord = () => {
            const accidentals = this.notes.map(note => tonal_1.Note.tokenize(note)[1]);
            const chordNotes = this.notes.map(note => {
                const token = tonal_1.Note.tokenize(note);
                return token[0].toLowerCase() + '/' + token[2];
            });
            const staveNote = new VF.StaveNote({
                clef: "treble",
                keys: chordNotes,
                duration: this.duration
            });
            accidentals.forEach((accidental, index) => {
                if (accidental) {
                    staveNote.addAccidental(index, new VF.Accidental(accidental));
                }
            });
            return [staveNote];
        };
        this.draw = () => {
            const div = document.getElementById('svg');
            const renderer = new vex_1.Vex.Flow.Renderer(div, vex_1.Vex.Flow.Renderer.Backends.SVG);
            renderer.resize(800, 396);
            const staveWidth = 350;
            const context = renderer.getContext();
            const stave = new VF.Stave(15, 40, staveWidth);
            context.scale(2, 2);
            stave.addClef("treble");
            stave.setContext(context).draw();
            const notes = this.isChord ? this.chord() : this.arpeggio();
            // Fit everything in one bar
            new vex_1.Vex.Flow.Tuplet(notes, {
                num_notes: this.isChord ? 1 : notes.length,
                notes_occupied: this.duration
            });
            // Create a voice in 4/4 and add above notes
            const voices = [
                new VF.Voice({
                    num_beats: 4,
                    beat_value: 4
                }).addTickables(notes)
            ];
            // Format and justify the notes to 400 pixels.
            new VF.Formatter()
                .joinVoices(voices)
                .format(voices, staveWidth - 50);
            // Render voices
            voices.forEach(function (v) {
                v.draw(context, stave);
            });
        };
        this.isChord = isChord;
        this.notes = this.inputNotes(input);
        this.calculateDuration();
    }
    inputNotes(input) {
        const intervals = input.map(tonal_1.Distance.interval(input[0]));
        const scaleNotes = intervals.map(tonal_1.transpose(`${input[0]}4`));
        if (!this.isChord) {
            // Add ending note 12 tones higher
            const octave = tonal_1.transpose(scaleNotes[0], '8P');
            if (scaleNotes[0] !== scaleNotes[scaleNotes.length - 1]) {
                scaleNotes.push(octave);
            }
            else {
                scaleNotes[scaleNotes.length - 1] = octave;
            }
        }
        return scaleNotes;
    }
    calculateDuration() {
        const beat = [1, 2, 4, 8, 16, 32, 64];
        const goal = this.isChord ? 1 : this.notes.length;
        const duration = beat.reduce(function (prev, curr) {
            return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
        });
        this.duration = duration;
    }
}
//# sourceMappingURL=image.js.map