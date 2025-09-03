// pages/coaching.js - Simplified Executive Coaching Assistant
import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';

// MUI Components
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
  Fade,
  Grow
} from '@mui/material';

// MUI Icons
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HearingIcon from '@mui/icons-material/Hearing';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PersonIcon from '@mui/icons-material/Person';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import PsychologyIcon from '@mui/icons-material/Psychology';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import TimerIcon from '@mui/icons-material/Timer';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SummarizeIcon from '@mui/icons-material/Summarize';
import DownloadIcon from '@mui/icons-material/Download';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TopicIcon from '@mui/icons-material/Topic';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';

// Third-party Libraries
import { GoogleGenerativeAI } from '@google/generative-ai';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import throttle from 'lodash.throttle';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import ScrollToBottom from 'react-scroll-to-bottom';

// Local Imports
import SettingsDialog from '../components/SettingsDialog';
import { setAIResponse } from '../redux/aiResponseSlice';
import { addToHistory } from '../redux/historySlice';
import { clearTranscription, setTranscription } from '../redux/transcriptionSlice';
import { getConfig, setConfig as saveConfig, getModelType } from '../utils/config';
import { generateQuestionPrompt, parseQuestions, analyzeDialogueForQuestionStyle } from '../utils/coachingPrompts';

// Pre-loaded Question Bank with keywords
const QUESTION_BANK = [
  { question: "What specific outcome are you hoping to achieve?", keywords: ["goal", "target", "outcome", "achievement", "result"] },
  { question: "How does this align with your core values?", keywords: ["values", "principles", "beliefs", "ethics", "integrity"] },
  { question: "What would success look like in this situation?", keywords: ["success", "achievement", "victory", "completion", "accomplishment"] },
  { question: "What's the most important thing for you to focus on right now?", keywords: ["priority", "focus", "important", "urgent", "crucial"] },
  { question: "What options haven't you considered yet?", keywords: ["options", "alternatives", "possibilities", "choices", "solutions"] },
  { question: "What would you do if you knew you couldn't fail?", keywords: ["fear", "failure", "risk", "doubt", "confidence"] },
  { question: "What's really important to you about this?", keywords: ["important", "matter", "value", "significance", "meaning"] },
  { question: "What would your best self do in this situation?", keywords: ["best", "ideal", "potential", "growth", "development"] },
  { question: "What patterns do you notice in your approach?", keywords: ["pattern", "habit", "behavior", "routine", "tendency"] },
  { question: "What would need to change for this to work?", keywords: ["change", "adapt", "modify", "adjust", "transform"] },
  { question: "How might you approach this differently?", keywords: ["different", "alternative", "new", "creative", "innovative"] },
  { question: "What's possible that you haven't thought of yet?", keywords: ["possible", "potential", "opportunity", "chance", "prospect"] },
  { question: "What would make the biggest difference?", keywords: ["difference", "impact", "effect", "influence", "change"] },
  { question: "What are you not saying that needs to be said?", keywords: ["communication", "honest", "truth", "expression", "voice"] },
  { question: "What would you tell a friend in this situation?", keywords: ["advice", "friend", "perspective", "counsel", "guidance"] },
  { question: "What assumptions are you making?", keywords: ["assumption", "belief", "presumption", "expectation", "hypothesis"] },
  { question: "What's the next smallest step you could take?", keywords: ["step", "action", "progress", "movement", "forward"] },
  { question: "What would happen if you did nothing?", keywords: ["nothing", "inaction", "status quo", "wait", "delay"] },
  { question: "What support do you need to move forward?", keywords: ["support", "help", "assistance", "resources", "backup"] },
  { question: "What would you regret not trying?", keywords: ["regret", "try", "attempt", "opportunity", "chance"] },
  { question: "How does this situation make you feel?", keywords: ["feel", "emotion", "sentiment", "mood", "reaction"] },
  { question: "What's driving your decision-making process?", keywords: ["decision", "choice", "motivation", "drive", "reason"] },
  { question: "What would confidence look like in this scenario?", keywords: ["confidence", "self-assurance", "courage", "boldness", "certainty"] },
  { question: "What's working well that you could build upon?", keywords: ["working", "strength", "success", "positive", "build"] },
  { question: "How can you leverage your existing strengths?", keywords: ["strength", "talent", "skill", "ability", "capability"] }
];

