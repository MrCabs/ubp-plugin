const { prepareFlexFunction, extractStandardResponse, twilioExecute } = require(Runtime.getFunctions()[
  'common/helpers/function-helper'
].path);
const Configuration = require(Runtime.getFunctions()['common/twilio-wrappers/configuration'].path);
const axios = require('axios');

const AWS_API_GATEWAY_DOMAIN = process.env.AWS_API_GATEWAY_DOMAIN;
const AWS_API_KEY = process.env.AWS_API_KEY;
const AWS_HANDLE_TIMEOUT = process.env.AWS_HANDLE_TIMEOUT;
const MAIN_HOTLINE_WEBHOOK_URL = process.env.MAIN_HOTLINE_WEBHOOK_URL;

exports.handler = async (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();

  try {
    const uiAttributes = await Configuration.fetchUiAttributes({ context });
    const features = uiAttributes?.data?.custom_data?.features;
    const ivrAdvisory = features?.ivr_advisory;

    if (!ivrAdvisory?.enabled) {
      throw new Error('IVR Advisory is not enabled');
    }

    const configuration = ivrAdvisory.configuration;

    const audioUrls = await preloadAudioFiles(configuration.selectedAudios);

    if (configuration.useAudioRecording && configuration.selectedAudios?.length > 0) {
      await processAudioFiles(twiml, audioUrls);
    } else if (configuration.message) {
      processTextToSpeech(twiml, configuration.message);
    } else {
      throw new Error('No audio files or message configured');
    }

    twiml.redirect(`https://${MAIN_HOTLINE_WEBHOOK_URL}?FlowEvent=return`);

    return callback(null, twiml);
  } catch (error) {
    console.log('error', error);
    twiml.redirect(`https://${MAIN_HOTLINE_WEBHOOK_URL}?FlowEvent=return`);
    return callback(null, twiml);
  }
};

async function preloadAudioFiles(selectedAudios) {
  console.log('Starting preload of audio files...');
  const baseUrl = `https://${AWS_API_GATEWAY_DOMAIN}`;

  // Helper function to fetch a single audio file.
  const fetchAudio = async (audio, index) => {
    const url = `${baseUrl}/audio/${audio.fileKey}`;
    try {
      const { data } = await axios.get(url, {
        headers: {
          'x-api-key': AWS_API_KEY,
          'Cache-Control': 'public, max-age=86400',
          'X-Preload': 'true',
        },
        timeout: 10000,
      });
      console.log(`Successfully preloaded file ${index + 1}: ${audio.label}`);
      return data.signedUrl;
    } catch (error) {
      console.error(`Error preloading ${audio.label}:`, error.message);
      return null;
    }
  };

  // Launch all requests concurrently.
  const signedUrls = await Promise.all(selectedAudios.map((audio, index) => fetchAudio(audio, index)));

  // Filter out any null responses.
  const validUrls = signedUrls.filter((url) => url !== null);
  console.log(`Successfully preloaded ${validUrls.length} of ${selectedAudios.length} files`);
  return validUrls;
}

async function processAudioFiles(twiml, audioUrls) {
  audioUrls.forEach((url) => {
    if (url) {
      console.log('Playing:', url);
      twiml.play(url);
    }
  });
}

function processTextToSpeech(twiml, message) {
  twiml.say(
    {
      voice: 'Polly.Joanna',
      language: 'en-US',
    },
    message,
  );
}
