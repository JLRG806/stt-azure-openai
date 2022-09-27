const fs = require("fs");
require('dotenv').config();
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.API_KEY_AZURE, "eastus");
speechConfig.speechRecognitionLanguage = "es-ES";
speechConfig.enableDictation();
const { Configuration, OpenAIApi } = require("openai");

// Azure Speech Recognition Config
const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync("Voz.wav"));
const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

// Open AI Config
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

var recognized = "";
var formatted = "";
var obj = {};

// Create a function that converts csv to json, the csv have 2 columns, questions and answer
function csvJSON(csv) {
    var lines = csv.split(" , ");
    var result = [];
    var headers = lines[0].split(" , ");
    for (var i = 1; i < lines.length; i++) {
        var obj = {};
        var currentline = lines[i].split(" , ");
        for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j];
        }
        result.push(obj);
    }
    return result; //JSON
}

recognizer.recognizing = (s, e) => {
    //console.log(`RECOGNIZING: Text=${e.result.text}`);
};

recognizer.recognized = (s, e) => {
    if (e.result.reason == sdk.ResultReason.RecognizedSpeech) {
        console.log(`RECOGNIZED: Text=${e.result.text}`);
        recognized += e.result.text + "   ";
    }
    else if (e.result.reason == sdk.ResultReason.NoMatch) {
        console.log("NOMATCH: Speech could not be recognized.");
    }
};

recognizer.canceled = (s, e) => {
    console.log(`CANCELED: Reason=${e.reason}`);

    if (e.reason === 1) {
        //Call function to send prompt to OpenAI
        sendPrompt(recognized).then((response) => {
            console.log(response);
            formatted = response;
            console.log(formatted);
            return formatted;
        }).then((response) => {
            //Call function to convert csv to json
            obj = csvJSON(response);
            console.log(obj);
        });
        console.log("TEST FORMATTED" + formatted);

    }

    if (e.reason == sdk.CancellationReason.Error) {
        console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
        console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
        console.log("CANCELED: Did you set the speech resource key and region values?");
    }

    recognizer.stopContinuousRecognitionAsync();
};

recognizer.sessionStopped = (s, e) => {
    console.log("\n    Session stopped event.");
    recognizer.stopContinuousRecognitionAsync();
    console.log(recognized);
};


recognizer.startContinuousRecognitionAsync();

async function sendPrompt(text) {

    const prompt = "Corrige ortograficamente el texto y crea en formato CSV separado por coma las columnas questions y answer, elimina el texto que no se considere pregunta y respuesta y añade cada pregunta en la columna question y su respuesta a las columna answer del siguiente texto: \n\n" + text;
    try {
        const completion = await openai.createCompletion({
            model: "text-davinci-002",
            prompt: prompt,
            temperature: 0,
            max_tokens: 200,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });
        return completion.data.choices[0].text;
    } catch (error) {
        if (error.response) {
            console.log(error.response.status);
            console.log(error.response.data);
        } else {
            console.log(error.message);
        }
    }

}