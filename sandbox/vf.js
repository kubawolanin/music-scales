const Canvas = require('canvas-prebuilt');
const Vex = require('vexflow');
const cWidth = 500;
const cHeight = 200;
const canvas = new Canvas(cWidth, cHeight);
// const ctx = canvas.getContext('2d');

// Then follow the tutorial.
var renderer = new Vex.Flow.Renderer(canvas, 
  Vex.Flow.Renderer.Backends.CANVAS);
var ctx = renderer.getContext();
var stave = new Vex.Flow.Stave(10, 0, 500);
var stave = new Vex.Flow.Stave(10, 0, 500);
stave.addClef("treble").setContext(ctx).draw();

console.log(
  "The following data URL should be a single stave with a treble clef. " +
  "Paste into your browser address bar to verify.");

// And output to a data URL. Paste this into your browser location bar to see!
console.log(canvas.toDataURL());