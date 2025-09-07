// pages/coaching3.js - Enhanced Coaching Assistant (Apple Style)
import React from 'react';
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
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
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
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';

// MUI Icons
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import FlagIcon from '@mui/icons-material/Flag';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PersonIcon from '@mui/icons-material/Person';
import PsychologyIcon from '@mui/icons-material/Psychology';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import TimerIcon from '@mui/icons-material/Timer';

// Third-party Libraries
import { GoogleGenerativeAI } from '@google/generative-ai';
import throttle from 'lodash.throttle';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';

// Local Imports
import SettingsDialog from '../components/SettingsDialog';
import { clearTranscription, setTranscription } from '../redux/transcriptionSlice';
import { addToHistory } from '../redux/historySlice';
import { getConfig, setConfig as saveConfig, getModelType } from '../utils/config';
import { generateQuestionPrompt, parseQuestions, analyzeDialogueForQuestionStyle } from '../utils/coachingPrompts';

// Apple-style theme colors
const colors = {
  black: '#000000',
  white: '#ffffff',
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  }
};

// Apple-style Styled Components
const AppleAppBar = styled(AppBar)({
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  borderBottom: `1px solid ${colors.gray[200]}`,
  boxShadow: 'none',
});

const AppleButton = styled(Button)({
  borderRadius: '50px',
  padding: '12px 32px',
  fontSize: '0.95rem',
  fontWeight: 500,
  textTransform: 'none',
  boxShadow: 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  }
});

const AppleCard = styled(Card)({
  borderRadius: '16px',
  border: `1px solid ${colors.gray[200]}`,
  boxShadow: 'none',
  backgroundColor: colors.white,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
  }
});

const StatusCard = styled(Paper)({
  padding: '1.5rem',
  textAlign: 'center',
  borderRadius: '12px',
  border: `1px solid ${colors.gray[200]}`,
  boxShadow: 'none',
  transition: 'all 0.3s ease',
  backgroundColor: colors.white,
});

const AppleDialog = styled(Dialog)({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  }
});

const AppleChip = styled(Chip)({
  borderRadius: '50px',
  fontWeight: 500,
  fontSize: '0.85rem',
});

const AppleTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    '& fieldset': {
      borderColor: colors.gray[300],
    },
    '&:hover fieldset': {
      borderColor: colors.gray[400],
    },
    '&.Mui-focused fieldset': {
      borderColor: colors.black,
    },
  },
});

const AppleSelect = styled(Select)({
  borderRadius: '12px',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: colors.gray[300],
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: colors.gray[400],
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: colors.black,
  },
});

