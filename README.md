# Music Scales for Google Assistant

Music Scales is a Google Assistant action that knows a lot about music theory.
Its features include:

* Recognizing a scale from name (*Ask Music Scales what's G phrygian scale*)
* Detecting a scale with provided notes (*Ask Music Scales what's the scale containing C D F G sharp A sharp*)
* Naming a chord (*Ask Music Scales what's the chord F A sharp C E flat*)
* Naming an interval (*Ask Music Scales for an interval between A sharp and E flat*)
* Note frequencies and MIDI numbers (*Ask Music Scales what's the frequency of A in fourth octave*)

## Development

This Action uses Firebase Cloud Functions as a back-end service. The URL for your `musicScales` function then becomes a WebHook for the DialogFlow fullfilment.

For the full tutorial on how to get started, take a look at ["Facts About You" project from Actions on Google team](https://github.com/actions-on-google/dialogflow-facts-about-google-nodejs).

## Future

I'm planning to implement generating an image with music notation.
The image would be then displayed on devices with surface capability.

Right now I'm stuck with running VexFlow in the Node.js context.

Enjoy!
