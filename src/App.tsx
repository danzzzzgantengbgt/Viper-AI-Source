import React, { useState, useRef, useEffect } from 'react';
import { 
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  History, 
  Menu, 
  Send, 
  User, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ChevronDown,
  Image as ImageIcon,
  Mic,
  Compass,
  Code,
  Lightbulb,
  LogOut,
  Copy,
  Check,
  Trash2,
  XCircle,
  Square,
  Volume2,
  Pause,
  Play,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Split,
  Layout,
  Download,
  FileCode,
  Folder,
  ChevronUp,
  ExternalLink,
  Laptop,
  Maximize2,
  Minimize2
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getChatResponse, Message, generateTTS, getChatResponseWithFunctionResult } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SUGGESTIONS = [
  { icon: <Compass className="w-5 h-5 text-blue-400" />, text: "Bantu saya merencanakan perjalanan ke Bali" },
  { icon: <Lightbulb className="w-5 h-5 text-yellow-400" />, text: "Berikan ide hadiah untuk ulang tahun ibu" },
  { icon: <Code className="w-5 h-5 text-green-400" />, text: "Jelaskan konsep React Hooks dengan sederhana" },
  { icon: <History className="w-5 h-5 text-purple-400" />, text: "Ringkasan sejarah kemerdekaan Indonesia" },
];

interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

declare global {
  interface Window {
    google: any;
  }
}

