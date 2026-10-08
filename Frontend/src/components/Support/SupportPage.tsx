import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { Mic, MicOff, Video, VideoOff, Square, MessageSquare, Brain } from 'lucide-react';
import SpeechService from '../../services/SpeechService';
import { useAuth } from '../../context/useAuth';
import { apiFetch } from '../../context/apiFetch';
import femaleInterviewerImage from '../../assets/young interviewer.png';

type ConversationItem = {
  role: 'agent' | 'customer';
  content: string;
  timestamp: Date | string;
};

type CallOutcome = {
  customer_intent: string;
  order_id: string | null;
  resolution_status: string;
  call_summary: string;
};

const SupportPage = () => {
  const { user } = useAuth();
  const username = user?.name || user?.userName || 'User';
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationItem[]>([]);
  const [callOutcome, setCallOutcome] = useState<CallOutcome | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [callError, setCallError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const accumulatedTranscriptRef = useRef('');
  const isSubmittingRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const startCamera = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is unavailable in this browser. Check browser support and use HTTPS or localhost.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setIsCameraReady(false);
      setVideoEnabled(true);
      setCameraError('');
      return true;
    } catch (error) {
      console.error('Unable to access the camera:', error);
      const cameraError = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings, then use the video button to try again.'
        : error instanceof DOMException && error.name === 'NotFoundError'
          ? 'No camera was found. Connect a camera or continue the call without video.'
          : 'The camera could not be started. Check that it is connected and not being used by another app.';
      setCameraError(cameraError);
      return false;
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  const handleStartCall = async () => {
    setIsProcessing(true);
    setCallError('');
    setCameraError('');
    setCallOutcome(null);
    setConversationHistory([]);
    setCurrentQuestion('');

    try {
      await startCamera();
      const response = await apiFetch('/api/call/start', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.sessionId) {
        throw new Error(data.message || data.error || 'Failed to start the support call.');
      }

      sessionIdRef.current = data.sessionId;
      setSessionId(data.sessionId);

      accumulatedTranscriptRef.current = '';
      isSubmittingRef.current = false;

      setCurrentQuestion(data.question);
      setConversationHistory([{ role: 'agent', content: data.question, timestamp: new Date() }]);
      setIsCallActive(true);

      setIsAISpeaking(true);
      try {
        await SpeechService.speak(data.question);
      } catch (error) {
        console.error('Unable to play the greeting:', error);
        setCallError('Audio playback is unavailable. You can continue by typing your message.');
      }
      setIsAISpeaking(false);

      if (audioEnabled) {
        setIsListening(true);
        SpeechService.startListening();
      }
    } catch (error) {
      console.error('Error starting call:', error);
      stopCamera();
      setCallError(error instanceof Error ? error.message : 'Failed to start the call. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitTypedMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = messageDraft.trim();
    if (!message || !isCallActive) return;
    setMessageDraft('');
    void handleAnswerComplete(message);
  };

  const handleStopCall = async () => {
    SpeechService.stopListening();
    SpeechService.stopSpeaking();
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsCallActive(false);
    setIsListening(false);
    setIsProcessing(true);

    const currentSessionId = sessionIdRef.current;

    if (currentSessionId) {
      try {
        const response = await apiFetch('/api/call/end', {
          method: 'POST',
          body: JSON.stringify({ sessionId: currentSessionId })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to retrieve the call summary.');
        }
        setConversationHistory(data.conversationHistory || []);
        setCallOutcome(data.outcome || null);
      } catch (error) {
        console.error('Error ending call:', error);
        setCallError(error instanceof Error ? error.message : 'The call ended, but its summary could not be loaded.');
      }
    }

    sessionIdRef.current = null;
    setSessionId(null);
    setIsProcessing(false);

    stopCamera();
  };

  const handleAnswerComplete = useCallback(async (answer: string) => {
    if (isSubmittingRef.current) {
      return;
    }

    const currentSessionId = sessionIdRef.current;

    if (!currentSessionId) {
      setCallError('This call session is no longer available. Please start a new call.');
      return;
    }

    if (!answer || !answer.trim()) {
      return;
    }

    isSubmittingRef.current = true;

    SpeechService.stopListening();
    setIsListening(false);
    setIsProcessing(true);

    accumulatedTranscriptRef.current = '';

    setConversationHistory(prev => [...prev, {
      role: 'customer',
      content: answer,
      timestamp: new Date()
    }]);

    setUserTranscript('');
    setInterimTranscript('');

    try {
      const response = await apiFetch('/api/call/answer', {
        method: 'POST',
        body: JSON.stringify({ sessionId: currentSessionId, answer })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || `Server error: ${response.status}`);
      }

      if (data.success) {
        const question = data.question;
        if (!question) {
          throw new Error('The support assistant returned an empty response.');
        }

        setCurrentQuestion(question);
        setConversationHistory(prev => [...prev, {
          role: 'agent',
          content: question,
          timestamp: new Date()
        }]);
        setCallOutcome(data.outcome || null);
        setCallError('');

        setIsAISpeaking(true);
        try {
          await SpeechService.speak(question);
        } catch (error) {
          console.error('Unable to play the response:', error);
          setCallError('Audio playback is unavailable. You can continue by typing your message.');
        }
        setIsAISpeaking(false);

        if (audioEnabled) {
          setIsListening(true);
          SpeechService.startListening();
        }
      } else {
        throw new Error(data.message || 'The support assistant could not process that message.');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setIsAISpeaking(false);
      setCallError(error instanceof Error ? error.message : 'I couldn’t process that message. Please try again.');
    } finally {
      setIsProcessing(false);
      isSubmittingRef.current = false;
    }
  }, [audioEnabled]);

  const handleSpeechResult = useCallback(({ final, interim }: { final: string; interim: string }) => {
    setInterimTranscript(interim);

    if (final.trim()) {
      setUserTranscript(prev => prev + final);
      accumulatedTranscriptRef.current += final;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = window.setTimeout(() => {
        const fullAnswer = accumulatedTranscriptRef.current.trim();
        if (fullAnswer) {
          handleAnswerComplete(fullAnswer);
        }
      }, 8000);
    }
  }, [handleAnswerComplete]);

  const handleSpeechError = useCallback((error: unknown) => {
    console.error('Speech error:', error);
    setCallError('I couldn’t hear that clearly. Please try speaking again or type your message below.');
  }, []);

  const handleInterrupt = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsAISpeaking(false);
  }, []);

  useEffect(() => {
    if (isCallActive && sessionId) {
      SpeechService.initRecognition(handleSpeechResult, handleSpeechError, handleInterrupt);
    }
  }, [isCallActive, sessionId, handleSpeechResult, handleSpeechError, handleInterrupt]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!isCallActive || !videoEnabled || !video || !stream) return;

    video.srcObject = stream;
    void video.play().catch((error: unknown) => {
      console.error('Unable to play the camera preview:', error);
      setCameraError('Camera is connected but its preview could not be displayed. Try turning video off and on again.');
    });
  }, [isCallActive, videoEnabled]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    SpeechService.stopListening();
    SpeechService.stopSpeaking();
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  }, []);

  const toggleVideo = async () => {
    const newState = !videoEnabled;
    if (newState && !streamRef.current) {
      await startCamera();
      return;
    }

    setVideoEnabled(newState);
    setIsCameraReady(false);
    streamRef.current?.getVideoTracks().forEach((track: MediaStreamTrack) => {
      track.enabled = newState;
    });
  };

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);

    streamRef.current?.getAudioTracks().forEach((track: MediaStreamTrack) => {
      track.enabled = newState;
    });

    if (!newState) {
      SpeechService.stopListening();
      setIsListening(false);
    } else {
      if (isCallActive && !isProcessing && !isAISpeaking) {
        SpeechService.startListening();
        setIsListening(true);
      }
    }
  };

