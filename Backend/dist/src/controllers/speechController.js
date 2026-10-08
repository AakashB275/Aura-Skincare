const MAX_TEXT_LENGTH = 3000;
const MURF_STREAM_URL = 'https://global.api.murf.ai/v1/speech/stream';
class SpeechRequestError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
export const synthesizeSpeech = async (req, res, next) => {
    try {
        const { text } = req.body;
        if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
            throw new SpeechRequestError(`text must contain 1-${MAX_TEXT_LENGTH} characters.`, 400);
        }
        const apiKey = process.env.MURF_API_KEY;
        if (!apiKey) {
            throw new SpeechRequestError('MURF_API_KEY is not configured on the backend.', 503);
        }
        const murfResponse = await fetch(MURF_STREAM_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                voiceId: process.env.MURF_VOICE_ID || 'Anusha',
                style: process.env.MURF_STYLE || 'Conversational',
                text: text.trim(),
                locale: process.env.MURF_LOCALE || 'en-IN',
                model: process.env.MURF_MODEL || 'FALCON',
                format: 'MP3',
                sampleRate: 24000,
                channelType: 'MONO'
            }),
            signal: AbortSignal.timeout(30000)
        });
        if (!murfResponse.ok) {
            console.error(`Murf speech request failed (${murfResponse.status}).`);
            throw new SpeechRequestError(`Murf speech generation failed (${murfResponse.status}).`, 502);
        }
        const audio = Buffer.from(await murfResponse.arrayBuffer());
        if (!audio.length) {
            throw new SpeechRequestError('Murf returned an empty audio response.', 502);
        }
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(audio.length),
            'Cache-Control': 'no-store'
        });
        res.send(audio);
    }
    catch (error) {
        next(error);
    }
};