const CodeBlock = ({ language, value, filename }: { language: string; value: string; filename?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 rounded-2xl overflow-hidden border border-[#2d2e2f] bg-[#131314] shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e1f20]/50 backdrop-blur-md border-b border-[#2d2e2f]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
          </div>
          {filename ? (
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-gray-300 font-mono">{filename}</span>
            </div>
          ) : (
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{language || 'code'}</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-all bg-[#2d2e2f] px-3 py-1.5 rounded-lg hover:bg-[#37393b]"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            fontSize: '0.875rem',
            backgroundColor: 'transparent',
            lineHeight: '1.6',
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const ProjectExplorer = ({ content }: { content: string }) => {
  const [files, setFiles] = useState<{ name: string; content: string; language: string }[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const regex = /```(\w+):([^\n ]+)\n([\s\S]*?)```/g;
    const matches: { name: string; content: string; language: string }[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({ language: match[1], name: match[2], content: match[3] });
    }
    setFiles(matches);
  }, [content]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  if (files.length === 0) return null;

  const activeFile = files[activeFileIndex];

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.name, file.content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `viper-project-${Date.now()}.zip`);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPreviewHtml = () => {
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) return null;

    let html = htmlFile.content;
    
    // Inject CSS
    files.filter(f => f.name.endsWith('.css')).forEach(cssFile => {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
      } else {
        html = `<style>${cssFile.content}</style>${html}`;
      }
    });

    // Inject JS
    files.filter(f => f.name.endsWith('.js')).forEach(jsFile => {
      if (html.includes('</body>')) {
        html = html.replace('</body>', `<script>${jsFile.content}</script></body>`);
      } else {
        html = `${html}<script>${jsFile.content}</script>`;
      }
    });

    return html;
  };

  const previewHtml = getPreviewHtml();

  return (
    <div className={cn(
      "mt-8 rounded-3xl overflow-hidden border border-[#2d2e2f] bg-[#131314] shadow-2xl flex flex-col transition-all",
      isFullscreen ? "fixed inset-0 z-[100] h-screen rounded-none mt-0" : "h-[450px] md:h-[600px] relative z-10"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 bg-[#1e1f20] border-b border-[#2d2e2f]">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex gap-1.5 px-1 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
          </div>
          <div className="hidden md:block h-4 w-px bg-[#2d2e2f] mx-1 shrink-0" />
          <div className="flex items-center gap-2 truncate">
            <Folder className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm font-bold text-gray-200 tracking-tight truncate">
              {window.innerWidth < 768 ? 'Viper Project' : 'Code Project Explorer'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {previewHtml && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-2 rounded-xl text-xs font-bold transition-all",
                  showPreview ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-[#2d2e2f] text-gray-400 hover:text-white"
                )}
                title={showPreview ? "Show Code" : "Live Preview"}
              >
                {showPreview ? <Code className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                <span className="hidden md:inline">{showPreview ? "Show Code" : "Live Preview"}</span>
              </button>
              
              {showPreview && (
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-2 bg-[#2d2e2f] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span className="hidden md:inline">{isFullscreen ? "Minimize" : "Full Screen"}</span>
                </button>
              )}
            </div>
          )}
          
          <button
            onClick={handleDownloadZip}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
            title="Download ZIP"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Download ZIP</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Tab Bar */}
      {!showPreview && (
        <div className="flex items-center gap-1 px-4 py-2 bg-[#1e1f20]/50 border-b border-[#2d2e2f] overflow-x-auto no-scrollbar scroll-smooth">
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => setActiveFileIndex(idx)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap shrink-0",
                activeFileIndex === idx ? "bg-[#2d2e2f] text-emerald-400 shadow-sm" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <FileCode className={cn("w-3.5 h-3.5", activeFileIndex === idx ? "text-emerald-400" : "text-gray-500")} />
              {file.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden relative group">
        {showPreview ? (
          <iframe
            title="Preview"
            srcDoc={previewHtml || ''}
            className="w-full h-full bg-white border-none"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-full relative overflow-auto custom-scrollbar">
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 z-10 flex items-center gap-1.5 text-[10px] uppercase font-bold text-gray-400 hover:text-white transition-all bg-[#2d2e2f]/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <SyntaxHighlighter
              language={activeFile.language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                fontSize: '13px',
                backgroundColor: 'transparent',
                lineHeight: '1.6',
                height: isFullscreen ? 'auto' : '100%',
                minHeight: '100%'
              }}
            >
              {activeFile.content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      {!isFullscreen && (
        <div className="px-5 py-2.5 bg-[#1e1f20] border-t border-[#2d2e2f] flex justify-between items-center text-[10px] text-gray-500 font-mono">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 uppercase"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" /> UTF-8</span>
            <span className="uppercase">{activeFile.language} Source</span>
          </div>
          <div className="flex gap-4 items-center">
            <span>{activeFile.content.split('\n').length} Lines</span>
            <span>Viper System v1.2</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const savedChats = localStorage.getItem('viper_chats');
    return savedChats ? JSON.parse(savedChats) : [];
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    return localStorage.getItem('viper_active_chat_id');
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{ data: string; mimeType: string; preview: string; transcript?: string } | null>(null);
  const [showTranscript, setShowTranscript] = useState<Record<string, boolean>>({});
  const [activeMessageActions, setActiveMessageActions] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState<string | null>(null);
  const ttsCacheRef = useRef<Record<string, string>>({});
  const [selectedModel, setSelectedModel] = useState<'pro' | 'uncensored' | 'viper' | 'viper-poison'>('pro');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [activeOtpId, setActiveOtpId] = useState<string | null>(null);
  const stopOtpRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile>({
    name: 'User',
    email: 'user@viper.ai',
    picture: 'https://api.dicebear.com/7.x/identicon/svg?seed=aldan'
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persist chats to localStorage
  useEffect(() => {
    localStorage.setItem('viper_chats', JSON.stringify(chats));
  }, [chats]);

  // Persist active chat ID
  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('viper_active_chat_id', activeChatId);
    } else {
      localStorage.removeItem('viper_active_chat_id');
    }
  }, [activeChatId]);

  useEffect(() => {
    // Anti-theft: Disable right-click and common devtools shortcuts
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+Shift+I (Inspect)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Console warning
    console.log('%cSTOP!', 'color: red; font-size: 50px; font-weight: bold; -webkit-text-stroke: 1px black;');
    console.log('%cThis is a browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or "hack" someone\'s account, it is a scam and will give them access to your account.', 'font-size: 16px;');
    console.log('%cSource code access is restricted for security reasons.', 'color: red; font-size: 14px; font-weight: bold;');

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      // Regular STT for input field
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'id-ID';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Browser Anda tidak mendukung pengenalan suara.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!activeChat) return;
    const msgIndex = activeChat.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Find the last user message before this AI message
    let lastUserMsg = null;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (activeChat.messages[i].role === 'user') {
        lastUserMsg = activeChat.messages[i];
        break;
      }
    }

    if (!lastUserMsg) return;

    // Remove all messages from this AI message onwards
    const newMessages = activeChat.messages.slice(0, msgIndex);
    setChats(prev => prev.map(c => 
      c.id === activeChat.id ? { ...c, messages: newMessages } : c
    ));

    // Re-send
    handleSend(lastUserMsg.content);
  };

  const handleNewBranch = (messageId: string) => {
    if (!activeChat) return;
    const msgIndex = activeChat.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const branchedMessages = activeChat.messages.slice(0, msgIndex + 1);
    const newChatId = Date.now().toString();
    const newChat: ChatSession = {
      id: newChatId,
      title: `Cabang: ${activeChat.title}`,
      messages: branchedMessages,
      updatedAt: Date.now(),
    };

    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
  };

  const handleTTS = async (messageId: string, text: string) => {
    if (isSpeaking === messageId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsSpeaking(null);
      }
      return;
    }
    
    // Stop any existing playing and loading
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsSpeaking(null);
    }

    if (ttsCacheRef.current[messageId]) {
      setIsSpeaking(messageId);
      const audio = new Audio(ttsCacheRef.current[messageId]);
      audioPlayerRef.current = audio;
      audio.onended = () => setIsSpeaking(null);
      audio.play().catch(e => {
        console.error("Audio playback failed:", e);
        setIsSpeaking(null);
      });
      return;
    }

    setIsTTSLoading(messageId);
    const result = await generateTTS(text);
    if (result) {
      const { data, mimeType } = result;
      let audioUrl = `data:${mimeType};base64,${data}`;

      // If it's raw PCM, we need to add a WAV header for the browser to play it
      if (mimeType.includes('pcm')) {
        const binaryString = window.atob(data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Add WAV header (16-bit, mono, 24kHz)
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;

        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + bytes.length, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, bytes.length, true);

        const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
        audioUrl = URL.createObjectURL(blob);
      }

      ttsCacheRef.current[messageId] = audioUrl;
      setIsTTSLoading(null);
      setIsSpeaking(messageId);

      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setIsSpeaking(null);
      audio.play().catch(e => {
        console.error("Audio playback failed:", e);
        setIsSpeaking(null);
      });
    } else {
      setIsTTSLoading(null);
      setIsSpeaking(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Teks berhasil disalin!');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Also start SpeechRecognition for transcript
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      let transcript = "";
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.lang = 'id-ID';
        rec.continuous = true;
        rec.onresult = (event: any) => {
          transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
        };
        rec.start();
        (mediaRecorder as any)._recognition = rec;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          setSelectedAudio({
            data: base64,
            mimeType: 'audio/webm',
            preview: URL.createObjectURL(audioBlob),
            transcript: transcript
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if ((mediaRecorder as any)._recognition) {
          (mediaRecorder as any)._recognition.stop();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsRecordingPaused(false);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Gagal mengakses mikrofon.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isRecordingPaused) {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isRecordingPaused) {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsRecordingPaused(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Silakan pilih file gambar.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedImage({
        data: base64,
        mimeType: file.type,
        preview: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    setUser(null);
    setChats([]);
    setActiveChatId(null);
    localStorage.removeItem('viper_chats');
    localStorage.removeItem('viper_active_chat_id');
    localStorage.removeItem('viper_user_profile');
  };

  const handleNewChat = () => {
    setActiveChatId(null);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }
  };

  const handleSend = async (text: string = input) => {
    if ((!text.trim() && !selectedImage && !selectedAudio) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      image: selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined,
      audio: selectedAudio ? { data: selectedAudio.data, mimeType: selectedAudio.mimeType, transcript: selectedAudio.transcript } : undefined
    };

    let currentChatId = activeChatId;
    let currentMessages = messages;

    // If no active chat, create a new one
    if (!currentChatId) {
      currentChatId = Date.now().toString();
      const newChat: ChatSession = {
        id: currentChatId,
        title: text.trim() 
          ? (text.length > 30 ? text.substring(0, 30) + '...' : text)
          : (selectedImage ? 'Gambar' : 'Pesan Suara'),
        messages: [userMessage],
        updatedAt: Date.now(),
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(currentChatId);
      currentMessages = [userMessage];
    } else {
      // Update existing chat
      setChats(prev => prev.map(c => 
        c.id === currentChatId 
          ? { ...c, messages: [...c.messages, userMessage], updatedAt: Date.now() }
          : c
      ));
      currentMessages = [...messages, userMessage];
    }

    const mediaToSend = selectedImage 
      ? { data: selectedImage.data, mimeType: selectedImage.mimeType, mediaType: 'image' as const } 
      : selectedAudio 
        ? { data: selectedAudio.data, mimeType: selectedAudio.mimeType, mediaType: 'audio' as const }
        : undefined;
    
    const promptToSend = text.trim() || (selectedImage ? "Jelaskan gambar ini" : "Apa isi pesan suara ini?");
    
    setInput('');
    setSelectedImage(null);
    setSelectedAudio(null);
    setIsLoading(true);

    const history = currentMessages.map(msg => {
      const parts: any[] = [{ text: msg.content || (msg.image ? "Gambar" : "Pesan Suara") }];
      if (msg.image) {
        parts.push({
          inlineData: {
            data: msg.image.data,
            mimeType: msg.image.mimeType
          }
        });
      }
      if (msg.audio) {
        parts.push({
          inlineData: {
            data: msg.audio.data,
            mimeType: msg.audio.mimeType
          }
        });
      }
      return {
        role: msg.role,
        parts
      };
    });

    const result = await getChatResponse(promptToSend, history, mediaToSend, selectedModel);
    
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: result.text || "Gagal mendapatkan respon.",
    };

    setChats(prev => prev.map(c => 
      c.id === currentChatId 
        ? { ...c, messages: [...c.messages, aiMessage], updatedAt: Date.now() }
        : c
    ));
    setIsLoading(false);
  };



  if (location.pathname === '/credit') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen w-screen bg-[#0a0a0a] text-[#e3e3e3] overflow-y-auto custom-scrollbar selection:bg-blue-500/30 relative"
      >
        {/* Background Decorations */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -mr-64 -mt-64 animate-pulse" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -ml-64 -mb-64 animate-pulse" />
        
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 relative z-10">
          {/* Back Button */}
          <button 
            onClick={() => navigate('/')}
            className="group mb-12 flex items-center gap-3 px-5 py-2.5 bg-[#1e1f20] hover:bg-[#2d2e2f] border border-[#2d2e2f] rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            <span className="text-sm font-bold text-gray-300 group-hover:text-white">Kembali ke Obrolan</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Hero */}
            <div className="lg:col-span-5 space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 via-purple-600 to-red-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-purple-500/20 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h1 className="text-6xl font-black text-white tracking-tighter leading-none mb-4">
                    VIPER <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">CREDIT</span>
                  </h1>
                  <p className="text-xl text-gray-400 font-medium leading-relaxed">
                    Asisten AI masa depan yang dibangun dengan dedikasi oleh <span className="text-white font-bold">aldan</span>.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Developers */}
            <div className="lg:col-span-7 space-y-6">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mb-8 ml-2">The Mastermind</h3>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { name: "aldan", role: "Founder & Lead Architect", desc: "Satu-satunya pengembang utama yang membangun Viper AI dari awal.", color: "from-blue-500 to-blue-400", isMain: true }
                ].map((dev, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="group p-6 rounded-[2rem] border transition-all duration-300 flex items-center gap-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/30 hover:border-blue-500/60"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center shrink-0 shadow-lg">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-2xl font-black text-white truncate">{dev.name}</h4>
                        <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2 text-blue-400">{dev.role}</p>
                      <p className="text-sm text-gray-400">{dev.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-24 pt-12 border-t border-[#2d2e2f] text-center">
            <p className="text-gray-500 text-sm font-medium">
              &copy; 2024 Viper AI. All rights reserved. Powered by <span className="text-white">aldan</span>.
            </p>
          </footer>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] overflow-hidden relative">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 68 }}
        className={cn(
          "bg-[#1e1f20] flex flex-col border-r border-[#2d2e2f] transition-all duration-300 ease-in-out z-30 overflow-hidden",
          "absolute md:relative h-full",
          !isSidebarOpen && "-translate-x-full md:translate-x-0 !w-0 md:!w-[68px] border-none md:border-r"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:block p-2 hover:bg-[#2d2e2f] rounded-full transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-[#2d2e2f] rounded-full transition-colors ml-auto"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-3 mt-4">
          <button 
            onClick={() => {
              handleNewChat();
              if (window.innerWidth < 768) setIsSidebarOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 p-3 bg-[#2d2e2f] hover:bg-[#37393b] rounded-full transition-all",
              isSidebarOpen ? 'w-full px-4' : 'w-10 h-10 justify-center p-0'
            )}
          >
            <Plus className="w-5 h-5 text-gray-400" />
            {isSidebarOpen && <span className="text-sm font-medium">Chat Baru</span>}
          </button>
        </div>

        <div className="flex-1 mt-6 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          <Link 
            to="/"
            className={cn(
              "flex items-center gap-3 p-3 rounded-full transition-colors w-full text-left",
              location.pathname === '/' ? "bg-[#2d2e2f] text-blue-400" : "hover:bg-[#2d2e2f] text-gray-400"
            )}
            onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
          >
            <MessageSquare className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium">Obrolan</span>}
          </Link>
          <Link 
            to="/credit"
            className={cn(
              "flex items-center gap-3 p-3 rounded-full transition-colors w-full text-left",
              location.pathname === '/credit' ? "bg-[#2d2e2f] text-purple-400" : "hover:bg-[#2d2e2f] text-gray-400"
            )}
            onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium">Credit</span>}
          </Link>

          {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-500 mt-6 mb-2 uppercase tracking-widest">Riwayat Chat</p>}
          {chats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => {
                setActiveChatId(chat.id);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveChatId(chat.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }
              }}
              className={cn(
                "flex items-center gap-3 p-3 hover:bg-[#2d2e2f] rounded-full transition-colors w-full text-left group relative cursor-pointer",
                activeChatId === chat.id && "bg-[#2d2e2f]"
              )}
            >
              <MessageSquare className="w-5 h-5 text-gray-400 shrink-0" />
              {isSidebarOpen && (
                <>
                  <span className="text-sm truncate flex-1">{chat.title}</span>
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#37393b] rounded-md transition-all text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#2d2e2f] text-center">
          {isSidebarOpen ? (
            <p className="text-xs text-gray-500 font-medium font-mono uppercase tracking-wider">
              Credit: <span className="text-gray-300 font-bold">aldan</span>
            </p>
          ) : (
            <span className="text-xs text-gray-500 font-bold font-mono">A</span>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0 w-full">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-[#2d2e2f] bg-[#131314]/80 backdrop-blur-md z-20 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-[#2d2e2f] rounded-full transition-colors -ml-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-medium text-gray-200">Viper AI</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-[#2d2e2f]">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-gray-200">{user.name}</p>
                <p className="text-[10px] text-gray-500">{user.email}</p>
              </div>
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full border border-[#2d2e2f]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-8">
          <div className="mx-auto w-full h-full max-w-3xl">
            <Routes>
              <Route path="/" element={
                <>
                  {messages.length === 0 ? (
                    <div className="mt-20">
                      <h1 className="text-5xl font-medium mb-12">
                        <span className="gemini-gradient-text animate-pulse">Halo, {user.name.split(' ')[0]}</span>
                        <br />
                        <span className="text-[#444746]">Ada yang bisa saya bantu hari ini?</span>
                      </h1>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {SUGGESTIONS.map((s, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => handleSend(s.text)}
                            className="p-4 bg-[#1e1f20] hover:bg-[#2d2e2f] rounded-2xl text-left transition-all group relative h-40 flex flex-col justify-between"
                          >
                            <span className="text-sm text-gray-300 leading-relaxed">{s.text}</span>
                            <div className="p-2 bg-[#131314] rounded-full w-fit group-hover:bg-[#1e1f20] transition-colors">
                              {s.icon}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 pb-48 md:pb-32">
                      {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                          {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 via-purple-500 to-red-400 flex items-center justify-center shrink-0 mt-1">
                              <Sparkles className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div 
                            onClick={() => msg.role === 'model' && setActiveMessageActions(activeMessageActions === msg.id ? null : msg.id)}
                            className={cn(
                              "max-w-[85%] min-w-0 cursor-pointer transition-all",
                              msg.role === 'user' ? 'bg-[#2d2e2f] p-4 rounded-2xl' : 'w-full hover:bg-[#1e1f20]/50 p-2 rounded-xl'
                            )}
                          >
                            {msg.image && (
                              <div className="mb-3 rounded-xl overflow-hidden border border-[#37393b]">
                                <img 
                                  src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                                  alt="Sent media" 
                                  className="max-w-full h-auto max-h-80 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            {msg.audio && (
                              <div className="mb-3 p-3 bg-[#1e1f20] rounded-xl border border-[#37393b] flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-[#2d2e2f] rounded-full">
                                    <Volume2 className="w-5 h-5 text-blue-400" />
                                  </div>
                                  <audio 
                                    src={`data:${msg.audio.mimeType};base64,${msg.audio.data}`} 
                                    controls 
                                    className="h-8 flex-1"
                                  />
                                </div>
                                {msg.audio.transcript && (
                                  <div className="mt-2">
                                    <button 
                                      onClick={() => setShowTranscript(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                      className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider font-bold"
                                    >
                                      {showTranscript[msg.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      {showTranscript[msg.id] ? 'Sembunyikan Teks' : 'Lihat Teks'}
                                    </button>
                                    {showTranscript[msg.id] && (
                                      <motion.p 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-2 text-xs text-gray-400 italic bg-[#131314] p-2 rounded-lg border border-[#2d2e2f]"
                                      >
                                        "{msg.audio.transcript}"
                                      </motion.p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {msg.role === 'model' ? (
                              <div className="markdown-content">

                                <div className="markdown-body">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      a({ node, children, href, ...props }: any) {
                                        return (
                                          <a 
                                            href={href} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                            {...props}
                                          >
                                            {children}
                                          </a>
                                        );
                                      },
                                      code({ node, inline, className, children, ...props }: any) {
                                        // Support format: language:filename (e.g. javascript:src/index.js)
                                        const match = /language-([a-zA-Z0-9]+)(?::([^\s]+))?/.exec(className || '');
                                        
                                        // If it has a filename, it's part of a project explorer, so hide it here 
                                        // to avoid duplication since ProjectExplorer will show it
                                        if (!inline && match && match[2]) {
                                          return null;
                                        }

                                        return !inline && match ? (
                                          <CodeBlock
                                            language={match[1]}
                                            filename={match[2]}
                                            value={String(children).replace(/\n$/, '')}
                                          />
                                        ) : (
                                          <code className={cn("px-1.5 py-0.5 rounded bg-[#2d2e2f] text-pink-400 font-mono text-xs", className)} {...props}>
                                            {children}
                                          </code>
                                        );
                                      },
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                  {msg.role === 'model' && (
                                    <ProjectExplorer content={msg.content} />
                                  )}
                                </div>

                              </div>
                            ) : (
                              <div className="text-[16px] leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </div>
                            )}
                            {msg.role === 'model' && activeMessageActions === msg.id && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 flex items-center gap-2 border-t border-[#2d2e2f] pt-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button 
                                  onClick={() => handleTTS(msg.id, msg.content)}
                                  className={cn(
                                    "p-2 hover:bg-[#2d2e2f] rounded-lg transition-colors flex items-center gap-2 text-xs font-medium",
                                    isSpeaking === msg.id ? "text-green-400 bg-green-400/10" : "text-gray-400",
                                    isTTSLoading === msg.id ? "opacity-70 cursor-not-allowed" : ""
                                  )}
                                  title="Dengar Suara"
                                  disabled={isTTSLoading === msg.id}
                                >
                                  {isTTSLoading === msg.id ? (
                                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Volume2 className={cn("w-4 h-4", isSpeaking === msg.id && "animate-pulse")} />
                                  )}
                                  {isTTSLoading === msg.id ? "Memuat..." : (isSpeaking === msg.id ? "Berhenti" : "Suara")}
                                </button>
                                <button 
                                  onClick={() => handleCopy(msg.content)}
                                  className="p-2 hover:bg-[#2d2e2f] rounded-lg transition-colors flex items-center gap-2 text-xs font-medium text-gray-400"
                                  title="Salin Teks"
                                >
                                  <Copy className="w-4 h-4" />
                                  Salin
                                </button>
                                <button 
                                  onClick={() => handleRegenerate(msg.id)}
                                  className="p-2 hover:bg-[#2d2e2f] rounded-lg transition-colors flex items-center gap-2 text-xs font-medium text-gray-400"
                                  title="Coba Lagi"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Coba Lagi
                                </button>
                                <button 
                                  onClick={() => handleNewBranch(msg.id)}
                                  className="p-2 hover:bg-[#2d2e2f] rounded-lg transition-colors flex items-center gap-2 text-xs font-medium text-gray-400"
                                  title="Cabang Baru"
                                >
                                  <Split className="w-4 h-4" />
                                  Cabang
                                </button>
                              </motion.div>
                            )}
                          </div>
                          {msg.role === 'user' && (
                            <img 
                              src={user.picture} 
                              alt={user.name} 
                              className="w-8 h-8 rounded-full border border-[#2d2e2f] shrink-0 mt-1"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 via-purple-500 to-red-400 flex items-center justify-center shrink-0 mt-1 animate-spin">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex gap-1 items-center mt-3">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </>
              } />
            </Routes>
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent z-10">
            <div className="max-w-3xl mx-auto">
              <AnimatePresence>
                {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-3 p-2 bg-[#1e1f20] rounded-2xl border border-[#2d2e2f] w-fit relative group"
                >
                  <img 
                    src={selectedImage.preview} 
                    alt="Selected" 
                    className="h-20 w-auto rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
              {selectedAudio && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-3 p-3 bg-[#1e1f20] rounded-2xl border border-[#2d2e2f] w-fit relative group flex flex-col gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#2d2e2f] rounded-full">
                      <Volume2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <audio src={selectedAudio.preview} controls className="h-8 w-48" />
                    <button 
                      onClick={() => setSelectedAudio(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedAudio.transcript && (
                    <div className="px-1">
                      <button 
                        onClick={() => setShowTranscript(prev => ({ ...prev, preview: !prev.preview }))}
                        className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider font-bold mb-1"
                      >
                        {showTranscript.preview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showTranscript.preview ? 'Sembunyikan Teks' : 'Lihat Teks'}
                      </button>
                      {showTranscript.preview && (
                        <p className="text-xs text-gray-400 italic bg-[#131314] p-2 rounded-lg border border-[#2d2e2f] max-w-[200px]">
                          "{selectedAudio.transcript}"
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              {isRecording && (
                <div className="absolute -top-12 left-0 right-0 flex justify-center gap-4">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg"
                  >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Merekam...
                  </motion.div>
                  <button 
                    onClick={isRecordingPaused ? resumeRecording : pauseRecording}
                    className="bg-[#1e1f20] text-white p-2 rounded-full border border-[#2d2e2f] shadow-lg hover:bg-[#2d2e2f] transition-colors"
                  >
                    {isRecordingPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                </div>
              )}
              <div className="bg-[#1e1f20] relative z-[90] rounded-3xl md:rounded-full flex items-center p-1.5 md:p-2 pl-4 md:pl-6 pr-1.5 md:pr-2 shadow-xl border border-transparent focus-within:border-[#4285f4] transition-all">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageSelect} 
                  accept="image/*" 
                  className="hidden" 
                />
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      if (window.innerWidth < 768) {
                        return; // Let Enter create a newline on mobile
                      }
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isRecording ? "Sedang merekam..." : "Ketik sesuatu di sini..."}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-gray-200 py-3 resize-none max-h-32 md:max-h-40 outline-none overflow-y-auto custom-scrollbar min-w-0 text-sm md:text-base"
                  disabled={isRecording}
                />
                <div className="flex items-center gap-0 md:gap-1 shrink-0">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 md:p-3 hover:bg-[#2d2e2f] rounded-full transition-colors text-gray-400"
                    disabled={isRecording}
                  >
                    <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  
                  <div className="flex items-center">
                    <button 
                      onClick={toggleListening}
                      className={cn(
                        "p-2 md:p-3 rounded-full transition-colors",
                        isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "hover:bg-[#2d2e2f] text-gray-400"
                      )}
                      disabled={isRecording}
                      title="Suara ke Teks"
                    >
                      <Mic className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "p-2 md:p-3 rounded-full transition-colors",
                        isRecording ? "bg-red-500 text-white animate-pulse" : "hover:bg-[#2d2e2f] text-gray-400"
                      )}
                      disabled={isListening}
                      title="Pesan Suara"
                    >
                      {isRecording ? <Square className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                    </button>
                  </div>

                  <button 
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && !selectedImage && !selectedAudio) || isLoading || isRecording}
                    className={cn(
                      "p-2 md:p-3 ml-1 rounded-full transition-all",
                      (input.trim() || selectedImage || selectedAudio) && !isLoading && !isRecording ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#2d2e2f] text-gray-600 cursor-not-allowed'
                    )}
                  >
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-center mt-3 text-gray-500">
              Viper AI dapat menampilkan informasi yang tidak akurat, termasuk tentang orang, jadi periksa kembali responnya. <a href="#" className="underline">Privasi Anda di Aplikasi Viper AI</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
