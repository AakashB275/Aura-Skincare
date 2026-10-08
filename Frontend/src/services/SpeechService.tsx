import { apiFetch } from '../context/apiFetch';

type SpeechResult = {
  final: string;
  interim: string;
};

type SpeechCallbacks = {
  onResult: (result: SpeechResult) => void;
  onError: (error: unknown) => void;
  onInterrupt: () => void;
};

type RecognitionAlternative = {
  transcript: string;
};

type RecognitionResult = {
  isFinal: boolean;
  [index: number]: RecognitionAlternative;
};

type RecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type RecognitionErrorEvent = Event & {
  error: string;
  message?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

class SpeechService {
  private recognition: BrowserSpeechRecognition | null = null;
  private callbacks: SpeechCallbacks | null = null;
  private audio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private speechRequest: AbortController | null = null;

  initRecognition(
    onResult: SpeechCallbacks['onResult'],
    onError: SpeechCallbacks['onError'],
    onInterrupt: SpeechCallbacks['onInterrupt']
  ): void {
    this.callbacks = { onResult, onError, onInterrupt };
    this.getRecognition();
  }

  startListening(): void {
    const recognition = this.getRecognition();
    if (!recognition) {
      this.callbacks?.onError(new Error('Speech recognition is not supported by this browser.'));
      return;
    }

    try {
      recognition.start();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'InvalidStateError')) {
        this.callbacks?.onError(error);
      }
    }
  }

  stopListening(): void {
    this.recognition?.stop();
  }

  async speak(text: string): Promise<void> {
    this.stopSpeaking();
    const controller = new AbortController();
    this.speechRequest = controller;

    try {
      const response = await apiFetch('/api/speech/synthesize', {
        method: 'POST',
        body: JSON.stringify({ text }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody: unknown = await response.json().catch(() => null);
        const message =
          typeof errorBody === 'object' &&
          errorBody !== null &&
          'message' in errorBody &&
          typeof errorBody.message === 'string'
            ? errorBody.message
            : `Speech generation failed (${response.status}).`;
        throw new Error(message);
      }

      const audioBlob = await response.blob();
      if (!audioBlob.size) {
        throw new Error('Speech service returned an empty audio response.');
      }

      this.audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(this.audioUrl);
      this.audio = audio;
      await new Promise<void>((resolve, reject) => {
        const finish = (error?: Error) => {
          controller.signal.removeEventListener('abort', onAbort);
          if (error) reject(error);
          else resolve();
        };
        const onAbort = () => finish();

        controller.signal.addEventListener('abort', onAbort, { once: true });
        audio.onended = () => finish();
        audio.onerror = () => finish(new Error('Unable to play the generated speech audio.'));
        audio.play().catch((error: unknown) => {
          finish(error instanceof Error ? error : new Error(String(error)));
        });
      });
    } finally {
      if (this.speechRequest === controller) {
        this.speechRequest = null;
      }
      this.releaseAudio();
    }
  }

  stopSpeaking(): void {
    this.speechRequest?.abort();
    this.speechRequest = null;
    this.audio?.pause();
    this.releaseAudio();
  }

  private getRecognition(): BrowserSpeechRecognition | null {
    if (this.recognition) {
      return this.recognition;
    }

    const browserWindow = window as SpeechRecognitionWindow;
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      return null;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      let final = '';
      let interim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;

        if (result.isFinal) {
          final += result[0]?.transcript || '';
        } else {
          interim += result[0]?.transcript || '';
        }
      }

      this.callbacks?.onResult({ final, interim });
    };
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.callbacks?.onError(new Error(event.message || event.error));
      }
    };
    recognition.onend = () => this.callbacks?.onInterrupt();

    this.recognition = recognition;
    return recognition;
  }

  private releaseAudio(): void {
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }

    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
  }
}

export default new SpeechService();