return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* Status Bar */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              {isAISpeaking && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Brain className="animate-pulse" size={20} />
                  <span className="font-medium">AI is speaking...</span>
                </div>
              )}
              {isListening && (
                <div className="flex items-center gap-2 text-green-600">
                  <Mic className="animate-pulse" size={20} />
                  <span className="font-medium">Listening...</span>
                </div>
              )}
              {isProcessing && (
                <div className="flex items-center gap-2 text-purple-600">
                  <Brain className="animate-spin" size={20} />
                  <span className="font-medium">Processing...</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Turns: {conversationHistory.filter(h => h.role === 'customer').length}
            </div>
          </div>

          {/* Video Feed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="relative bg-white rounded-xl overflow-hidden aspect-video border border-gray-200 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                <img
                  src={femaleInterviewerImage}
                  alt="Aura support assistant"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-2">
                <p className="font-medium">Aura</p>
              </div>
            </div>

            <div className="relative bg-white rounded-xl overflow-hidden aspect-video border border-gray-200 shadow-sm">
              {videoEnabled ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                  autoPlay
                  playsInline
                  muted
                  onLoadedData={() => setIsCameraReady(true)}
                  onError={() => setCameraError('The camera preview could not be displayed.')}
                />
              ) : (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <VideoOff className="w-16 h-16 text-gray-400" />
                </div>
              )}
              {videoEnabled && !isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 px-6 text-center text-sm text-gray-600">
                  {cameraError || (isCallActive ? 'Starting camera preview...' : 'Camera preview will appear when the call starts.')}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-2">
                <p className="font-medium">{username}</p>
              </div>
            </div>
          </div>

          {/* Current Question & Transcript */}
          <div className="space-y-4 mb-6">
            {currentQuestion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium mb-1">Aura:</p>
                <p className="text-gray-800">{currentQuestion}</p>
              </div>
            )}

            {(userTranscript || interimTranscript) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium mb-1">Your message:</p>
                <p className="text-gray-800">
                  {userTranscript}
                  <span className="text-gray-400">{interimTranscript}</span>
                </p>
              </div>
            )}
          </div>

          {callError && (
            <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {callError}
            </p>
          )}
          {cameraError && (
            <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {cameraError}
            </p>
          )}

          {isCallActive && (
            <form onSubmit={submitTypedMessage} className="mb-6 flex gap-2">
              <input
                value={messageDraft}
                onChange={event => setMessageDraft(event.target.value)}
                disabled={isProcessing}
                aria-label="Type a message to Aura"
                placeholder="Type your Aura Skincare question..."
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={isProcessing || !messageDraft.trim()}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          )}

          {callOutcome && (
            <section aria-labelledby="call-summary-title" className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-5">
              <h2 id="call-summary-title" className="mb-3 text-lg font-semibold text-purple-900">Call summary</h2>
              <p className="mb-4 text-sm text-purple-900">{callOutcome.call_summary}</p>
              <dl className="mb-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
                <div><dt className="font-semibold">Intent</dt><dd>{callOutcome.customer_intent}</dd></div>
                <div><dt className="font-semibold">Order ID</dt><dd>{callOutcome.order_id || 'Not provided'}</dd></div>
                <div><dt className="font-semibold">Resolution</dt><dd>{callOutcome.resolution_status}</dd></div>
              </dl>
              <details>
                <summary className="cursor-pointer font-medium text-purple-900">View structured call outcome (JSON)</summary>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-4 text-xs text-gray-800">
                  {JSON.stringify(callOutcome, null, 2)}
                </pre>
              </details>
            </section>
          )}

          {/* Conversation History */}
          {conversationHistory.length > 0 && (
            <div className="mb-6 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Conversation History
              </h3>
              <div className="space-y-3">
                {conversationHistory.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      item.role === 'agent'
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'bg-green-50 border-l-4 border-green-500'
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-1">
                      {item.role === 'agent' ? 'Aura' : 'You'}
                      <time className="ml-2">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </time>
                    </p>
                    <p className="text-sm text-gray-800">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* Controls */}
          <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-200">
            {!isCallActive ? (
              <button
                onClick={handleStartCall}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic className="w-5 h-5" />
                <span>{isProcessing ? 'Starting...' : 'Start Aura Support Call'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-lg transition ${
                    videoEnabled
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-lg transition ${
                    audioEnabled
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleStopCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition shadow-md"
                >
                  <Square className="w-5 h-5" />
                  <span>End Call</span>
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupportPage;