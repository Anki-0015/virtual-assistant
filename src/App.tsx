import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Settings, Command, Brain, Wand2, Search, Clock, Calendar, Globe, Moon, Sun, Music, Calculator, AlertCircle, VolumeX } from 'lucide-react';

interface CommandHistory {
  type: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

function App() {
  const [isListening, setIsListening] = useState(false);
  const [content, setContent] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [recognition, setRecognition] = useState<any>(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isMuted, setIsMuted] = useState(false);

  // Check for microphone permission
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setMicPermission('granted');
      })
      .catch((err) => {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicPermission('denied');
        }
      });
  }, []);

  // Initialize speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Select a default English voice
      const englishVoice = availableVoices.find(voice => 
        voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Premium'))
      ) || availableVoices.find(voice => voice.lang.includes('en-US')) || availableVoices[0];
      
      setSelectedVoice(englishVoice);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (micPermission !== 'granted') return;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('Speech recognition not supported');
        return;
      }

      const newRecognition = new SpeechRecognition();
      newRecognition.continuous = false; // Changed to false to prevent multiple recognitions
      newRecognition.interimResults = true;
      newRecognition.lang = 'en-US';

      let timeoutId: NodeJS.Timeout;

      newRecognition.onstart = () => {
        setIsListening(true);
        setContent('Listening...');
        if (!isMuted) playBeep(700, 'sine', 0.1);
      };

      newRecognition.onend = () => {
        setIsListening(false);
        setContent('Click microphone to start...');
        if (!isMuted) playBeep(500, 'sine', 0.1);
      };

      newRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicPermission('denied');
        }
        setIsListening(false);
        setContent('Error occurred. Please try again.');
        if (!isMuted) playBeep(300, 'square', 0.1);
      };

      newRecognition.onresult = (event: any) => {
        clearTimeout(timeoutId);

        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');

        setContent(transcript);

        // Only process final results
        if (event.results[event.results.length - 1].isFinal) {
          setHistory(prev => [...prev, {
            type: 'user',
            message: transcript,
            timestamp: new Date().toLocaleTimeString()
          }]);
          handleCommand(transcript.toLowerCase());
          newRecognition.stop(); // Stop after processing one command
        }
      };

      setRecognition(newRecognition);
      if (!isMuted) speak("Initializing Advanced Virtual Assistant");
      wishMe();
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setContent('Speech recognition not supported in this browser');
    }
  }, [micPermission, isMuted]);

  const playBeep = (frequency: number, type: OscillatorType, duration: number) => {
    if (isMuted) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
  };

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setMicPermission('denied');
    }
  };

  const speak = async (text: string) => {
    if (isMuted) return;

    try {
      setIsProcessing(true);
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'en-US';

      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 100));
      window.speechSynthesis.speak(utterance);

      setHistory(prev => [...prev, {
        type: 'assistant',
        message: text,
        timestamp: new Date().toLocaleTimeString()
      }]);

      return new Promise(resolve => {
        utterance.onend = () => {
          setIsProcessing(false);
          resolve(true);
        };
        utterance.onerror = () => {
          console.error('Speech synthesis error');
          setIsProcessing(false);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
      setIsProcessing(false);
      return false;
    }
  };

  const wishMe = useCallback(() => {
    if (isMuted) return;
    
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) {
      speak("Good Morning! I'm your virtual assistant. How may I help you today?");
    } else if (hour >= 12 && hour < 17) {
      speak("Good Afternoon! I'm your virtual assistant. How may I help you today?");
    } else {
      speak("Good Evening! I'm your virtual assistant. How may I help you today?");
    }
  }, [isMuted]);

  const handleCommand = async (message: string) => {
    console.log('Processing command:', message);
    if (!isMuted) playBeep(600, 'sine', 0.1);

    if (message.includes('hey') || message.includes('hello') || message.includes('hi')) {
      await speak("Hello! I'm your AI assistant. How may I help you today?");
    } else if (message.includes('dark mode') || message.includes('light mode')) {
      setIsDarkMode(message.includes('dark mode'));
      await speak(`Switching to ${message.includes('dark mode') ? 'dark' : 'light'} mode`);
    } else if (message.includes('play music') || message.includes('spotify')) {
      window.open("https://open.spotify.com", "_blank");
      await speak("Opening Spotify for you");
    } else if (message.includes('calculator')) {
      window.open("https://www.google.com/search?q=calculator", "_blank");
      await speak("Opening calculator");
    } else if (message.includes("open google")) {
      window.open("https://google.com", "_blank");
      await speak("Opening Google in a new tab");
    } else if (message.includes("open youtube")) {
      window.open("https://youtube.com", "_blank");
      await speak("Opening YouTube in a new tab");
    } else if (message.includes("open facebook")) {
      window.open("https://facebook.com", "_blank");
      await speak("Opening Facebook in a new tab");
    } else if (message.includes("time")) {
      const time = new Date().toLocaleString(undefined, {
        hour: "numeric",
        minute: "numeric",
        hour12: true
      });
      await speak(`The current time is ${time}`);
    } else if (message.includes("date")) {
      const date = new Date().toLocaleString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      await speak(`Today is ${date}`);
    } else if (message.includes('what is') || message.includes('who is') || message.includes('what are')) {
      const searchQuery = message.replace(/what is|who is|what are/i, '').trim();
      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, "_blank");
      await speak(`I've found some information about ${searchQuery}. Opening search results.`);
    } else if (message.includes('wikipedia')) {
      const searchQuery = message.replace('wikipedia', '').trim();
      window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(searchQuery)}`, "_blank");
      await speak(`Opening Wikipedia article about ${searchQuery}`);
    } else if (message.includes('weather')) {
      const location = message.replace('weather', '').trim() || 'current location';
      window.open(`https://www.google.com/search?q=weather+${encodeURIComponent(location)}`, "_blank");
      await speak(`Checking weather for ${location}`);
    } else if (message.includes('help') || message.includes('what can you do')) {
      await speak(`I can help you with various tasks. Here are some examples:
        Open websites like Google, YouTube, or Facebook,
        Check the time and date,
        Search the internet,
        Look up information on Wikipedia,
        Check the weather,
        Switch between dark and light mode,
        Play music,
        Use calculator.
        Just speak your command clearly.`);
    } else if (message.includes('stop listening') || message.includes('stop')) {
      recognition?.stop();
      await speak("Stopping voice recognition");
    } else if (message.includes('mute') || message.includes('unmute')) {
      setIsMuted(!isMuted);
      await speak(isMuted ? "Sound enabled" : "Sound disabled");
    } else {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(message)}`, "_blank");
      await speak("I'm searching for information about your request");
    }
  };

  const toggleListening = () => {
    if (micPermission === 'denied') {
      if (!isMuted) speak("Please grant microphone permission to use voice commands");
      requestMicrophonePermission();
      return;
    }

    try {
      if (isListening) {
        recognition?.stop();
      } else {
        recognition?.start();
      }
    } catch (error) {
      console.error('Error toggling speech recognition:', error);
      setContent('Error with speech recognition. Please try again.');
      if (!isMuted) playBeep(300, 'square', 0.1);
    }
  };

  const features = [
    { icon: Brain, title: "AI-Powered", description: "Advanced natural language processing" },
    { icon: Globe, title: "Web Search", description: "Instant access to information" },
    { icon: Clock, title: "Time Management", description: "Time and date tracking" },
    { icon: Music, title: "Music Control", description: "Quick access to music" },
    { icon: Search, title: "Smart Search", description: "Intelligent web queries" },
    { icon: Calculator, title: "Calculator", description: "Quick calculations" }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-800 to-black text-white'
        : 'bg-gradient-to-br from-blue-50 via-blue-100 to-white text-gray-900'
    }`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <Command className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h1 className={`text-3xl font-bold bg-clip-text text-transparent ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-blue-400 to-purple-600'
                  : 'bg-gradient-to-r from-blue-600 to-purple-800'
              }`}>
                Advanced Virtual Assistant
              </h1>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-white hover:bg-gray-100 shadow-md'
                }`}
              >
                {isDarkMode ? (
                  <Sun className="w-6 h-6 text-yellow-400" />
                ) : (
                  <Moon className="w-6 h-6 text-gray-600" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowFeatures(!showFeatures)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-white hover:bg-gray-100 shadow-md'
                }`}
              >
                <Settings className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </motion.button>
            </div>
          </motion.div>

          {/* Microphone Permission Alert */}
          {micPermission === 'denied' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-4 rounded-lg ${
                isDarkMode ? 'bg-red-900/50' : 'bg-red-100'
              } flex items-center gap-3`}
            >
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
                  Microphone access is required
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                  Please allow microphone access in your browser settings to use voice commands.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={requestMicrophonePermission}
                className={`ml-auto px-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Grant Access
              </motion.button>
            </motion.div>
          )}

          {/* Features Grid */}
          <AnimatePresence>
            {showFeatures && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg backdrop-blur-sm ${
                      isDarkMode 
                        ? 'bg-gray-800 bg-opacity-50'
                        : 'bg-white bg-opacity-70 shadow-lg'
                    }`}
                  >
                    <feature.icon className={`w-6 h-6 mb-2 ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>{feature.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat History */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`rounded-lg p-4 mb-6 h-[400px] overflow-y-auto backdrop-blur-sm ${
              isDarkMode 
                ? 'bg-gray-800 bg-opacity-50'
                : 'bg-white bg-opacity-70 shadow-lg'
            }`}
          >
            {history.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: item.type === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`mb-4 flex ${
                  item.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-[80%] ${
                    item.type === 'user'
                      ? isDarkMode 
                        ? 'bg-blue-600 bg-opacity-80'
                        : 'bg-blue-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 bg-opacity-80'
                        : 'bg-gray-100'
                  }`}
                >
                  <div className="text-sm">{item.message}</div>
                  <div className={`text-xs mt-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>{item.timestamp}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Control Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg p-6 backdrop-blur-sm ${
              isDarkMode 
                ? 'bg-gray-800 bg-opacity-50'
                : 'bg-white bg-opacity-70 shadow-lg'
            }`}
          >
            <motion.div 
              animate={{ 
                scale: isListening ? [1, 1.1, 1] : 1,
                transition: { 
                  repeat: isListening ? Infinity : 0,
                  duration: 2
                }
              }}
              className="text-center mb-6"
            >
              <p className="text-lg font-medium">
                {content || (micPermission === 'denied' 
                  ? 'Please grant microphone access'
                  : 'Click the microphone to start...')}
              </p>
            </motion.div>
            
            <div className="flex justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleListening}
                disabled={isProcessing}
                className={`p-4 rounded-full transition-all ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600'
                    : isDarkMode
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isListening ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-all ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {isMuted ? (
                  <VolumeX className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
                ) : (
                  <Volume2 className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default App;