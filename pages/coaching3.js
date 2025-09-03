// pages/coaching3.js - Enhanced Executive Coaching Assistant with Complete Session Recording (Fixed)
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
  Grow,
  Badge
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
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import TranscribeIcon from '@mui/icons-material/Transcribe';

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

  // Enhanced Session Recording States
  const [sessionRecording, setSessionRecording] = useState({
    sessionId: null,
    startTime: null,
    endTime: null,
    metadata: {
      coachName: '',
      coacheeName: '',
      sessionType: 'executive_coaching',
      language: 'en',
      totalDuration: 0
    },
    transcripts: {
      coach: [],
      coachee: []
    },
    events: [],
    aiInteractions: [],
    topics: [],
    summaries: [],
    statistics: {
      totalWords: { coach: 0, coachee: 0 },
      totalSpeakingTime: { coach: 0, coachee: 0 },
      questionsGenerated: 0,
      topicsDiscussed: 0
    }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

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
  const sessionRecordingRef = useRef(sessionRecording);

  // Update session recording ref when state changes
  useEffect(() => {
    sessionRecordingRef.current = sessionRecording;
  }, [sessionRecording]);

  // Initialize session recording
  const startSessionRecording = () => {
    const startTime = new Date();
    const sessionId = `coaching_${startTime.toISOString().replace(/[:.]/g, '_')}`;
    
    const newSessionRecording = {
      sessionId,
      startTime: startTime.toISOString(),
      endTime: null,
      metadata: {
        coachName: appConfig.coachName || 'Coach',
        coacheeName: appConfig.coacheeName || 'Coachee',
        sessionType: 'executive_coaching',
        language: appConfig.azureLanguage || 'en-US',
        totalDuration: 0
      },
      transcripts: {
        coach: [],
        coachee: []
      },
      events: [{
        type: 'session_started',
        timestamp: startTime.toISOString(),
        description: 'Coaching session recording started'
      }],
      aiInteractions: [],
      topics: [],
      summaries: [],
      statistics: {
        totalWords: { coach: 0, coachee: 0 },
        totalSpeakingTime: { coach: 0, coachee: 0 },
        questionsGenerated: 0,
        topicsDiscussed: 0
      }
    };

    setSessionRecording(newSessionRecording);
    setIsRecording(true);
    setSessionStartTime(startTime);
    showSnackbar('Session recording started', 'success');
  };

  // Stop session recording
  const stopSessionRecording = () => {
    if (!isRecording) return;

    const endTime = new Date();
    const updatedRecording = {
      ...sessionRecording,
      endTime: endTime.toISOString(),
      metadata: {
        ...sessionRecording.metadata,
        totalDuration: Math.floor((endTime - new Date(sessionRecording.startTime)) / 1000)
      },
      events: [
        ...sessionRecording.events,
        {
          type: 'session_ended',
          timestamp: endTime.toISOString(),
          description: 'Coaching session recording stopped'
        }
      ]
    };

    setSessionRecording(updatedRecording);
    setIsRecording(false);
    showSnackbar('Session recording stopped', 'info');
  };

  // Add transcription to session recording
  const addTranscriptionToSession = useCallback((text, source, timestamp = null) => {
    if (!isRecording) return;

    const time = timestamp || new Date().toISOString();
    const words = text.trim().split(/\s+/).length;

    setSessionRecording(prev => {
      const updated = {
        ...prev,
        transcripts: {
          ...prev.transcripts,
          [source]: [
            ...prev.transcripts[source],
            {
              text: text.trim(),
              timestamp: time,
              wordCount: words,
              duration: null // Could be calculated if needed
            }
          ]
        },
        statistics: {
          ...prev.statistics,
          totalWords: {
            ...prev.statistics.totalWords,
            [source]: prev.statistics.totalWords[source] + words
          }
        }
      };
      return updated;
    });
  }, [isRecording]);

  // Add event to session recording
  const addEventToSession = useCallback((type, description, data = null) => {
    if (!isRecording) return;

    setSessionRecording(prev => ({
      ...prev,
      events: [
        ...prev.events,
        {
          type,
          timestamp: new Date().toISOString(),
          description,
          data
        }
      ]
    }));
  }, [isRecording]);

  // Add AI interaction to session recording
  const addAIInteractionToSession = useCallback((question, response, source, questionsGenerated = null) => {
    if (!isRecording) return;

    setSessionRecording(prev => ({
      ...prev,
      aiInteractions: [
        ...prev.aiInteractions,
        {
          timestamp: new Date().toISOString(),
          question: question.trim(),
          response: response.trim(),
          source,
          questionsGenerated,
          questionSource: source === 'suggested' ? 'AI Generated' : source === 'preloaded' ? 'Question Bank' : 'Manual Input'
        }
      ],
      statistics: {
        ...prev.statistics,
        questionsGenerated: questionsGenerated ? prev.statistics.questionsGenerated + questionsGenerated.length : prev.statistics.questionsGenerated
      }
    }));
  }, [isRecording]);

  // Add topic to session recording
  const addTopicToSession = useCallback((topic, context = '') => {
    if (!isRecording) return;

    setSessionRecording(prev => ({
      ...prev,
      topics: [
        ...prev.topics,
        {
          topic: topic.trim(),
          timestamp: new Date().toISOString(),
          context: context.trim(),
          duration: null
        }
      ],
      statistics: {
        ...prev.statistics,
        topicsDiscussed: prev.statistics.topicsDiscussed + 1
      }
    }));
  }, [isRecording]);

  // Export complete session data
  const exportCompleteSession = () => {
    if (!sessionRecording.sessionId) {
      showSnackbar('No session to export', 'warning');
      return;
    }

    // Create comprehensive session export
    const exportData = {
      ...sessionRecording,
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportVersion: '2.0',
        appVersion: '1.0.0'
      },
      fullTranscription: {
        chronological: generateChronologicalTranscription(),
        separated: {
          coach: sessionRecording.transcripts.coach.map(t => t.text).join('\n\n'),
          coachee: sessionRecording.transcripts.coachee.map(t => t.text).join('\n\n')
        }
      },
      analysisData: generateSessionAnalysis()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionRecording.sessionId}_complete_session.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSnackbar('Complete session exported successfully', 'success');
  };

  // Generate chronological transcription
  const generateChronologicalTranscription = () => {
    const allEntries = [];

    // Add transcripts
    sessionRecording.transcripts.coach.forEach(entry => {
      allEntries.push({
        timestamp: entry.timestamp,
        type: 'transcription',
        source: 'coach',
        content: entry.text,
        wordCount: entry.wordCount
      });
    });

    sessionRecording.transcripts.coachee.forEach(entry => {
      allEntries.push({
        timestamp: entry.timestamp,
        type: 'transcription',
        source: 'coachee',
        content: entry.text,
        wordCount: entry.wordCount
      });
    });

    // Add AI interactions
    sessionRecording.aiInteractions.forEach(interaction => {
      allEntries.push({
        timestamp: interaction.timestamp,
        type: 'ai_question',
        source: 'ai',
        content: interaction.question,
        questionSource: interaction.questionSource
      });
      
      allEntries.push({
        timestamp: interaction.timestamp,
        type: 'ai_response',
        source: 'ai',
        content: interaction.response
      });
    });

    // Add events
    sessionRecording.events.forEach(event => {
      allEntries.push({
        timestamp: event.timestamp,
        type: 'event',
        source: 'system',
        content: event.description,
        eventType: event.type,
        data: event.data
      });
    });

    // Add topics
    sessionRecording.topics.forEach(topic => {
      allEntries.push({
        timestamp: topic.timestamp,
        type: 'topic_identified',
        source: 'ai',
        content: topic.topic,
        context: topic.context
      });
    });

    // Sort chronologically
    allEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return allEntries;
  };

  // Generate session analysis
  const generateSessionAnalysis = () => {
    const coachWords = sessionRecording.statistics.totalWords.coach;
    const coacheeWords = sessionRecording.statistics.totalWords.coachee;
    const totalWords = coachWords + coacheeWords;

    return {
      duration: {
        totalSeconds: sessionRecording.metadata.totalDuration,
        formatted: formatDuration(sessionRecording.metadata.totalDuration)
      },
      participation: {
        coachPercentage: totalWords > 0 ? Math.round((coachWords / totalWords) * 100) : 0,
        coacheePercentage: totalWords > 0 ? Math.round((coacheeWords / totalWords) * 100) : 0,
        balance: totalWords > 0 ? (coacheeWords > coachWords ? 'Coachee-led' : coachWords > coacheeWords ? 'Coach-led' : 'Balanced') : 'No data'
      },
      interactions: {
        totalAIInteractions: sessionRecording.aiInteractions.length,
        questionsGenerated: sessionRecording.statistics.questionsGenerated,
        topicsDiscussed: sessionRecording.statistics.topicsDiscussed,
        averageResponseLength: sessionRecording.aiInteractions.length > 0 ? 
          Math.round(sessionRecording.aiInteractions.reduce((sum, int) => sum + int.response.length, 0) / sessionRecording.aiInteractions.length) : 0
      },
      timeline: generateSessionTimeline()
    };
  };

  // Generate session timeline
  const generateSessionTimeline = () => {
    if (!sessionRecording.startTime) return [];

    const startTime = new Date(sessionRecording.startTime);
    const timeline = [];
    const chronological = generateChronologicalTranscription();
    
    chronological.forEach(entry => {
      const entryTime = new Date(entry.timestamp);
      const minutesFromStart = Math.floor((entryTime - startTime) / 60000);
      
      timeline.push({
        minute: minutesFromStart,
        timestamp: entry.timestamp,
        type: entry.type,
        source: entry.source,
        preview: entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '')
      });
    });

    return timeline;
  };

  // Format duration helper
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

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
    addEventToSession('topic_generation_started', 'AI started generating main topic');
    
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
      const newTopic = topicResponse.trim();
      setCurrentMainTopic(newTopic);
      
      // Add to session recording
      addTopicToSession(newTopic, coacheeText.substring(0, 200));
      addEventToSession('topic_generated', `New main topic identified: ${newTopic}`);
      
      // Clear the temporary buffer
      tempSpeechBuffer.current = { coach: '', coachee: '' };
      
    } catch (error) {
      console.error('Error generating main topic:', error);
      showSnackbar('Failed to generate main topic: ' + error.message, 'error');
      addEventToSession('topic_generation_error', `Error generating topic: ${error.message}`);
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
      addEventToSession('audio_started', `${source === 'coach' ? 'Coach' : 'Coachee'} audio recording started`);
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
        
        addEventToSession('audio_stopped', `${source === 'coach' ? 'Coach' : 'Coachee'} audio recording stopped`);
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

    // Add to session recording
    addTranscriptionToSession(cleanText, source);

    // Start dialogue tracking if not already active
    if (!isDialogueActive) {
      setIsDialogueActive(true);
      addEventToSession('dialogue_started', 'Active dialogue detected');
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

    // Add AI processing event to session
    addEventToSession('ai_processing_started', `AI processing ${source} input: ${text.substring(0, 50)}...`);

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

      // Add to session recording
      addAIInteractionToSession(text, streamedResponse, source, suggestedQuestions.length > 0 ? suggestedQuestions : null);
      addEventToSession('ai_response_completed', `AI response generated for ${source} query`);

    } catch (error) {
      console.error("AI request error:", error);
      const errorMessage = `AI request failed: ${error.message || 'Unknown error'}`;
      showSnackbar(errorMessage, 'error');
      dispatch(setAIResponse(`Error: ${errorMessage}`));
      dispatch(addToHistory({ type: 'response', text: `Error: ${errorMessage}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'error' }));
      
      addEventToSession('ai_error', `AI error: ${errorMessage}`);
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
    addEventToSession('questions_generation_started', `Starting generation of ${questionsToGenerate} coaching questions`);
    
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

      // Add to session recording
      addEventToSession('questions_generated', `Generated ${questions.length} coaching questions`, { questions });
      
      showSnackbar(`Generated ${questions.length} coaching question(s)`, 'success');
      
    } catch (error) {
      console.error('Error generating questions:', error);
      showSnackbar('Failed to generate questions: ' + error.message, 'error');
      addEventToSession('questions_generation_error', `Error generating questions: ${error.message}`);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Use a question directly
  const useQuestion = (question) => {
    askAI(question, 'suggested');
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

  // Session Recording Card Component
  const SessionRecordingCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="Session Recording"
        avatar={
          <Badge 
            color={isRecording ? "success" : "default"}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                animation: isRecording ? 'pulse 2s infinite' : 'none'
              }
            }}
          >
            <HistoryIcon />
          </Badge>
        }
        subheader={isRecording ? `Recording for ${formatDuration(dialogueDuration)}` : 'Not recording'}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Export Complete Session">
              <IconButton 
                onClick={exportCompleteSession} 
                disabled={!sessionRecording.sessionId}
                color="primary"
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant={isRecording ? "outlined" : "contained"}
              color={isRecording ? "error" : "success"}
              onClick={isRecording ? stopSessionRecording : startSessionRecording}
              startIcon={<FiberManualRecordIcon />}
              size="small"
            >
              {isRecording ? 'Stop' : 'Start'}
            </Button>
          </Box>
        }
        sx={{ pb: 1 }}
      />
      <CardContent>
        {isRecording && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {sessionRecording.statistics.totalWords.coach}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Coach Words
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="secondary">
                  {sessionRecording.statistics.totalWords.coachee}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Coachee Words
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="info.main">
                  {sessionRecording.statistics.questionsGenerated}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  AI Questions
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Session Progress
              </Typography>
              <LinearProgress 
                variant="indeterminate" 
                sx={{ height: 4, borderRadius: 2 }}
                color="success"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`${sessionRecording.events.length} Events`} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={`${sessionRecording.aiInteractions.length} AI Interactions`} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={`${sessionRecording.topics.length} Topics`} 
                size="small" 
                variant="outlined"
              />
            </Box>
          </>
        )}

        {!isRecording && sessionRecording.sessionId && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <SaveIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              Session Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sessionRecording.statistics.totalWords.coach + sessionRecording.statistics.totalWords.coachee} total words recorded
            </Typography>
          </Box>
        )}

        {!isRecording && !sessionRecording.sessionId && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <TranscribeIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              Ready to Record
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start recording to capture complete session data
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
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

  // Summary Card Component
  const SummaryCard = () => (
    <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="AI Coaching Insights"
        avatar={<PsychologyIcon />}
        subheader="Smart questions generated based on conversation flow"
        sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
      />
      <CardContent sx={{ flexGrow: 1, overflow: 'hidden', p: 0 }}>
        <ScrollToBottom
          className="scroll-to-bottom"
          followButtonClassName="hidden-follow-button"
        >
          <Box sx={{ p: 2 }}>
            {suggestedQuestions.length > 0 ? (
              suggestedQuestions.map((question, index) => (
                <Grow
                  in={true}
                  timeout={500 + (index * 100)}
                  key={`question-${index}`}
                >
                  <Paper 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: index === 0 ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                      borderColor: index === 0 ? 'primary.main' : 'divider',
                      bgcolor: index === 0 ? 'primary.50' : 'background.paper',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[4]
                      }
                    }}
                    elevation={index === 0 ? 3 : 1}
                    onClick={() => useQuestion(question)}
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
              ))
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: 300,
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
          </Box>
        </ScrollToBottom>
      </CardContent>
    </Card>
  );

  // Main Render
  return (
    <>
      <Head>
        <title>Executive Coaching Assistant - Enhanced Session Recording</title>
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
            
            {/* Recording Status */}
            {isRecording && (
              <Chip
                icon={<FiberManualRecordIcon sx={{ animation: 'pulse 2s infinite' }} />}
                label="Recording"
                color="error"
                variant="outlined"
                sx={{ mr: 2 }}
              />
            )}
            
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
            {/* Left Panel - Session Management & Audio Controls */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Session Recording Card */}
              <SessionRecordingCard />
              
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
            <Grid item xs={12} md={9} sx={{ display: 'flex', flexDirection: 'column' }}>
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
                              onClick={() => useQuestion(question)}
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