const QuestionListItem = styled(ListItem)({
  borderRadius: '8px',
  marginBottom: '8px',
  padding: '12px 16px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: colors.gray[50],
  }
});

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

  // Speaking Status States
  const [isCoacheeSpeaking, setIsCoacheeSpeaking] = useState(false);
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false);

  // AI & Processing States
  const [aiClient, setAiClient] = useState(null);
  const [isAILoading, setIsAILoading] = useState(true);

  // UI States
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Question Generation States
  const [urgentQuestionsDialog, setUrgentQuestionsDialog] = useState(false);
  const [urgentQuestionsCount, setUrgentQuestionsCount] = useState(2);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [dialogueDuration, setDialogueDuration] = useState(0);
  const [isDialogueActive, setIsDialogueActive] = useState(false);

  // Pre-loaded Questions States
  const [preloadedQuestions, setPreloadedQuestions] = useState([
    "What would you like to achieve from this conversation?",
    "What's working well for you right now?",
    "What obstacles are you currently facing?",
    "How do you see this situation differently now?",
    "What would you do if you knew you couldn't fail?",
    "What's one small step you could take today?",
    "What patterns do you notice in your approach?",
    "How has your thinking shifted during our conversation?",
    "What support would be most helpful right now?",
    "What are you learning about yourself through this?"
  ]);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [addQuestionDialog, setAddQuestionDialog] = useState(false);

  // Session Transcription State
  const [sessionTranscript, setSessionTranscript] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Refs
  const coachInterimTranscription = useRef('');
  const coacheeInterimTranscription = useRef('');
  const finalTranscript = useRef({ coach: '', coachee: '' });
  const dialogueTimerRef = useRef(null);
  const lastQuestionTimeRef = useRef(Date.now());
  const dialogueBufferRef = useRef([]);
  const speakingTimerRef = useRef(null);

  // Utility Functions
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = () => setSnackbarOpen(false);

  // Download Transcription Function (CSV and TXT)
  const downloadTranscription = (format = 'csv') => {
    if (sessionTranscript.length === 0) {
      showSnackbar('No transcription data to download', 'warning');
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'csv') {
      // Prepare CSV content
      const csvHeaders = ['Timestamp', 'Elapsed Time (seconds)', 'Speaker', 'Text'];
      const csvRows = sessionTranscript.map(item => {
        const timestamp = new Date(item.timestamp).toLocaleString();
        const elapsedSeconds = sessionStartTime ? 
          Math.floor((item.timestamp - sessionStartTime) / 1000) : 0;
        // Escape quotes in text and wrap in quotes if contains comma
        const escapedText = item.text.replace(/"/g, '""');
        const textCell = escapedText.includes(',') ? `"${escapedText}"` : escapedText;
        
        return [
          timestamp,
          elapsedSeconds,
          item.source.charAt(0).toUpperCase() + item.source.slice(1),
          textCell
        ].join(',');
      });

      content = [csvHeaders.join(','), ...csvRows].join('\n');
      mimeType = 'text/csv;charset=utf-8;';
      filename = 'coaching-session-transcript.csv';
    } else if (format === 'txt') {
      // Prepare TXT content
      const txtContent = sessionTranscript.map(item => {
        const timestamp = new Date(item.timestamp).toLocaleString();
        const speaker = item.source.charAt(0).toUpperCase() + item.source.slice(1);
        return `[${timestamp}] ${speaker}: ${item.text}`;
      }).join('\n\n');

      content = `Coaching Session Transcript\n${'='.repeat(50)}\n\n${txtContent}`;
      mimeType = 'text/plain;charset=utf-8;';
      filename = 'coaching-session-transcript.txt';
    }

    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with date and time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const finalFilename = filename.replace('.', `-${dateStr}-${timeStr}.`);
    
    link.setAttribute('href', url);
    link.setAttribute('download', finalFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSnackbar(`Transcription downloaded as ${format.toUpperCase()}`, 'success');
  };

  // Settings Management
  const handleSettingsSaved = () => {
    const newConfig = getConfig();
    setAppConfig(newConfig);
    setIsAILoading(true);
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

  // Dialogue Timer Management
  useEffect(() => {
    if (isDialogueActive) {
      // Set session start time if not already set
      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
      }
      
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
  }, [isDialogueActive, appConfig, sessionStartTime]);

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

    recognizer.recognizing = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
        const interimText = e.result.text;
        if (source === 'coachee') {
          coacheeInterimTranscription.current = interimText;
          dispatch(setTranscription(finalTranscript.current.coachee + interimText));
          setIsCoacheeSpeaking(true);
          clearTimeout(speakingTimerRef.current);
        } else {
          coachInterimTranscription.current = interimText;
          setCoachTranscription(finalTranscript.current.coach + interimText);
          setIsCoachSpeaking(true);
          clearTimeout(speakingTimerRef.current);
        }
      }
    };

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
        if (source === 'coachee') {
          coacheeInterimTranscription.current = '';
          speakingTimerRef.current = setTimeout(() => setIsCoacheeSpeaking(false), 1000);
        } else {
          coachInterimTranscription.current = '';
          speakingTimerRef.current = setTimeout(() => setIsCoachSpeaking(false), 1000);
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
      return null;
    }
  };

  const stopRecording = async (source) => {
    const recognizer = source === 'coach' ? coachRecognizer : 
                      source === 'coachee' ? coacheeRecognizer : null;
    
    if (recognizer?.stopContinuousRecognitionAsync) {
      try {
        await recognizer.stopContinuousRecognitionAsync();
        if (recognizer.audioConfig?.privSource?.privStream) {
          const stream = recognizer.audioConfig.privSource.privStream;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
        if (recognizer.audioConfig?.close) {
          recognizer.audioConfig.close();
        }
      } catch (error) {
        console.error(`Error stopping ${source} recognition:`, error);
        showSnackbar(`Error stopping ${source} audio: ${error.message}`, 'error');
      } finally {
        if (source === 'coach') {
          setIsCoachMicActive(false);
          setCoachRecognizer(null);
          setIsCoachSpeaking(false);
        } else if (source === 'coachee') {
          setIsCoacheeMicActive(false);
          setCoacheeRecognizer(null);
          setIsCoacheeSpeaking(false);
        } else if (source === 'system') {
          setIsSystemAudioActive(false);
          setCoacheeRecognizer(null);
          setIsCoacheeSpeaking(false);
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
        audio: true,
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

      if (coacheeRecognizer) {
        await stopRecording('system');
      }

      const recognizerInstance = await createRecognizer(mediaStream, 'coachee');
      if (recognizerInstance) {
        setCoacheeRecognizer(recognizerInstance);
        setIsSystemAudioActive(true);
        showSnackbar('System audio recording started for coachee.', 'success');
        mediaStream.getTracks().forEach(track => {
          track.onended = () => {
            showSnackbar('Tab sharing ended.', 'info');
            stopRecording('system');
          };
        });
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      } else {
        setIsCoacheeMicActive(false);
      }
    }
  };

  // Transcription Event Handler - Updated to only capture transcription, no AI commentary
  const handleTranscriptionEvent = (text, source) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    // Validate source
    const validSources = ['coach', 'coachee'];
    let normalizedSource = source.toLowerCase();
    if (!validSources.includes(normalizedSource)) {
      console.warn('Invalid source:', source, 'using coachee as fallback');
      normalizedSource = 'coachee';
    }

    // Start dialogue tracking if not already active
    if (!isDialogueActive) {
      setIsDialogueActive(true);
    }
    
    // Reset the last activity time
    lastQuestionTimeRef.current = Date.now();
    
    // Add to session transcript
    const transcriptEntry = {
      text: cleanText,
      source: normalizedSource,
      timestamp: Date.now(),
      metadata: {
        originalSource: source,
        textLength: cleanText.length,
        capturedAt: new Date().toISOString()
      }
    };
    
    console.log('Adding transcript entry:', {
      source: transcriptEntry.source,
      textLength: transcriptEntry.text.length,
      timestamp: new Date(transcriptEntry.timestamp).toISOString()
    });
    
    setSessionTranscript(prev => [...prev, transcriptEntry]);
    
    // Add to dialogue buffer for context
    dialogueBufferRef.current.push(transcriptEntry);
    
    // Keep only recent dialogue (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    dialogueBufferRef.current = dialogueBufferRef.current.filter(
      item => item.timestamp > fiveMinutesAgo
    );

    // Update transcription display
    finalTranscript.current[normalizedSource] += cleanText + ' ';
    
    if (normalizedSource === 'coachee') {
      dispatch(setTranscription(finalTranscript.current.coachee + coacheeInterimTranscription.current));
    } else {
      setCoachTranscription(finalTranscript.current.coach + coachInterimTranscription.current);
    }

    // Note: Removed automatic AI commentary submission - questions are generated on timer intervals only
  };

  // Question Generation
  const getLanguageInstructions = (azureLanguage) => {
    const languageMap = {
      'en-US': 'English',
      'en-GB': 'English', 
      'it-IT': 'Italian',
      'fr-FR': 'French',
      'es-ES': 'Spanish',
      'de-DE': 'German',
      'pt-PT': 'Portuguese',
      'nl-NL': 'Dutch',
      'ru-RU': 'Russian',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)'
    };
    
    const language = languageMap[azureLanguage] || 'English';
    
    if (language === 'English') {
      return 'Generate questions in English.';
    }
    
    return `Generate questions in ${language}. Ensure the questions are:
- Natural and fluent in ${language}
- Culturally appropriate for ${language}-speaking contexts
- Using proper coaching terminology in ${language}`;
  };

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
    
    const questionStyle = analyzeDialogueForQuestionStyle(dialogueBufferRef.current);
    const languageInstructions = getLanguageInstructions(appConfig.azureLanguage || 'en-US');
    
    const prompt = `As an expert executive coach, generate exactly ${questionsToGenerate} powerful coaching question(s) based on the conversation context provided.

${languageInstructions}

Guidelines for powerful coaching questions:
- Use open-ended questions that cannot be answered with yes/no
- Keep questions short and clear (ideally under 15 words)
- Focus on the coachee's thoughts, feelings, and actions
- Avoid "why" questions when possible (use "what" or "how" instead)
- Include questions that challenge assumptions
- Ensure questions are non-judgmental and curious

Style: ${questionStyle}

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
          system: appConfig.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        });
        questionsResponse = response.content[0].text;
        
      } else if (aiClient.type === 'openai') {
        const response = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages: [
            { role: 'system', content: appConfig.systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        });
        questionsResponse = response.choices[0].message.content;
        
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
          systemInstruction: { parts: [{ text: appConfig.systemPrompt }] }
        });
        const result = await model.generateContent(prompt);
        questionsResponse = result.response.text();
      }
      
      // Parse the questions
      const questions = parseQuestions(questionsResponse, questionsToGenerate);
      
      // Add newest questions to the TOP of the array
      setSuggestedQuestions(prev => [...questions, ...prev]);
      
      // Add to session transcript with questions source
      if (questions.length > 0) {
        const questionsText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
        const questionsEntry = {
          text: `Generated Questions:\n${questionsText}`,
          source: 'questions', // Special source for generated questions
          timestamp: Date.now(),
          metadata: {
            questionsGenerated: questions.length,
            generatedAt: new Date().toISOString(),
            dialogueContext: recentDialogue ? 'Yes' : 'No',
            aiModel: appConfig.aiModel
          }
        };
        
        setSessionTranscript(prev => [...prev, questionsEntry]);
      }
      
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

  // Pre-loaded Questions Management
  const activateQuestion = (question) => {
    if (activeQuestions.length >= 10) {
      showSnackbar('Maximum 10 active questions. Remove one to add another.', 'warning');
      return;
    }
    if (!activeQuestions.includes(question)) {
      setActiveQuestions([...activeQuestions, question]);
    }
  };

  const removeActiveQuestion = (question) => {
    setActiveQuestions(activeQuestions.filter(q => q !== question));
  };

  const addCustomQuestion = () => {
    if (newQuestionText.trim() && preloadedQuestions.length < 20) {
      setPreloadedQuestions([...preloadedQuestions, newQuestionText.trim()]);
      setNewQuestionText('');
      setAddQuestionDialog(false);
    }
  };

  // Component Definitions
  const StatusIndicator = ({ isActive, isSpeaking, title, icon }) => (
    <StatusCard sx={{ 
      bgcolor: isActive ? colors.gray[50] : colors.white,
      borderColor: isActive ? colors.black : colors.gray[200],
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        {React.cloneElement(icon, { sx: { color: isActive ? colors.black : colors.gray[400] } })}
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontWeight: 500,
            color: isActive ? colors.black : colors.gray[600]
          }}
        >
          {title}
        </Typography>
        {isSpeaking && (
          <Box 
            sx={{ 
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'green',
              animation: 'pulse 1s infinite' 
            }} 
          />
        )}
      </Box>
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block', 
          mt: 1,
          color: colors.gray[500],
          fontWeight: 300
        }}
      >
        {isActive ? (isSpeaking ? 'Speaking...' : 'Listening') : 'Inactive'}
      </Typography>
    </StatusCard>
  );

  const UrgentQuestionsDialog = () => (
    <AppleDialog open={urgentQuestionsDialog} onClose={() => setUrgentQuestionsDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LiveHelpIcon sx={{ color: colors.black }} />
          <Typography sx={{ fontWeight: 500 }}>Generate Coaching Questions</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 3, color: colors.gray[600] }}>
          Generate powerful coaching questions based on the current conversation context.
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel sx={{ backgroundColor: colors.white, px: 1 }}>Number of Questions</InputLabel>
          <AppleSelect
            value={urgentQuestionsCount}
            onChange={(e) => setUrgentQuestionsCount(e.target.value)}
            label="Number of Questions"
          >
            <MenuItem value={1}>1 Question - Single focused inquiry</MenuItem>
            <MenuItem value={2}>2 Questions - Balanced exploration</MenuItem>
            <MenuItem value={3}>3 Questions - Multiple perspectives</MenuItem>
          </AppleSelect>
        </FormControl>
        
        {dialogueBufferRef.current.length === 0 && (
          <Alert 
            severity="warning" 
            sx={{ 
              mt: 3,
              borderRadius: '12px',
              '& .MuiAlert-icon': { color: colors.gray[600] }
            }}
          >
            No recent dialogue captured. Questions will be generated based on general coaching principles.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <AppleButton 
          onClick={() => setUrgentQuestionsDialog(false)}
          sx={{ color: colors.gray[600] }}
        >
          Cancel
        </AppleButton>
        <AppleButton 
          onClick={() => {
            generateCoachingQuestions(urgentQuestionsCount);
            setUrgentQuestionsDialog(false);
          }}
          variant="contained"
          disabled={generatingQuestions}
          startIcon={generatingQuestions ? <CircularProgress size={16} /> : <PsychologyIcon />}
          sx={{
            backgroundColor: colors.black,
            color: colors.white,
            '&:hover': {
              backgroundColor: colors.gray[800],
            }
          }}
        >
          Generate Questions
        </AppleButton>
      </DialogActions>
    </AppleDialog>
  );

  const AddQuestionDialog = () => (
    <AppleDialog open={addQuestionDialog} onClose={() => setAddQuestionDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 500 }}>Add Custom Question</DialogTitle>
      <DialogContent>
        <AppleTextField
          fullWidth
          multiline
          rows={3}
          value={newQuestionText}
          onChange={(e) => setNewQuestionText(e.target.value)}
          placeholder="Enter your custom coaching question..."
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <AppleButton 
          onClick={() => setAddQuestionDialog(false)}
          sx={{ color: colors.gray[600] }}
        >
          Cancel
        </AppleButton>
        <AppleButton 
          onClick={addCustomQuestion}
          variant="contained"
          disabled={!newQuestionText.trim()}
          sx={{
            backgroundColor: colors.black,
            color: colors.white,
            '&:hover': {
              backgroundColor: colors.gray[800],
            }
          }}
        >
          Add Question
        </AppleButton>
      </DialogActions>
    </AppleDialog>
  );

  // Main Render
  return (
    <>
      <Head>
        <title>Executive Coaching Assistant - Question Generator</title>
      </Head>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: colors.gray[50] }}>
        <AppleAppBar position="static">
          <Toolbar>
            <SmartToyIcon sx={{ mr: 2, color: colors.black }} />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                color: colors.black,
                fontWeight: 300,
                fontSize: '1.25rem'
              }}
            >
              Question Generator
            </Typography>
            
            {/* Dialogue Duration Indicator */}
            {isDialogueActive && (
              <AppleChip
                icon={<TimerIcon />}
                label={`Session: ${Math.floor(dialogueDuration / 60)}:${(dialogueDuration % 60).toString().padStart(2, '0')}`}
                sx={{ 
                  mr: 2,
                  backgroundColor: colors.black,
                  color: colors.white,
                  '& .MuiChip-icon': { color: colors.white }
                }}
              />
            )}
            
            {/* Download Buttons */}
            <Tooltip title="Download CSV">
              <IconButton 
                onClick={() => downloadTranscription('csv')} 
                disabled={sessionTranscript.length === 0}
                aria-label="download CSV"
                sx={{ mr: 1, color: colors.black }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Download TXT">
              <AppleButton 
                onClick={() => downloadTranscription('txt')} 
                disabled={sessionTranscript.length === 0}
                size="small"
                sx={{ 
                  mr: 2,
                  minWidth: 'auto',
                  padding: '6px 16px',
                  color: colors.black
                }}
              >
                TXT
              </AppleButton>
            </Tooltip>
            
            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)} aria-label="settings" sx={{ color: colors.black }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppleAppBar>

        <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
          <Grid container spacing={3} sx={{ height: '100%' }}>
            {/* Top Row - Status Indicators */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <StatusIndicator
                    isActive={isSystemAudioActive || isCoacheeMicActive}
                    isSpeaking={isCoacheeSpeaking}
                    title="Coachee Status"
                    icon={<RecordVoiceOverIcon />}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatusIndicator
                    isActive={isCoachMicActive}
                    isSpeaking={isCoachSpeaking}
                    title="Coach Status"
                    icon={<PersonIcon />}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatusCard sx={{ 
                    bgcolor: generatingQuestions ? colors.gray[50] : colors.white,
                    borderColor: generatingQuestions ? colors.black : colors.gray[200],
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <SmartToyIcon sx={{ color: generatingQuestions ? colors.black : colors.gray[400] }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 500, color: colors.black }}>
                        Question Generator
                      </Typography>
                      {generatingQuestions && <CircularProgress size={20} sx={{ color: colors.black }} />}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: colors.gray[500], fontWeight: 300 }}>
                      {generatingQuestions ? 'Generating...' : 'Ready'}
                    </Typography>
                  </StatusCard>
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatusCard>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <DownloadIcon sx={{ color: colors.gray[400] }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 500, color: colors.black }}>
                        Session Data
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: colors.gray[500], fontWeight: 300 }}>
                      {sessionTranscript.length} entries captured
                    </Typography>
                  </StatusCard>
                </Grid>
              </Grid>
            </Grid>

            {/* Control Buttons Row */}
            <Grid item xs={12}>
              <AppleCard sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2.4}>
                    <AppleButton
                      onClick={startSystemAudioRecognition}
                      variant="contained"
                      startIcon={isSystemAudioActive ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                      fullWidth
                      sx={{
                        backgroundColor: isSystemAudioActive ? colors.gray[800] : colors.black,
                        color: colors.white,
                        '&:hover': {
                          backgroundColor: isSystemAudioActive ? colors.gray[700] : colors.gray[800],
                        }
                      }}
                    >
                      {isSystemAudioActive ? 'Stop System' : 'System Audio'}
                    </AppleButton>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <AppleButton
                      onClick={() => startMicrophoneRecognition('coach')}
                      variant="contained"
                      startIcon={isCoachMicActive ? <MicOffIcon /> : <MicIcon />}
                      fullWidth
                      sx={{
                        backgroundColor: isCoachMicActive ? colors.gray[800] : colors.black,
                        color: colors.white,
                        '&:hover': {
                          backgroundColor: isCoachMicActive ? colors.gray[700] : colors.gray[800],
                        }
                      }}
                    >
                      {isCoachMicActive ? 'Stop Coach' : 'Coach Mic'}
                    </AppleButton>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <AppleButton
                      onClick={() => generateCoachingQuestions(appConfig.numberOfQuestions)}
                      variant="contained"
                      startIcon={generatingQuestions ? <CircularProgress size={16} color="inherit" /> : <PsychologyIcon />}
                      fullWidth
                      disabled={generatingQuestions || !aiClient || isAILoading}
                      sx={{
                        backgroundColor: colors.black,
                        color: colors.white,
                        '&:hover': {
                          backgroundColor: colors.gray[800],
                        },
                        '&:disabled': {
                          backgroundColor: colors.gray[300],
                          color: colors.gray[500],
                        }
                      }}
                    >
                      {generatingQuestions ? 'Generating...' : 'Generate'}
                    </AppleButton>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <AppleButton
                      onClick={() => downloadTranscription('csv')}
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      fullWidth
                      disabled={sessionTranscript.length === 0}
                      sx={{
                        borderColor: colors.gray[400],
                        color: colors.black,
                        '&:hover': {
                          borderColor: colors.black,
                          backgroundColor: colors.gray[50],
                        }
                      }}
                    >
                      Download CSV
                    </AppleButton>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <AppleButton
                      onClick={() => downloadTranscription('txt')}
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      fullWidth
                      disabled={sessionTranscript.length === 0}
                      sx={{
                        borderColor: colors.gray[400],
                        color: colors.black,
                        '&:hover': {
                          borderColor: colors.black,
                          backgroundColor: colors.gray[50],
                        }
                      }}
                    >
                      Download TXT
                    </AppleButton>
                  </Grid>
                </Grid>
              </AppleCard>
            </Grid>

            {/* Questions Section */}
            <Grid item xs={12} md={8}>
              <AppleCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title={
                    <Typography sx={{ fontWeight: 300, fontSize: '1.25rem', color: colors.black }}>
                      AI Suggested Questions
                    </Typography>
                  }
                  avatar={<QuestionAnswerIcon sx={{ color: colors.black }} />}
                  action={
                    <AppleButton
                      variant="outlined"
                      size="small"
                      onClick={() => setUrgentQuestionsDialog(true)}
                      startIcon={<HelpOutlineIcon />}
                      sx={{
                        borderColor: colors.gray[300],
                        color: colors.black,
                        padding: '6px 16px',
                        '&:hover': {
                          borderColor: colors.black,
                          backgroundColor: colors.gray[50],
                        }
                      }}
                    >
                      Custom
                    </AppleButton>
                  }
                  sx={{ borderBottom: `1px solid ${colors.gray[200]}` }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {suggestedQuestions.length > 0 ? (
                    <List>
                      {suggestedQuestions.map((question, index) => (
                        <QuestionListItem 
                          key={index} 
                          sx={{ 
                            bgcolor: index < 3 ? colors.gray[50] : 'transparent',
                            border: `1px solid ${index < 3 ? colors.gray[300] : 'transparent'}`,
                          }}
                        >
                          <ListItemIcon>
                            <AppleChip 
                              label={`Q${index + 1}`} 
                              size="small" 
                              sx={{
                                backgroundColor: index < 3 ? colors.black : colors.gray[300],
                                color: index < 3 ? colors.white : colors.gray[700],
                                fontWeight: 500,
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={question}
                            primaryTypographyProps={{ 
                              variant: 'body1', 
                              fontWeight: index < 3 ? 500 : 400,
                              color: colors.black
                            }}
                          />
                          <IconButton
                            onClick={() => activateQuestion(question)}
                            size="small"
                            sx={{ 
                              color: colors.gray[600],
                              '&:hover': {
                                color: colors.black,
                                backgroundColor: colors.gray[100],
                              }
                            }}
                          >
                            <AddIcon />
                          </IconButton>
                        </QuestionListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography variant="body2" sx={{ color: colors.gray[500], fontWeight: 300 }}>
                        {generatingQuestions ? 'Generating questions...' : 'No questions generated yet.'}
                      </Typography>
                      {generatingQuestions && <CircularProgress sx={{ mt: 3, color: colors.black }} />}
                      {!generatingQuestions && appConfig.autoSuggestQuestions && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: colors.gray[400] }}>
                          Auto-generation every {appConfig.dialogueListenDuration} seconds
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </AppleCard>
            </Grid>

            {/* Active Questions Section */}
            <Grid item xs={12} md={4}>
              <AppleCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title={
                    <Typography sx={{ fontWeight: 300, fontSize: '1.25rem', color: colors.black }}>
                      Active Questions ({activeQuestions.length}/10)
                    </Typography>
                  }
                  avatar={<CheckCircleIcon sx={{ color: colors.black }} />}
                  action={
                    <AppleButton
                      variant="outlined"
                      size="small"
                      onClick={() => setAddQuestionDialog(true)}
                      startIcon={<AddIcon />}
                      disabled={preloadedQuestions.length >= 20}
                      sx={{
                        borderColor: colors.gray[300],
                        color: colors.black,
                        padding: '6px 16px',
                        '&:hover': {
                          borderColor: colors.black,
                          backgroundColor: colors.gray[50],
                        }
                      }}
                    >
                      Add
                    </AppleButton>
                  }
                  sx={{ borderBottom: `1px solid ${colors.gray[200]}` }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {activeQuestions.length > 0 ? (
                    <List dense>
                      {activeQuestions.map((question, index) => (
                        <QuestionListItem
                          key={index}
                          sx={{ 
                            bgcolor: colors.gray[50],
                            border: `1px solid ${colors.gray[300]}`,
                            cursor: 'pointer',
                            '&:hover': { 
                              bgcolor: colors.gray[100],
                              borderColor: colors.black,
                            }
                          }}
                          onClick={() => removeActiveQuestion(question)}
                        >
                          <ListItemText
                            primary={question}
                            primaryTypographyProps={{ 
                              variant: 'body2',
                              color: colors.black,
                              fontWeight: 400
                            }}
                          />
                          <IconButton size="small" sx={{ color: colors.gray[500] }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </QuestionListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: colors.gray[500], fontWeight: 300 }}>
                        No active questions. Click "Add" or use the "+" button.
                      </Typography>
                    </Box>
                  )}
                  
                  {preloadedQuestions.length > 0 && (
                    <>
                      <Divider sx={{ my: 2, borderColor: colors.gray[200] }} />
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500, color: colors.black }}>
                        Available Questions
                      </Typography>
                      <List dense>
                        {preloadedQuestions.slice(0, 5).map((question, index) => (
                          <ListItem
                            key={index}
                            sx={{ 
                              cursor: 'pointer',
                              borderRadius: '6px',
                              '&:hover': { bgcolor: colors.gray[50] },
                              opacity: activeQuestions.includes(question) ? 0.5 : 1
                            }}
                            onClick={() => activateQuestion(question)}
                            disabled={activeQuestions.includes(question)}
                          >
                            <ListItemText
                              primary={question}
                              primaryTypographyProps={{ 
                                variant: 'caption',
                                color: colors.gray[600],
                                fontWeight: 300
                              }}
                            />
                          </ListItem>
                        ))}
                        {preloadedQuestions.length > 5 && (
                          <ListItem>
                            <ListItemText
                              primary={`... and ${preloadedQuestions.length - 5} more`}
                              primaryTypographyProps={{ 
                                variant: 'caption', 
                                fontStyle: 'italic',
                                color: colors.gray[400]
                              }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </>
                  )}
                </CardContent>
              </AppleCard>
            </Grid>
          </Grid>
        </Container>

        {/* Dialogs */}
        <UrgentQuestionsDialog />
        <AddQuestionDialog />
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSettingsSaved}
        />
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbarSeverity} 
            sx={{ 
              width: '100%',
              borderRadius: '12px',
              '& .MuiAlert-icon': {
                color: snackbarSeverity === 'error' ? 'error.main' : 
                       snackbarSeverity === 'warning' ? 'warning.main' : 
                       snackbarSeverity === 'success' ? 'success.main' : 'info.main'
              }
            }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
      
      {/* Global Styles */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}
