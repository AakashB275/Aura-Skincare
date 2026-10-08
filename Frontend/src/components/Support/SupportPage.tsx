import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Square, MessageSquare, Brain } from 'lucide-react';
import SpeechService from '../../services/SpeechService';
import { useAuth } from '../../context/useAuth';
import { apiFetch } from '../../context/apiFetch';
import femaleInterviewerImage from '../../assets/young interviewer.png';

type ConversationItem = {
  role: 'caller' | 'candidate';
  content: string;
  timestamp: Date;
};

const SupportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const username = user?.name || user?.userName || 'User';
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationItem[]>([]);
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

  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const handleStartCall = async () => {
    setIsProcessing(true);

    try {
      const response = await apiFetch('/api/call/start', {
        method: 'POST',
        body: JSON.stringify('Call started')
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to start call');
        setIsProcessing(false);
        return;
      }

      if (!data.sessionId) {
        alert('Failed to start call: Missing session ID in response');
        setIsProcessing(false);
        return;
      }

      sessionIdRef.current = data.sessionId;
      setSessionId(data.sessionId);

      //reset accumulated transcript for new session
      accumulatedTranscriptRef.current = '';
      isSubmittingRef.current = false;

      setCurrentQuestion(data.question);
      setConversationHistory([{ role: 'caller', content: data.question, timestamp: new Date() }]);
      setIsCallActive(true);

      setIsAISpeaking(true);
      await SpeechService.speak(data.question);
      setIsAISpeaking(false);

      if (audioEnabled) {
        setIsListening(true);
        SpeechService.startListening();
      }
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start call. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  const handleStopCall = async () => {
    SpeechService.stopListening();
    SpeechService.stopSpeaking();
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

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.evaluation) {
            const analyticsPayload = {
              sessionId: data.sessionId,
              jobRole: data.jobRole,
              difficulty: data.difficulty,
              durationSeconds: data.durationSeconds,
              conversationHistory: data.conversationHistory || [],
              evaluation: data.evaluation
            };

            setIsProcessing(false);
            navigate('/user/userid', { state: { recentAnalytics: analyticsPayload } });
            return;
          }
        }
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }

    setIsProcessing(false);

    streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
  };

  const handleAnswerComplete = useCallback(async (answer: string) => {
    //prevent double-submission
    if (isSubmittingRef.current) {
      return;
    }

    const currentSessionId = sessionIdRef.current;

    if (!currentSessionId) {
      alert('Error: No session ID available. Please start the call again.');
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
      role: 'candidate',
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

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch { errorData = { error: `Server error: ${response.status}` }; }
        alert(`Error: ${errorData?.error || `Server error: ${response.status}`}`);
        throw new Error(errorData?.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        if (data.callComplete) {
          await handleStopCall();
          return;
        }

        const question = data.question;
        if (!question) {
          alert('Error: No question received from server');
          return;
        }

        setCurrentQuestion(question);
        setConversationHistory(prev => [...prev, {
          role: 'caller',
          content: question,
          timestamp: new Date()
        }]);

        setIsAISpeaking(true);
        await delay(2000);
        await SpeechService.speak(question);
        setIsAISpeaking(false);

        if (audioEnabled) {
          setIsListening(true);
          SpeechService.startListening();
        }
      } else {
        alert(`Error: ${data.error || 'Failed to get next question'}`);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsProcessing(false);
      //release the submission lock so next answer can go through
      isSubmittingRef.current = false;
    }
  }, [audioEnabled]);

  const handleSpeechResult = useCallback(({ final, interim }: { final: string; interim: string }) => {
    setInterimTranscript(interim);

    if (final.trim()) {
      //accumulate into both display state and the ref
      setUserTranscript(prev => prev + final);
      accumulatedTranscriptRef.current += final;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      //submit the full accumulated answer, not just the last burst
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

  

  const toggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
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
              Questions: {conversationHistory.filter(h => h.role === 'caller').length}
            </div>
          </div>

          {/* Video Feed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="relative bg-white rounded-xl overflow-hidden aspect-video border border-gray-200 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                <img
                  src={femaleInterviewerImage}
                  alt="Aria"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-2">
                <p className="font-medium">Aria</p>
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
                />
              ) : (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <VideoOff className="w-16 h-16 text-gray-400" />
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
                <p className="text-sm text-blue-600 font-medium mb-1">Current Question:</p>
                <p className="text-gray-800">{currentQuestion}</p>
              </div>
            )}

            {(userTranscript || interimTranscript) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium mb-1">Your Answer:</p>
                <p className="text-gray-800">
                  {userTranscript}
                  <span className="text-gray-400">{interimTranscript}</span>
                </p>
              </div>
            )}
          </div>

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
                      item.role === 'caller'
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'bg-green-50 border-l-4 border-green-500'
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-1">
                      {item.role === 'caller' ? 'caller' : 'You'}
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
                <span>{isProcessing ? 'Starting...' : 'Start Interview'}</span>
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