// Utility function
function debounce(func, timeout = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

export default function CoachingPage() {
  const dispatch = useDispatch();
  const transcriptionFromStore = useSelector(state => state.transcription);
  const aiResponseFromStore = useSelector(state => state.aiResponse);
  const history = useSelector(state => state.history);
  const theme = useTheme();

  const [appConfig, setAppConfig] = useState(getConfig());

  // Audio Recognition States
  const [coachRecognizer, setCoachRecognizer] = useState(null);
  const [coacheeRecognizer, setCoacheeRecognizer] = useState(null);
  const [isCoachMicActive, setIsCoachMicActive] = useState(false);
  const [isCoacheeMicActive, setIsCoacheeMicActive] = useState(false);
  const [isSystemAudioActive, setIsSystemAudioActive] = useState(false);
  const [coachTranscription, setCoachTranscription] = useState('');
  const [coacheeAutoMode, setCoacheeAutoMode] = useState(appConfig.coacheeAutoMode !== undefined ? appConfig.coacheeAutoMode : true);
  const [isManualMode, setIsManualMode] = useState(appConfig.isManualMode !== undefined ? appConfig.isManualMode : false);

  // AI & Processing States
  const [aiClient, setAiClient] = useState(null);
  const [isAILoading, setIsAILoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI States
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [autoScroll, setAutoScroll] = useState(true);
  const [aiResponseSortOrder, setAiResponseSortOrder] = useState('newestAtBottom');
  const [isPipWindowActive, setIsPipWindowActive] = useState(false);

  // Question Generation States
  const [urgentQuestionsDialog, setUrgentQuestionsDialog] = useState(false);
  const [urgentQuestionsCount, setUrgentQuestionsCount] = useState(2);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [preloadedQuestions, setPreloadedQuestions] = useState([]);
  const [dialogueDuration, setDialogueDuration] = useState(0);
  const [isDialogueActive, setIsDialogueActive] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Summary States (Main Topic focused)
  const [currentMainTopic, setCurrentMainTopic] = useState('');
  const [summaryTimer, setSummaryTimer] = useState(0);
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [topicHistory, setTopicHistory] = useState([]);

  // Transcription Feedback States
  const [coachTranscriptionStatus, setCoachTranscriptionStatus] = useState('idle'); // idle, active, error
  const [coacheeTranscriptionStatus, setCoacheeTranscriptionStatus] = useState('idle');
  const [lastCoachActivity, setLastCoachActivity] = useState(null);
  const [lastCoacheeActivity, setLastCoacheeActivity] = useState(null);

  // Session Management States
  const [sessionTopics, setSessionTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState('');

  // Refs
  const pipWindowRef = useRef(null);
  const documentPipWindowRef = useRef(null);
  const documentPipIframeRef = useRef(null);
  const coachInterimTranscription = useRef('');
  const coacheeInterimTranscription = useRef('');
  const silenceTimer = useRef(null);
  const finalTranscript = useRef({ coach: '', coachee: '' });
  const isManualModeRef = useRef(isManualMode);
  const coacheeAutoModeRef = useRef(coacheeAutoMode);
  const throttledDispatchSetAIResponseRef = useRef(null);
  const dialogueTimerRef = useRef(null);
  const summaryTimerRef = useRef(null);
  const lastQuestionTimeRef = useRef(Date.now());
  const dialogueBufferRef = useRef([]);
  const tempSpeechBuffer = useRef({ coach: '', coachee: '' });
  const systemAudioStreamRef = useRef(null);

  // Initialize preloaded questions (all of them)
  useEffect(() => {
    setPreloadedQuestions([...QUESTION_BANK]);
  }, []);

  // Highlight relevant questions based on current dialogue
  const getHighlightedQuestions = useCallback(() => {
    if (dialogueBufferRef.current.length === 0) return preloadedQuestions;

    const recentText = dialogueBufferRef.current
      .slice(-5)
      .map(item => item.text.toLowerCase())
      .join(' ');

    return preloadedQuestions.map(item => ({
      ...item,
      relevance: item.keywords.reduce((score, keyword) => {
        if (recentText.includes(keyword.toLowerCase())) {
          return score + 1;
        }
        return score;
      }, 0)
    })).sort((a, b) => b.relevance - a.relevance);
  }, [preloadedQuestions]);

  // Utility Functions
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = () => setSnackbarOpen(false);

  // Export Topic History
  const exportTopicHistory = () => {
    const data = {
      sessionDate: new Date().toISOString(),
      currentMainTopic: currentMainTopic,
      topicHistory: topicHistory,
      sessionTopics: sessionTopics,
      dialogueDuration: dialogueDuration
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coaching-topics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSnackbar('Topic history exported successfully', 'success');
  };

  // Settings Management
  const handleSettingsSaved = () => {
    const newConfig = getConfig();
    setAppConfig(newConfig);
    setIsAILoading(true);
    setCoacheeAutoMode(newConfig.coacheeAutoMode !== undefined ? newConfig.coacheeAutoMode : true);
    setIsManualMode(newConfig.isManualMode !== undefined ? newConfig.isManualMode : false);
    showSnackbar('Settings saved successfully', 'success');
  };

  // AI Client Initialization
  useEffect(() => {
    const initializeAI = async () => {
      try {
        const modelType = getModelType(appConfig.aiModel);
        
        if (modelType === 'anthropic') {
          if (!appConfig.anthropicKey) {
            showSnackbar('Anthropic API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic({
            apiKey: appConfig.anthropicKey,
            dangerouslyAllowBrowser: true
          });
          setAiClient({ client, type: 'anthropic' });
        } else if (modelType === 'gemini') {
          if (!appConfig.geminiKey) {
            showSnackbar('Gemini API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const genAI = new GoogleGenerativeAI(appConfig.geminiKey);
          setAiClient({ client: genAI, type: 'gemini' });
        } else {
          if (!appConfig.openaiKey) {
            showSnackbar('OpenAI API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const openaiClient = new OpenAI({
            apiKey: appConfig.openaiKey,
            dangerouslyAllowBrowser: true
          });
          setAiClient({ client: openaiClient, type: 'openai' });
        }
      } catch (error) {
        console.error('Error initializing AI client:', error);
        showSnackbar('Error initializing AI client: ' + error.message, 'error');
        setAiClient(null);
      } finally {
        setIsAILoading(false);
      }
    };

    if (isAILoading) initializeAI();
  }, [appConfig, isAILoading, showSnackbar]);

  // Throttled AI Response Dispatch
  useEffect(() => {
    throttledDispatchSetAIResponseRef.current = throttle((payload) => {
      dispatch(setAIResponse(payload));
    }, 250, { leading: true, trailing: true });

    return () => {
      if (throttledDispatchSetAIResponseRef.current?.cancel) {
        throttledDispatchSetAIResponseRef.current.cancel();
      }
    };
  }, [dispatch]);

  // Dialogue Timer Management
  useEffect(() => {
    if (isDialogueActive) {
      dialogueTimerRef.current = setInterval(() => {
        setDialogueDuration(prev => {
          const newDuration = prev + 1;
          
          // Check if we should auto-generate questions
          if (appConfig.autoSuggestQuestions && 
              newDuration >= appConfig.dialogueListenDuration &&
              newDuration % appConfig.dialogueListenDuration === 0) {
            generateCoachingQuestions(appConfig.numberOfQuestions);
          }
          
          return newDuration;
        });
      }, 1000);
    } else {
      if (dialogueTimerRef.current) {
        clearInterval(dialogueTimerRef.current);
      }
    }
    
    return () => {
      if (dialogueTimerRef.current) {
        clearInterval(dialogueTimerRef.current);
      }
    };
  }, [isDialogueActive, appConfig]);

  // Topic Generation Timer (2 minutes = 120 seconds)
  useEffect(() => {
    if (isDialogueActive) {
      summaryTimerRef.current = setInterval(() => {
        setSummaryTimer(prev => {
          const newTimer = prev + 1;
          if (newTimer >= 120) { // Every 2 minutes
            generateMainTopic();
            return 0; // Reset timer
          }
          return newTimer;
        });
      }, 1000);
    } else {
      if (summaryTimerRef.current) {
        clearInterval(summaryTimerRef.current);
      }
    }
    
    return () => {
      if (summaryTimerRef.current) {
        clearInterval(summaryTimerRef.current);
      }
    };
  }, [isDialogueActive]);

  // Update refs when states change
  useEffect(() => { isManualModeRef.current = isManualMode; }, [isManualMode]);
  useEffect(() => { coacheeAutoModeRef.current = coacheeAutoMode; }, [coacheeAutoMode]);

  // Main Topic Generation Function (2 minutes)
  const generateMainTopic = async () => {
    if (!aiClient || isAILoading || generatingTopic) return;
    
    const coacheeText = tempSpeechBuffer.current.coachee.trim();
    
    if (!coacheeText) return;

    setGeneratingTopic(true);
    
    try {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const language = appConfig.azureLanguage === 'it-IT' ? 'Italian' : 'English';
      
      // Generate main topic in conversation language
      const prompt = `In ${language}, identify the main topic/theme the coachee is discussing in 3-5 words maximum. Based on: "${coacheeText}"`;
      
      let topicResponse = '';
      if (aiClient.type === 'anthropic') {
        const response = await aiClient.client.messages.create({
          model: appConfig.aiModel,
          max_tokens: 50,
          temperature: 0.3,
          system: `You identify main themes in coaching conversations. Respond only with the main topic in ${language}, maximum 5 words.`,
          messages: [{ role: 'user', content: prompt }]
        });
        topicResponse = response.content[0].text;
      } else if (aiClient.type === 'openai') {
        const response = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages: [
            { role: 'system', content: `You identify main themes in coaching conversations. Respond only with the main topic in ${language}, maximum 5 words.` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 50
        });
        topicResponse = response.choices[0].message.content;
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature: 0.3, maxOutputTokens: 50 }
        });
        const result = await model.generateContent(prompt);
        topicResponse = result.response.text();
      }
      
      // Store previous topic in history before updating
      if (currentMainTopic) {
        setTopicHistory(prev => [{ 
          topic: currentMainTopic, 
          timestamp: new Date(Date.now() - 120000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          id: Date.now() - 120000 
        }, ...prev]);
      }
      
      // Update current topic
      setCurrentMainTopic(topicResponse.trim());
      
      // Clear the temporary buffer
      tempSpeechBuffer.current = { coach: '', coachee: '' };
      
    } catch (error) {
      console.error('Error generating main topic:', error);
      showSnackbar('Failed to generate main topic: ' + error.message, 'error');
    } finally {
      setGeneratingTopic(false);
    }
  };

  // Speech Recognition Functions
  const createRecognizer = async (mediaStream, source) => {
    if (!appConfig.azureToken || !appConfig.azureRegion) {
      showSnackbar('Azure Speech credentials missing. Please set them in Settings.', 'error');
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }

    let audioConfig;
    try {
      audioConfig = SpeechSDK.AudioConfig.fromStreamInput(mediaStream);
    } catch (configError) {
      console.error(`Error creating AudioConfig for ${source}:`, configError);
      showSnackbar(`Error setting up audio for ${source}: ${configError.message}`, 'error');
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(appConfig.azureToken, appConfig.azureRegion);
    speechConfig.speechRecognitionLanguage = appConfig.azureLanguage;

    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    // Update transcription status to active
    if (source === 'coach') {
      setCoachTranscriptionStatus('active');
    } else {
      setCoacheeTranscriptionStatus('active');
    }

    recognizer.recognizing = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
        const interimText = e.result.text;
        if (source === 'coachee') {
          coacheeInterimTranscription.current = interimText;
          dispatch(setTranscription(finalTranscript.current.coachee + interimText));
          setLastCoacheeActivity(Date.now());
        } else {
          coachInterimTranscription.current = interimText;
          setCoachTranscription(finalTranscript.current.coach + interimText);
          setLastCoachActivity(Date.now());
        }
      }
    };

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
        if (source === 'coachee') {
          coacheeInterimTranscription.current = '';
          setLastCoacheeActivity(Date.now());
        } else {
          coachInterimTranscription.current = '';
          setLastCoachActivity(Date.now());
        }
        handleTranscriptionEvent(e.result.text, source);
      }
    };

    recognizer.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason} for ${source}`);
      if (e.reason === SpeechSDK.CancellationReason.Error) {
        console.error(`CANCELED: ErrorCode=${e.errorCode}`);
        console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
        showSnackbar(`Speech recognition error for ${source}: ${e.errorDetails}`, 'error');
        if (source === 'coach') {
          setCoachTranscriptionStatus('error');
        } else {
          setCoacheeTranscriptionStatus('error');
        }
      }
      stopRecording(source);
    };

    recognizer.sessionStopped = (s, e) => {
      console.log(`Session stopped event for ${source}.`);
      stopRecording(source);
    };

    try {
      await recognizer.startContinuousRecognitionAsync();
      return recognizer;
    } catch (error) {
      console.error(`Error starting ${source} continuous recognition:`, error);
      showSnackbar(`Failed to start ${source} recognition: ${error.message}`, 'error');
      if (audioConfig?.close) audioConfig.close();
      mediaStream.getTracks().forEach(track => track.stop());
      if (source === 'coach') {
        setCoachTranscriptionStatus('error');
      } else {
        setCoacheeTranscriptionStatus('error');
      }
      return null;
    }
  };

  const stopRecording = async (source) => {
    const recognizer = source === 'coach' ? coachRecognizer : 
                      source === 'coachee' ? coacheeRecognizer : null;
    
    if (recognizer?.stopContinuousRecognitionAsync) {
      try {
        await recognizer.stopContinuousRecognitionAsync();
        
        // Properly close the recognizer and audio config
        if (recognizer.audioConfig?.privSource?.privStream) {
          const stream = recognizer.audioConfig.privSource.privStream;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
        if (recognizer.audioConfig?.close) {
          recognizer.audioConfig.close();
        }
        
        // Call recognizer close if available
        if (recognizer.close) {
          recognizer.close();
        }
        
      } catch (error) {
        console.error(`Error stopping ${source} recognition:`, error);
        showSnackbar(`Error stopping ${source} audio: ${error.message}`, 'error');
      } finally {
        // Update states
        if (source === 'coach') {
          setIsCoachMicActive(false);
          setCoachRecognizer(null);
          setCoachTranscriptionStatus('idle');
        } else if (source === 'coachee') {
          setIsCoacheeMicActive(false);
          setCoacheeRecognizer(null);
          setCoacheeTranscriptionStatus('idle');
        } else if (source === 'system') {
          setIsSystemAudioActive(false);
          setCoacheeRecognizer(null);
          setCoacheeTranscriptionStatus('idle');
          
          // Additional cleanup for system audio
          if (systemAudioStreamRef.current) {
            systemAudioStreamRef.current.getTracks().forEach(track => {
              track.stop();
            });
            systemAudioStreamRef.current = null;
          }
        }
      }
    }
  };

  const startSystemAudioRecognition = async () => {
    if (isSystemAudioActive) {
      await stopRecording('system');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showSnackbar('Screen sharing is not supported by your browser.', 'error');
      setIsSystemAudioActive(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        video: {
          displaySurface: 'browser',
          logicalSurface: true
        }
      });

      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        showSnackbar('No audio track detected. Please ensure you share a tab with audio.', 'warning');
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      // Store the stream reference for proper cleanup
      systemAudioStreamRef.current = mediaStream;

      if (coacheeRecognizer) {
        await stopRecording('system');
      }

      const recognizerInstance = await createRecognizer(mediaStream, 'coachee');
      if (recognizerInstance) {
        setCoacheeRecognizer(recognizerInstance);
        setIsSystemAudioActive(true);
        showSnackbar('System audio recording started for coachee.', 'success');
        
        // Handle stream end events
        mediaStream.getTracks().forEach(track => {
          track.onended = () => {
            showSnackbar('Tab sharing ended.', 'info');
            stopRecording('system');
          };
        });
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
        systemAudioStreamRef.current = null;
      }
    } catch (error) {
      console.error('System audio capture error:', error);
      if (error.name === "NotAllowedError") {
        showSnackbar('Permission denied for screen recording. Please allow access.', 'error');
      } else if (error.name === "NotFoundError") {
        showSnackbar('No suitable tab/window found to share.', 'error');
      } else if (error.name === "NotSupportedError") {
        showSnackbar('System audio capture not supported by your browser.', 'error');
      } else {
        showSnackbar(`Failed to start system audio capture: ${error.message || 'Unknown error'}`, 'error');
      }
      setIsSystemAudioActive(false);
      setCoacheeTranscriptionStatus('idle');
      systemAudioStreamRef.current = null;
    }
  };

  const startMicrophoneRecognition = async (source) => {
    const isActive = source === 'coach' ? isCoachMicActive : isCoacheeMicActive;
    
    if (isActive) {
      await stopRecording(source);
      return;
    }

    // For coachee, stop system audio if it's active
    if (source === 'coachee' && isSystemAudioActive) {
      await stopRecording('system');
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      const currentRecognizer = source === 'coach' ? coachRecognizer : coacheeRecognizer;
      
      if (currentRecognizer) await stopRecording(source);

      const recognizerInstance = await createRecognizer(mediaStream, source);
      if (recognizerInstance) {
        if (source === 'coach') {
          setCoachRecognizer(recognizerInstance);
          setIsCoachMicActive(true);
        } else {
          setCoacheeRecognizer(recognizerInstance);
          setIsCoacheeMicActive(true);
        }
        showSnackbar(`${source === 'coach' ? 'Coach' : 'Coachee'} microphone recording started.`, 'success');
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Microphone capture error:', error);
      if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
        showSnackbar('Permission denied for microphone. Please allow access.', 'error');
      } else {
        showSnackbar(`Failed to access microphone: ${error.message || 'Unknown error'}`, 'error');
      }
      if (source === 'coach') {
        setIsCoachMicActive(false);
        setCoachTranscriptionStatus('idle');
      } else {
        setIsCoacheeMicActive(false);
        setCoacheeTranscriptionStatus('idle');
      }
    }
  };

  // Transcription Event Handler
  const handleTranscriptionEvent = (text, source) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    // Start dialogue tracking if not already active
    if (!isDialogueActive) {
      setIsDialogueActive(true);
    }
    
    // Reset the last activity time
    lastQuestionTimeRef.current = Date.now();
    
    // Add to temporary speech buffer for topic generation
    tempSpeechBuffer.current[source] += cleanText + ' ';
    
    // Add to dialogue buffer for context
    dialogueBufferRef.current.push({
      text: cleanText,
      source: source,
      timestamp: Date.now()
    });
    
    // Keep only recent dialogue (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    dialogueBufferRef.current = dialogueBufferRef.current.filter(
      item => item.timestamp > fiveMinutesAgo
    );

    // Update transcription
    finalTranscript.current[source] += cleanText + ' ';
    
    if (source === 'coachee') {
      dispatch(setTranscription(finalTranscript.current.coachee + coacheeInterimTranscription.current));
    } else {
      setCoachTranscription(finalTranscript.current.coach + coachInterimTranscription.current);
    }

    // Handle auto-submission with silence timer
    if ((source === 'coachee' && coacheeAutoModeRef.current) || (source === 'coach' && !isManualModeRef.current)) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        askAI(finalTranscript.current[source].trim(), source);
      }, appConfig.silenceTimerDuration * 1000);
    }
  };

  // Manual Input Handlers
  const handleManualInputChange = (value, source) => {
    if (source === 'coachee') {
      dispatch(setTranscription(value));
      finalTranscript.current.coachee = value;
    } else {
      setCoachTranscription(value);
      finalTranscript.current.coach = value;
    }
  };

  const handleManualSubmit = (source) => {
    const textToSubmit = source === 'coachee' ? transcriptionFromStore : coachTranscription;
    if (textToSubmit.trim()) {
      askAI(textToSubmit.trim(), source);
    } else {
      showSnackbar('Input is empty.', 'warning');
    }
  };

  const handleKeyPress = (e, source) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleManualSubmit(source);
    }
  };

  // Clear Functions
  const handleClearTranscription = (source) => {
    if (source === 'coachee') {
      finalTranscript.current.coachee = '';
      coacheeInterimTranscription.current = '';
      dispatch(clearTranscription());
    } else {
      finalTranscript.current.coach = '';
      coachInterimTranscription.current = '';
      setCoachTranscription('');
    }
  };

  // AI Processing
  const askAI = async (text, source) => {
    if (!text.trim()) {
      showSnackbar('No input text to process.', 'warning');
      return;
    }
    if (!aiClient || isAILoading) {
      showSnackbar('AI client is not ready. Please wait or check settings.', 'warning');
      return;
    }

    const lengthSettings = {
      concise: { temperature: 0.4, maxTokens: 250 },
      medium: { temperature: 0.6, maxTokens: 500 },
      lengthy: { temperature: 0.8, maxTokens: 1000 }
    };
    const { temperature, maxTokens } = lengthSettings[appConfig.responseLength || 'medium'];

    setIsProcessing(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let streamedResponse = '';

    dispatch(addToHistory({ type: 'question', text, timestamp, source, status: 'pending' }));
    dispatch(setAIResponse(''));

    try {
      const conversationHistoryForAPI = history
        .filter(e => e.text && (e.type === 'question' || e.type === 'response') && e.status !== 'pending')
        .slice(-6)
        .map(event => ({
          role: event.type === 'question' ? 'user' : 'assistant',
          content: event.text,
        }));

      if (aiClient.type === 'anthropic') {
        const response = await aiClient.client.messages.create({
          model: appConfig.aiModel,
          max_tokens: maxTokens,
          temperature,
          system: appConfig.systemPrompt,
          messages: [
            ...conversationHistoryForAPI,
            { role: 'user', content: text }
          ],
          stream: true
        });

        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta') {
            const chunkText = chunk.delta.text || '';
            streamedResponse += chunkText;
            if (throttledDispatchSetAIResponseRef.current) {
              throttledDispatchSetAIResponseRef.current(streamedResponse);
            }
          }
        }
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
          systemInstruction: { parts: [{ text: appConfig.systemPrompt }] }
        });
        const chat = model.startChat({
          history: conversationHistoryForAPI.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })),
        });
        const result = await chat.sendMessageStream(text);
        for await (const chunk of result.stream) {
          if (chunk?.text) {
            const chunkText = chunk.text();
            streamedResponse += chunkText;
            if (throttledDispatchSetAIResponseRef.current) {
              throttledDispatchSetAIResponseRef.current(streamedResponse);
            }
          }
        }
      } else {
        const messages = [
          { role: 'system', content: appConfig.systemPrompt },
          ...conversationHistoryForAPI,
          { role: 'user', content: text }
        ];
        const stream = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        });
        for await (const chunk of stream) {
          const chunkText = chunk.choices[0]?.delta?.content || '';
          streamedResponse += chunkText;
          if (throttledDispatchSetAIResponseRef.current) {
            throttledDispatchSetAIResponseRef.current(streamedResponse);
          }
        }
      }

      if (throttledDispatchSetAIResponseRef.current?.cancel) {
        throttledDispatchSetAIResponseRef.current.cancel();
      }
      dispatch(setAIResponse(streamedResponse));

      const finalTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dispatch(addToHistory({ type: 'response', text: streamedResponse, timestamp: finalTimestamp, status: 'completed' }));

    } catch (error) {
      console.error("AI request error:", error);
      const errorMessage = `AI request failed: ${error.message || 'Unknown error'}`;
      showSnackbar(errorMessage, 'error');
      dispatch(setAIResponse(`Error: ${errorMessage}`));
      dispatch(addToHistory({ type: 'response', text: `Error: ${errorMessage}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'error' }));
    } finally {
      if ((source === 'coachee' && coacheeAutoModeRef.current) || (source === 'coach' && !isManualModeRef.current)) {
        finalTranscript.current[source] = '';
        if (source === 'coachee') {
          coacheeInterimTranscription.current = '';
          dispatch(setTranscription(''));
        } else {
          coachInterimTranscription.current = '';
          setCoachTranscription('');
        }
      }
      setIsProcessing(false);
    }
  };

  // Question Generation with specific prompt
  const generateCoachingQuestions = async (numQuestions = null) => {
    const questionsToGenerate = numQuestions || appConfig.numberOfQuestions || 2;
    
    if (!aiClient || isAILoading) {
      showSnackbar('AI client is not ready. Please wait or check settings.', 'warning');
      return;
    }
    
    setGeneratingQuestions(true);
    
    // Gather recent dialogue context
    const recentDialogue = dialogueBufferRef.current
      .slice(-10)
      .map(item => `${item.source}: ${item.text}`)
      .join('\n');
    
    const language = appConfig.azureLanguage === 'it-IT' ? 'Italian' : 'English';
    
    const prompt = `Generate exactly ${questionsToGenerate} powerful coaching questions in ${language} based on the conversation context. Follow these specific guidelines:

- Use open-ended questions that cannot be answered with yes/no
- Keep questions short and clear (ideally under 15 words)
- Focus on the coachee's thoughts, feelings, and actions
- Avoid "why" questions when possible (use "what" or "how" instead)
- Include questions that challenge assumptions
- Ensure questions are non-judgmental and curious

Recent conversation context:
${recentDialogue || 'No recent dialogue captured yet.'}

Please provide exactly ${questionsToGenerate} question(s), numbered and separated by newlines. Only provide the questions themselves, no additional explanation or context.`;

    try {
      let questionsResponse = '';
      
      if (aiClient.type === 'anthropic') {
        const response = await aiClient.client.messages.create({
          model: appConfig.aiModel,
          max_tokens: 200,
          temperature: 0.7,
          system: `You are an expert executive coach. Generate powerful, open-ended coaching questions in ${language}.`,
          messages: [{ role: 'user', content: prompt }]
        });
        questionsResponse = response.content[0].text;
        
      } else if (aiClient.type === 'openai') {
        const response = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages: [
            { role: 'system', content: `You are an expert executive coach. Generate powerful, open-ended coaching questions in ${language}.` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        });
        questionsResponse = response.choices[0].message.content;
        
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
        });
        const result = await model.generateContent(prompt);
        questionsResponse = result.response.text();
      }
      
      // Parse the questions
      const questions = parseQuestions(questionsResponse, questionsToGenerate);
      
      // Add newest questions to the TOP of the array
      setSuggestedQuestions(prev => [...questions, ...prev]);
      
      // Add to history
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dispatch(addToHistory({ 
        type: 'questions', 
        text: `Suggested Questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
        timestamp,
        status: 'completed'
      }));
      
      showSnackbar(`Generated ${questions.length} coaching question(s)`, 'success');
      
    } catch (error) {
      console.error('Error generating questions:', error);
      showSnackbar('Failed to generate questions: ' + error.message, 'error');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Session Topic Management
  const addSessionTopic = () => {
    if (currentTopic.trim() && !sessionTopics.includes(currentTopic.trim())) {
      setSessionTopics([...sessionTopics, currentTopic.trim()]);
      setCurrentTopic('');
    }
  };

  const removeSessionTopic = (topicToRemove) => {
    setSessionTopics(sessionTopics.filter(topic => topic !== topicToRemove));
  };

  // Component Definitions
  const UrgentQuestionsDialog = () => (
    <Dialog open={urgentQuestionsDialog} onClose={() => setUrgentQuestionsDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LiveHelpIcon color="primary" />
          Generate Coaching Questions
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Generate powerful coaching questions based on the current conversation context.
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel>Number of Questions</InputLabel>
          <Select
            value={urgentQuestionsCount}
            onChange={(e) => setUrgentQuestionsCount(e.target.value)}
            label="Number of Questions"
          >
            <MenuItem value={1}>1 Question - Single focused inquiry</MenuItem>
            <MenuItem value={2}>2 Questions - Balanced exploration</MenuItem>
            <MenuItem value={3}>3 Questions - Multiple perspectives</MenuItem>
          </Select>
        </FormControl>
        
        {dialogueBufferRef.current.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            No recent dialogue captured. Questions will be generated based on general coaching principles.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setUrgentQuestionsDialog(false)}>Cancel</Button>
        <Button 
          onClick={() => {
            generateCoachingQuestions(urgentQuestionsCount);
            setUrgentQuestionsDialog(false);
          }}
          variant="contained"
          color="primary"
          disabled={generatingQuestions}
          startIcon={generatingQuestions ? <CircularProgress size={16} /> : <PsychologyIcon />}
        >
          Generate Questions
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Main Topic Card Component
  const MainTopicCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="Current Main Topic"
        avatar={<TopicIcon />}
        subheader={`Next update in ${Math.floor((120 - summaryTimer) / 60)}:${((120 - summaryTimer) % 60).toString().padStart(2, '0')}`}
        action={
          <Tooltip title="Export Topic History">
            <IconButton onClick={exportTopicHistory} disabled={topicHistory.length === 0}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 1 }}
      />
      <CardContent>
        {currentMainTopic ? (
          <Paper 
            sx={{ 
              p: 3,
              bgcolor: 'primary.50',
              border: `2px solid ${theme.palette.primary.main}`,
              borderColor: 'primary.main',
              textAlign: 'center'
            }}
            elevation={3}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold',
                mb: 1,
                color: 'primary.main'
              }}
            >
              {currentMainTopic}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <TopicIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              {generatingTopic ? 'Analyzing topic...' : 'Topic will appear during active dialogue'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {generatingTopic ? 'Please wait while we identify the main theme...' : 'Main topic updates every 2 minutes'}
            </Typography>
            {generatingTopic && <CircularProgress sx={{ mt: 2 }} />}
          </Box>
        )}
        
        <LinearProgress 
          variant="determinate" 
          value={(summaryTimer / 120) * 100}
          sx={{ mt: 2, height: 6, borderRadius: 3 }}
          color="primary"
        />
        
        {topicHistory.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {topicHistory.length} previous topic(s) in history
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  // Transcription Feedback Component
  const TranscriptionFeedback = () => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'active': return 'success';
        case 'error': return 'error';
        default: return 'grey';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'active': return <CheckCircleIcon fontSize="small" />;
        case 'error': return <ErrorIcon fontSize="small" />;
        default: return <SignalWifiStatusbar4BarIcon fontSize="small" />;
      }
    };

    const getStatusText = (status, lastActivity, isActive) => {
      if (status === 'error') return 'Error';
      if (status === 'active' && isActive) {
        if (lastActivity && Date.now() - lastActivity < 5000) {
          return 'Active';
        }
        return 'Listening';
      }
      return 'Idle';
    };

    return (
      <Card sx={{ mb: 2 }}>
        <CardHeader 
          title="Transcription Status"
          avatar={<SignalWifiStatusbar4BarIcon />}
          sx={{ pb: 1 }}
        />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusIcon(coacheeTranscriptionStatus)}
              <Typography variant="body2" color={`${getStatusColor(coacheeTranscriptionStatus)}.main`}>
                Coachee: {getStatusText(coacheeTranscriptionStatus, lastCoacheeActivity, isSystemAudioActive || isCoacheeMicActive)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusIcon(coachTranscriptionStatus)}
              <Typography variant="body2" color={`${getStatusColor(coachTranscriptionStatus)}.main`}>
                Coach: {getStatusText(coachTranscriptionStatus, lastCoachActivity, isCoachMicActive)}
              </Typography>
            </Box>
          </Box>
          
          {(coacheeTranscriptionStatus === 'active' || coachTranscriptionStatus === 'active') && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="caption" color="success.main">
                Transcription working properly
              </Typography>
            </Box>
          )}
          
          {(coacheeTranscriptionStatus === 'error' || coachTranscriptionStatus === 'error') && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
              <ErrorIcon color="error" fontSize="small" />
              <Typography variant="caption" color="error.main">
                Transcription issues detected
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Audio Status Component
  const AudioStatusIndicator = ({ isActive, color, label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
      <FiberManualRecordIcon 
        sx={{ 
          color: isActive ? color : 'grey.400',
          fontSize: 16,
          animation: isActive ? 'pulse 2s infinite' : 'none'
        }} 
      />
      <Typography variant="caption" color={isActive ? 'text.primary' : 'text.secondary'}>
        {label}
      </Typography>
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Box>
  );

  // Main Render
  return (
    <>
      <Head>
        <title>Executive Coaching Assistant - Active Session</title>
      </Head>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <SmartToyIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
              Executive Coaching Assistant
            </Typography>
            
            {/* Audio Status Indicators */}
            <AudioStatusIndicator 
              isActive={isSystemAudioActive || isCoacheeMicActive}
              color="green"
              label="Coachee"
            />
            <AudioStatusIndicator 
              isActive={isCoachMicActive}
              color="purple"
              label="Coach"
            />
            
            {/* Dialogue Duration Indicator */}
            {isDialogueActive && (
              <Chip
                icon={<TimerIcon />}
                label={`Session: ${Math.floor(dialogueDuration / 60)}:${(dialogueDuration % 60).toString().padStart(2, '0')}`}
                color="primary"
                variant="outlined"
                sx={{ mr: 2 }}
              />
            )}
            
            <Tooltip title="Settings">
              <IconButton color="primary" onClick={() => setSettingsOpen(true)} aria-label="settings">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ flexGrow: 1, py: 2, display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={2} sx={{ flexGrow: 1 }}>
            {/* Left Panel - Main Topic & Audio Controls */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Main Topic Card */}
              <MainTopicCard />
              
              {/* Transcription Feedback */}
              <TranscriptionFeedback />
              
              <Card>
                <CardHeader title="Audio Controls" avatar={<RecordVoiceOverIcon />} sx={{ pb: 1 }} />
                <CardContent>
                  <Button
                    onClick={startSystemAudioRecognition}
                    variant="contained"
                    color={isSystemAudioActive ? 'error' : 'primary'}
                    startIcon={isSystemAudioActive ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                    fullWidth
                    size="large"
                    sx={{ mb: 2 }}
                  >
                    {isSystemAudioActive ? 'Stop System Audio' : 'Start System Audio'}
                  </Button>
                  
                  <Button
                    onClick={() => startMicrophoneRecognition('coach')}
                    variant="outlined"
                    color={isCoachMicActive ? 'error' : 'primary'}
                    startIcon={isCoachMicActive ? <MicOffIcon /> : <MicIcon />}
                    fullWidth
                  >
                    {isCoachMicActive ? 'Stop Coach Mic' : 'Start Coach Mic'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Center Panel - Coaching Questions (Largest) */}
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <CardHeader 
                  title="Coaching Questions"
                  avatar={<QuestionAnswerIcon />}
                  action={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {appConfig.autoSuggestQuestions && dialogueDuration > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimerIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            Next in {Math.max(0, appConfig.dialogueListenDuration - (dialogueDuration % appConfig.dialogueListenDuration))}s
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={(dialogueDuration % appConfig.dialogueListenDuration) / appConfig.dialogueListenDuration * 100}
                            sx={{ width: 60, height: 4 }}
                          />
                        </Box>
                      )}
                      <Tooltip title="Generate Questions Now">
                        <IconButton 
                          onClick={() => setUrgentQuestionsDialog(true)}
                          color="primary"
                          disabled={generatingQuestions}
                        >
                          {generatingQuestions ? <CircularProgress size={20} /> : <LiveHelpIcon />}
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => generateCoachingQuestions(appConfig.numberOfQuestions)}
                        disabled={generatingQuestions}
                        startIcon={generatingQuestions ? <CircularProgress size={16} /> : <PsychologyIcon />}
                      >
                        Generate {appConfig.numberOfQuestions || 2}
                      </Button>
                    </Box>
                  }
                  sx={{ pb: 1 }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  {suggestedQuestions.length > 0 ? (
                    <ScrollToBottom className="scroll-to-bottom" followButtonClassName="hidden-follow-button">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {suggestedQuestions.map((question, index) => (
                          <Grow
                            in={true}
                            timeout={500 + (index * 100)}
                            key={`question-${index}`}
                          >
                            <Paper 
                              sx={{ 
                                p: 3,
                                transform: index === 0 ? 'scale(1)' : `scale(${Math.max(0.90, 1 - index * 0.05)})`,
                                transformOrigin: 'top center',
                                opacity: Math.max(0.8, 1 - index * 0.1),
                                bgcolor: index === 0 ? 'primary.50' : 'background.paper',
                                border: index === 0 ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                                borderColor: index === 0 ? 'primary.main' : 'divider',
                                cursor: 'pointer',
                                '&:hover': {
                                  transform: `scale(${index === 0 ? 1.02 : Math.max(0.92, 1 - index * 0.05)})`,
                                  boxShadow: theme.shadows[4]
                                }
                              }}
                              elevation={index === 0 ? 3 : 1}
                              onClick={() => askAI(question, 'suggested')}
                            >
                              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <Chip 
                                  label={`Q${index + 1}`} 
                                  size="small" 
                                  color={index === 0 ? "primary" : "default"}
                                  sx={{ mt: 0.5 }}
                                />
                                <Typography 
                                  variant={index === 0 ? "h6" : "body1"} 
                                  sx={{ 
                                    fontWeight: index === 0 ? 'bold' : 'normal',
                                    color: index === 0 ? 'primary.main' : 'text.primary'
                                  }}
                                >
                                  {question}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grow>
                        ))}
                      </Box>
                    </ScrollToBottom>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      textAlign: 'center'
                    }}>
                      <PsychologyIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        {generatingQuestions ? 'Generating Questions...' : 'Ready to Generate Questions'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {generatingQuestions ? 
                          'Please wait while we analyze the conversation...' : 
                          'Click the Generate button or wait for auto-generation to begin'
                        }
                      </Typography>
                      {generatingQuestions && <CircularProgress sx={{ mt: 2 }} />}
                    </Box>
                  )}
                  
                  {suggestedQuestions.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => generateCoachingQuestions(appConfig.numberOfQuestions)}
                        disabled={generatingQuestions}
                      >
                        Refresh Questions
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setSuggestedQuestions([])}
                      >
                        Clear All
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Right Panel - Smart Question Bank */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* Question Bank (Smart Highlighting) */}
              <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title="Question Bank"
                  avatar={<MenuBookIcon />}
                  subheader="Smart highlighting based on dialogue"
                  sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden', p: 0 }}>
                  <ScrollToBottom
                    className="scroll-to-bottom"
                    followButtonClassName="hidden-follow-button"
                  >
                    <List sx={{ px: 1, py: 1 }} dense>
                      {getHighlightedQuestions().map((item, index) => (
                        <ListItem 
                          key={index}
                          sx={{ 
                            cursor: 'pointer',
                            borderRadius: 1,
                            mb: 0.5,
                            bgcolor: item.relevance > 0 ? 'warning.50' : 'transparent',
                            border: item.relevance > 0 ? `1px solid ${theme.palette.warning.main}` : '1px solid transparent',
                            '&:hover': {
                              bgcolor: item.relevance > 0 ? 'warning.100' : 'action.hover'
                            }
                          }}
                          onClick={() => askAI(item.question, 'preloaded')}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {item.relevance > 0 && (
                                  <Chip 
                                    label="Relevant" 
                                    size="small" 
                                    color="warning"
                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                  />
                                )}
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: item.relevance > 0 ? 'bold' : 'normal',
                                    color: item.relevance > 0 ? 'warning.dark' : 'text.primary'
                                  }}
                                >
                                  {item.question}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </ScrollToBottom>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>

        {/* Floating Action Button for Quick Question Generation */}
        <Fab
          color="primary"
          aria-label="generate questions"
          onClick={() => generateCoachingQuestions(appConfig.numberOfQuestions)}
          disabled={generatingQuestions || !aiClient || isAILoading}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: { xs: 'flex', md: 'none' } // Only show on mobile
          }}
        >
          {generatingQuestions ? <CircularProgress size={24} color="inherit" /> : <PsychologyIcon />}
        </Fab>

        {/* Dialogs */}
        <UrgentQuestionsDialog />
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSettingsSaved}
        />
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
      
      {/* Global Styles */}
      <style jsx global>{`
        .scroll-to-bottom {
          height: 100%;
          width: 100%;
          overflow-y: auto;
        }
        .hidden-follow-button {
          display: none;
        }
        .scroll-to-bottom::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .scroll-to-bottom::-webkit-scrollbar-track {
          background: ${theme.palette.background.paper};
          border-radius: 10px;
        }
        .scroll-to-bottom::-webkit-scrollbar-thumb {
          background-color: ${theme.palette.grey[400]};
          border-radius: 10px;
          border: 2px solid ${theme.palette.background.paper};
        }
        .scroll-to-bottom::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.palette.grey[500]};
        }
        .scroll-to-bottom {
          scrollbar-width: thin;
          scrollbar-color: ${theme.palette.grey[400]} ${theme.palette.background.paper};
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
