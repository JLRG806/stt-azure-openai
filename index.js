const fs = require("fs");
require('dotenv').config();
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.API_KEY_AZURE, "eastus");
speechConfig.speechRecognitionLanguage = "es-ES";

// Open AI Speech Recognition
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


async function fromFile() {
    let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync("videoplayback.wav"));
    let speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    let res = { text: "", error: false, errorMessage: "" };

    console.log(audioConfig);
    speechRecognizer.recognizeOnceAsync(result => {
        switch (result.reason) {
            case sdk.ResultReason.RecognizedSpeech:
                res.text = result.text;

                console.log("RecognizedSpeech");
                console.log(`RECOGNIZED: Text=${result.text}`);
                break;
            case sdk.ResultReason.NoMatch:
                res.error = true;
                res.errorMessage = "NOMATCH: Speech could not be recognized.";

                console.log("NOMATCH: Speech could not be recognized.");
                break;
            case sdk.ResultReason.Canceled:
                const cancellation = sdk.CancellationDetails.fromResult(result);
                console.log(`CANCELED: Reason=${cancellation.reason}`);

                if (cancellation.reason == sdk.CancellationReason.Error) {
                    res.error = true;
                    res.errorMessage = `CANCELED: ErrorCode=${cancellation.errorCode}`;
                    console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
                    console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
                    console.log("CANCELED: Did you set the speech resource key and region values?");
                }
                break;
        }

        if (res.error !== true) {
            const response = sendPrompt(res.text);
            console.log(response);
            return response;

        }
        speechRecognizer.close();
    });

}


async function sendPrompt(text) {
    const prompt = "Construye en formato JSON con pregunta como question y respuesta como answer, del siguiente texto: \n\n" + text;
    const response = await openai.createCompletion({
        model: "text-davinci-002",
        prompt: prompt,
        temperature: 0,
        max_tokens: 256,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
    });
    return response.data.choices[0].text;

}

async function main() {
    const stt = await fromFile();
    console.log(stt);
    let text = "¿Apellidos y nombres?" +
        "Jose Jesus Rodriguez Ramos" +
        "¿Su edad ?" +
        "        20 años" +
        "¿Estado Civil ?" +
        "        Soltero" +
        "¿Desde cuándo se siente usted mal ?" +
        "        Desde hace dos dias(19 de septiembre)" +
        "¿Antes de esta fecha, se encontraba perfectamente bien ?" +
        "        Si" +
        "¿Ha tenido síntomas similares anteriormente ?" +
        "        No" +
        "¿Qué tal descansa por la noche ?" +
        "        Regular" +
        "¿Cómo se encuentra de estado de ánimo ?" +
        "        Ni animado ni triste" +
        "¿Padece dolor de cabeza habitual ?" +
        "        Si, una vez por mes" +
        "¿Tiene dificultad para oír ?" +
        "        No";

    //const response = await sendPrompt(stt);
    //console.log(response);
}

main();