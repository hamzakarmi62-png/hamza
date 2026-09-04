import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { sleep, uid } from "../utils.js";

const ACCEPTED = ".mp3,.wav,.m4a,.ogg,.mp4,.webm,.mkv,.avi";

const TRANSLATIONS = {
  ar: {
    title: "Transcription Studio Pro",
    subtitle: "نظام إدارة وتحليل التفريغ الصوتي بالذكاء الاصطناعي",
    navHome: "الرئيسية والتحليلات",
    navTranscribe: "تسجيل وتحويل جديد",
    navMyFiles: "ملفاتي والمجلدات",
    navArchive: "أرشيف الجلسات",
    navSettings: "إعدادات النظام",
    totalSessions: "إجمالي الجلسات",
    completedSessions: "الجلسات المكتملة",
    totalSegments: "إجمالي المقاطع",
    systemStatus: "حالة النظام",
    connected: "متصل وعمليات مستقرة",
    uploadTitle: "اسحب ملف الصوت أو الفيديو هنا",
    uploadDesc: "يدعم صيغ: MP3, WAV, M4A, OGG, MP4, MKV (الملفات الكبيرة مقبولة)",
    browse: "تصفح الملفات",
    orRecord: "أو التسجيل المباشر",
    recordMic: "بدء التسجيل المباشر بالميكروفون",
    recording: "جاري التسجيل المباشر…",
    stopRecord: "إيقاف التسجيل",
    discardRecord: "حذف",
    reRecord: "إعادة",
    aiOptions: "خيارات نموذج الذكاء الاصطناعي",
    audioLang: "لغة الملف الصوتي",
    expectedSpeakers: "عدد المتحدثين",
    autoSpeakers: "التحديد التلقائي للمتحدثين (Diarization)",
    startTranscribe: "بدء المعالجة والتفريغ الفوري",
    processing: "جاري المعالجة والتحليل بالذكاء الاصطناعي (الملفات الكبيرة تستغرق وقتاً أطول للاستفادة من الدقة العالية)...",
    transcribingMsg: "جاري التفريغ الصوتي (Whisper)... قد يستغرق دقيقة أو أكثر للملفات الكبيرة.",
    diarizingMsg: "جاري تصنيف وتمييز المتحدثين...",
    searchPlaceholder: "بحث شامل في الملفات...",
    allStatus: "جميع الحالات",
    completedOnly: "المكتملة فقط",
    processingStatus: "قيد المعالجة",
    archiveTitle: "أرشيف العمليات والجلسات",
    archiveDesc: "سجل كامل لجميع عمليات التفريغ السابقة مع إمكانية التصدير والبحث",
    openSession: "فتح واستعراض الملف ←",
    delete: "حذف",
    myFilesTitle: "إدارة المجلدات والملفات المخصصة",
    myFilesDesc: "نظم تفريغاتك داخل مجلدات مسمّاة لضمان عدم حدوث أي خلط في بياناتك",
    createNewFolder: "إنشاء مجلد جديد +",
    folderPrompt: "أدخل اسم المجلد الجديد (مثال: مقابلات العملاء، محاضرات جامعية):",
    allFiles: "جميع الملفات المحفوظة",
    moveToFolder: "نقل إلى مجلد:",
    noFolder: "بدون مجلد رئيسي",
    addToCustom: "إضافة للمفضلة / ملفاتي",
    removeFromCustom: "إزالة من ملفاتي",
    renameFile: "تسمية",
    renamePrompt: "أدخل الاسم المخصص لهذا الملف:",
    settingsTitle: "إعدادات المظهر واللغة والنظام",
    autoSave: "الحفظ التلقائي",
    autoSaveDesc: "حفظ التعديلات والتصحيحات النصية لحظياً",
    themeMode: "مظهر الشاشة",
    darkMode: "الوضع المظلم (Dark)",
    lightMode: "الوضع الفاتح (Light)",
    languageUi: "لغة واجهة لوحة التحكم",
    quickActions: "الإجراءات السريعة",
    recentFiles: "أحدث الملفات المضافة",
    welcomeBack: "مرحباً بك في لوحة تحكم استوديو التفريغ الصوتي",
    welcomeDesc: "استخدم الذكاء الاصطناعي لتحويل وتسجيل وتحليل الملفات الصوتية والمرئية وتنظيمها في مجلدات مخصصة بكل احترافية.",
    startNewTranscribe: "🎙️ بدء تحويل جديد",
    browseMyFiles: "📁 استعراض ملفاتي",
    favoriteFiles: "الملفات المفضلة والأعمال الخاصة",
    viewAll: "عرض الكل ←",
    noFavorites: "لا توجد ملفات مفضلة محفوظة حالياً",
    availableFolders: "المجلدات المتاحة",
    open: "فتح",
    noFilesFolder: "لا توجد ملفات في هذا المجلد حالياً.",
    noFilesFolderDesc: "انقر على أيقونة النجمة (⭐) في الأرشيف لحفظ الملفات هنا ونقلها بين المجلدات.",
    folderLabel: "📂 المجلد:",
    systemState: "حالة النظام",
    active: "نشط",
    largeFileTip: "💡 ملاحظة: معالجة الملفات الكبيرة قد تستغرق بضع دقائق نظراً للتحليل الصوتي العميق محلياً. يرجى الانتظار وعدم إغلاق الصفحة.",
  },
  en: {
    title: "Transcription Studio Pro",
    subtitle: "Enterprise AI Speech Transcription & Analysis Suite",
    navHome: "Dashboard & Overview",
    navTranscribe: "New Transcription",
    navMyFiles: "My Files & Folders",
    navArchive: "Sessions Archive",
    navSettings: "System Settings",
    totalSessions: "Total Sessions",
    completedSessions: "Completed",
    totalSegments: "Total Segments",
    systemStatus: "System Status",
    connected: "Online & Stable",
    uploadTitle: "Drag & drop audio or video file here",
    uploadDesc: "Supports: MP3, WAV, M4A, OGG, MP4, MKV (Large files supported)",
    browse: "Browse Files",
    orRecord: "or direct recording",
    recordMic: "Start Live Microphone Recording",
    recording: "Recording live...",
    stopRecord: "Stop Recording",
    discardRecord: "Discard",
    reRecord: "Re-record",
    aiOptions: "AI Model Options",
    audioLang: "Audio Language",
    expectedSpeakers: "Expected Speakers",
    autoSpeakers: "Automatic Speaker Detection (Diarization)",
    startTranscribe: "Start Transcription & Analysis",
    processing: "Processing large file with AI (may take a few minutes for deep analysis)...",
    transcribingMsg: "Running speech recognition (Whisper)... Large files take a bit longer.",
    diarizingMsg: "Detecting and separating speakers...",
    searchPlaceholder: "Global search across files...",
    allStatus: "All Statuses",
    completedOnly: "Completed Only",
    processingStatus: "Processing",
    archiveTitle: "Operations & Sessions Archive",
    archiveDesc: "Complete history of previous transcriptions with export & search",
    openSession: "Open & Review File →",
    delete: "Delete",
    myFilesTitle: "Custom Folders & Files Manager",
    myFilesDesc: "Organize transcriptions into named folders to prevent any confusion",
    createNewFolder: "+ New Folder",
    folderPrompt: "Enter new folder name (e.g., Client Interviews):",
    allFiles: "All Saved Files",
    moveToFolder: "Move to folder:",
    noFolder: "No Folder (Root)",
    addToCustom: "Add to My Files",
    removeFromCustom: "Remove from My Files",
    renameFile: "Rename",
    renamePrompt: "Enter custom name for this file:",
    settingsTitle: "Theme, Language & System Settings",
    autoSave: "Auto-Save",
    autoSaveDesc: "Automatically save text edits instantly",
    themeMode: "Display Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    languageUi: "Dashboard UI Language",
    quickActions: "Quick Actions",
    recentFiles: "Recent Files",
    welcomeBack: "Welcome to your Professional Transcription Control Panel",
    welcomeDesc: "Use artificial intelligence to transcribe, record, and analyze audio and video files and organize them into custom folders.",
    startNewTranscribe: "🎙️ Start New Transcription",
    browseMyFiles: "📁 Browse My Files",
    favoriteFiles: "Favorite Files & Custom Works",
    viewAll: "View All →",
    noFavorites: "No favorite files saved yet",
    availableFolders: "Available Folders",
    open: "Open",
    noFilesFolder: "No files in this folder yet.",
    noFilesFolderDesc: "Click the star icon (⭐) in the archive to save files here and organize them.",
    folderLabel: "📂 Folder:",
    systemState: "System State",
    active: "Active",
    largeFileTip: "💡 Tip: Large files may take a few minutes to process locally due to deep AI speech analysis. Please keep the page open.",
  },
  fr: {
    title: "Studio de Transcription Pro",
    subtitle: "Suite Enterprise de Transcription & Analyse Vocale par IA",
    navHome: "Tableau de Bord",
    navTranscribe: "Nouvelle Transcription",
    navMyFiles: "Mes Fichiers & Dossiers",
    navArchive: "Archive des Sessions",
    navSettings: "Paramètres Système",
    totalSessions: "Total Sessions",
    completedSessions: "Terminées",
    totalSegments: "Total Segments",
    systemStatus: "État Système",
    connected: "En Ligne & Stable",
    uploadTitle: "Glissez-déposez un fichier audio ou vidéo",
    uploadDesc: "Supporte : MP3, WAV, M4A, OGG, MP4, MKV (Gros fichiers acceptés)",
    browse: "Parcourir",
    orRecord: "ou enregistrement direct",
    recordMic: "Enregistrement Micro en Direct",
    recording: "Enregistrement en cours...",
    stopRecord: "Arrêter l'enregistrement",
    discardRecord: "Supprimer",
    reRecord: "Réenregistrer",
    aiOptions: "Options du Modèle IA",
    audioLang: "Langue Audio",
    expectedSpeakers: "Locuteurs Attendus",
    autoSpeakers: "Détection Automatique des Locuteurs",
    startTranscribe: "Démarrer la Transcription",
    processing: "Traitement des fichiers volumineux par l'IA (cela peut prendre quelques minutes)...",
    transcribingMsg: "Transcription en cours (Whisper)... Les gros fichiers nécessitent un peu plus de temps.",
    diarizingMsg: "Sélection et séparation des locuteurs...",
    searchPlaceholder: "Recherche globale...",
    allStatus: "Tous les statuts",
    completedOnly: "Terminés uniquement",
    processingStatus: "En cours",
    archiveTitle: "Archive des Sessions",
    archiveDesc: "Historique complet des transcriptions précédentes",
    openSession: "Ouvrir le fichier →",
    delete: "Supprimer",
    myFilesTitle: "Gestionnaire de Dossiers & Fichiers",
    myFilesDesc: "Organisez vos transcriptions dans des dossiers nommés",
    createNewFolder: "+ Nouveau Dossier",
    folderPrompt: "Entrez le nom du nouveau dossier (ex: Réunions, Cours) :",
    allFiles: "Tous les Fichiers",
    moveToFolder: "Déplacer vers :",
    noFolder: "Sans dossier",
    addToCustom: "Ajouter aux favoris",
    removeFromCustom: "Retirer des favoris",
    renameFile: "Renommer",
    renamePrompt: "Entrez le nouveau nom personnalisé :",
    settingsTitle: "Paramètres du Système, Langue & Thème",
    autoSave: "Sauvegarde Automatique",
    autoSaveDesc: "Sauvegarder automatiquement les modifications",
    themeMode: "Mode d'Affichage",
    darkMode: "Mode Sombre",
    lightMode: "Mode Clair",
    languageUi: "Langue de l'Interface",
    quickActions: "Actions Rapides",
    recentFiles: "Fichiers Récents",
    welcomeBack: "Bienvenue dans votre Studio de Transcription",
    welcomeDesc: "Utilisez l'intelligence artificielle pour transcrire, enregistrer et analyser vos fichiers audio et vidéo avec précision.",
    startNewTranscribe: "🎙️ Démarrer une transcription",
    browseMyFiles: "📁 Parcourir mes fichiers",
    favoriteFiles: "Fichiers Favoris & Travaux",
    viewAll: "Voir tout →",
    noFavorites: "Aucun fichier favori pour le moment",
    availableFolders: "Dossiers Disponibles",
    open: "Ouvrir",
    noFilesFolder: "Aucun fichier dans ce dossier pour le moment.",
    noFilesFolderDesc: "Cliquez sur l'icône étoile (⭐) dans l'archive pour enregistrer des fichiers ici.",
    folderLabel: "📂 Dossier :",
    systemState: "État du système",
    active: "Actif",
    largeFileTip: "💡 Conseil : Le traitement des gros fichiers peut prendre quelques minutes en raison de l'analyse IA locale en profondeur. Veuillez patienter.",
  },
};

const LANGUAGES = [
  { value: "", label: "Auto-detect / Détection auto" },
  { value: "ar", label: "Arabic (العربية)" },
  { value: "en", label: "English" },
  { value: "fr", label: "French (Français)" },
  { value: "es", label: "Spanish (Español)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "tr", label: "Turkish (Türkçe)" },
];

export default function UploadScreen({ onComplete }) {
  const [activeTab, setActiveTab] = useState("home"); // home | transcribe | myFiles | archive | settings
  const [uiLang, setUiLang] = useState("fr"); // ar | en | fr (Default to French)
  const [theme, setTheme] = useState("dark"); // dark | light

  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("");
  const [detectSpeakers, setDetectSpeakers] = useState(true);
  const [numSpeakers, setNumSpeakers] = useState(2);
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);
  
  const [customWorkIds, setCustomWorkIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("custom_works") || "[]");
    } catch {
      return [];
    }
  });

  const [customFileNames, setCustomFileNames] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("custom_file_names") || "{}");
    } catch {
      return {};
    }
  });

  const [folders, setFolders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("custom_folders") || '[{"id":"default","name":"Général / General"}]');
    } catch {
      return [{ id: "default", name: "Général / General" }];
    }
  });

  const [sessionFolderMap, setSessionFolderMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("session_folder_map") || "{}");
    } catch {
      return {};
    }
  });

  const [selectedFolderFilter, setSelectedFolderFilter] = useState("all");
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [systemHealth, setSystemHealth] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recUrl, setRecUrl] = useState(null);
  const [recBlob, setRecBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const t = TRANSLATIONS[uiLang] || TRANSLATIONS.fr;

  const loadSessions = useCallback(async () => {
    try {
      const list = await api.listSessions();
      setSessions(list);
    } catch {
      /* ignore */
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const h = await api.getHealth();
      setSystemHealth(h);
    } catch {
      setSystemHealth({ status: "offline" });
    }
  }, []);

  useEffect(() => {
    loadSessions();
    checkHealth();
  }, [loadSessions, checkHealth]);

  useEffect(() => {
    try {
      localStorage.setItem("custom_works", JSON.stringify(customWorkIds));
    } catch {
      /* ignore */
    }
  }, [customWorkIds]);

  useEffect(() => {
    try {
      localStorage.setItem("custom_file_names", JSON.stringify(customFileNames));
    } catch {
      /* ignore */
    }
  }, [customFileNames]);

  useEffect(() => {
    try {
      localStorage.setItem("custom_folders", JSON.stringify(folders));
    } catch {
      /* ignore */
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem("session_folder_map", JSON.stringify(sessionFolderMap));
    } catch {
      /* ignore */
    }
  }, [sessionFolderMap]);

  const toggleCustomWork = (e, id) => {
    e.stopPropagation();
    setCustomWorkIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (!prev.includes(id) && !customFileNames[id]) {
        const session = sessions.find((s) => s.id === id);
        const defaultName = session ? session.filename : "My File";
        const customName = prompt(t.renamePrompt, defaultName);
        if (customName && customName.trim()) {
          setCustomFileNames((fn) => ({ ...fn, [id]: customName.trim() }));
        }
      }
      return next;
    });
  };

  const handleRename = (e, id) => {
    e.stopPropagation();
    const currentName = customFileNames[id] || sessions.find((s) => s.id === id)?.filename || "";
    const newName = prompt(t.renamePrompt, currentName);
    if (newName !== null && newName.trim()) {
      setCustomFileNames((fn) => ({ ...fn, [id]: newName.trim() }));
    }
  };

  const handleCreateFolder = () => {
    const folderName = prompt(t.folderPrompt);
    if (folderName && folderName.trim()) {
      const newFolder = { id: uid(), name: folderName.trim() };
      setFolders((prev) => [...prev, newFolder]);
    }
  };

  const handleMoveToFolder = (sessionId, folderId) => {
    setSessionFolderMap((prev) => ({ ...prev, [sessionId]: folderId }));
  };

  const resetRecording = () => {
    setRecording(false);
    setRecSeconds(0);
    setRecUrl(null);
    setRecBlob(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mime || recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setRecBlob(blob);
        setRecUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError("Microphone access denied: " + e.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => () => resetRecording(), []);

  const selectedBlob = file || recBlob;

  const pollStatus = async (id, target) => {
    for (;;) {
      await sleep(1500);
      const s = await api.getSession(id);
      if (s.status === "error") throw new Error(s.error || "Processing failed");
      if (s.status === target) return s;
    }
  };

  const handleProcess = async () => {
    if (!selectedBlob) return;
    setError("");
    setMessage("");
    try {
      setPhase("uploading");
      setProgress(0);
      const session = await api.upload(selectedBlob, setProgress);

      setPhase("transcribing");
      setMessage(t.transcribingMsg);
      await api.startTranscribe(session.id, language);
      await pollStatus(session.id, "transcribed");

      setPhase("diarizing");
      setMessage(t.diarizingMsg);
      await api.startDiarize(session.id, detectSpeakers ? numSpeakers : 1);
      await pollStatus(session.id, "done");

      const full = await api.getSession(session.id);
      setPhase("done");
      await loadSessions();
      onComplete(full);
    } catch (e) {
      setPhase("error");
      setError(e.message || "Something went wrong");
    }
  };

  const openSession = (s) => {
    setError("");
    setPhase("done");
    onComplete(s);
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await api.deleteSession(id);
      setCustomWorkIds((prev) => prev.filter((i) => i !== id));
      setCustomFileNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSessionFolderMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      loadSessions();
    } catch {
      /* ignore */
    }
  };

  const busy = phase === "uploading" || phase === "transcribing" || phase === "diarizing";
  const hasAudio = !!selectedBlob;

  const totalSessionsCount = sessions.length;
  const completedSessionsCount = sessions.filter((s) => s.status === "done").length;
  const totalSegmentsCount = sessions.reduce((acc, s) => acc + (s.segments?.length || 0), 0);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = (customFileNames[s.id] || s.filename || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const customWorksSessions = sessions.filter((s) => customWorkIds.includes(s.id));
  const folderFilteredSessions =
    selectedFolderFilter === "all"
      ? customWorksSessions
      : customWorksSessions.filter((s) => (sessionFolderMap[s.id] || "default") === selectedFolderFilter);

  // Theme styling variables
  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900";
  const bgSidebar = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm";
  const bgHeader = isDark ? "bg-slate-900/90 border-slate-800 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-sm";
  const bgCard = isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm";
  const textSub = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900";

  return (
    <div className={`min-h-screen ${bgMain} flex flex-col lg:flex-row transition-colors duration-200`} dir={uiLang === "ar" ? "rtl" : "ltr"}>
      {/* Enterprise Sidebar Navigation */}
      <aside className={`w-full lg:w-72 ${bgSidebar} border-b lg:border-b-0 lg:border-r flex flex-col shrink-0 z-30`}>
        <div className="p-6 border-b border-inherit flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30">
            🎙️
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Studio Pro</h1>
            <p className={`text-[11px] ${textSub}`}>Enterprise Transcription</p>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="p-4 space-y-1.5 flex-1">
          <button
            onClick={() => setActiveTab("home")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "home"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : `${textSub} hover:bg-slate-800/50 hover:text-white`
            }`}
          >
            <span className="text-base">🏠</span>
            <span>{t.navHome}</span>
          </button>
          <button
            onClick={() => setActiveTab("transcribe")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "transcribe"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : `${textSub} hover:bg-slate-800/50 hover:text-white`
            }`}
          >
            <span className="text-base">🎙️</span>
            <span>{t.navTranscribe}</span>
          </button>
          <button
            onClick={() => setActiveTab("myFiles")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "myFiles"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : `${textSub} hover:bg-slate-800/50 hover:text-white`
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>{t.navMyFiles}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
              {customWorksSessions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("archive")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "archive"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : `${textSub} hover:bg-slate-800/50 hover:text-white`
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">📁</span>
              <span>{t.navArchive}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300">
              {sessions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "settings"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : `${textSub} hover:bg-slate-800/50 hover:text-white`
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>{t.navSettings}</span>
          </button>
        </nav>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-inherit">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-[11px] space-y-1">
            <div className="flex items-center justify-between font-medium">
              <span className="text-slate-400">{t.systemState}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {systemHealth ? systemHealth.status : t.active}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Whisper Local Engine v2</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className={`${bgHeader} backdrop-blur border-b sticky top-0 z-20 px-6 py-4 flex items-center justify-between gap-4 flex-wrap`}>
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-xl border ps-9 pe-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <select
              value={uiLang}
              onChange={(e) => setUiLang(e.target.value)}
              className={`text-xs rounded-xl px-2.5 py-2 border font-medium focus:outline-none ${inputBg}`}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`text-xs px-3 py-2 rounded-xl border font-medium flex items-center gap-1.5 transition-all ${
                isDark ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {isDark ? "☀️ Clair" : "🌙 Sombre"}
            </button>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
          {/* Statistics Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${bgCard} backdrop-blur rounded-2xl p-5 shadow-sm border flex items-center gap-4`}>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
                📊
              </div>
              <div>
                <p className={`text-xs ${textSub} font-medium`}>{t.totalSessions}</p>
                <h3 className="text-2xl font-bold mt-0.5">{totalSessionsCount}</h3>
              </div>
            </div>
            <div className={`${bgCard} backdrop-blur rounded-2xl p-5 shadow-sm border flex items-center gap-4`}>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
                ✅
              </div>
              <div>
                <p className={`text-xs ${textSub} font-medium`}>{t.completedSessions}</p>
                <h3 className="text-2xl font-bold mt-0.5">{completedSessionsCount}</h3>
              </div>
            </div>
            <div className={`${bgCard} backdrop-blur rounded-2xl p-5 shadow-sm border flex items-center gap-4`}>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
                📝
              </div>
              <div>
                <p className={`text-xs ${textSub} font-medium`}>{t.totalSegments}</p>
                <h3 className="text-2xl font-bold mt-0.5">{totalSegmentsCount}</h3>
              </div>
            </div>
            <div className={`${bgCard} backdrop-blur rounded-2xl p-5 shadow-sm border flex items-center gap-4`}>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                🟢
              </div>
              <div>
                <p className={`text-xs ${textSub} font-medium`}>{t.systemStatus}</p>
                <h3 className="text-sm font-bold text-emerald-500 mt-1 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t.connected}
                </h3>
              </div>
            </div>
          </div>

          {/* Home / Dashboard Overview Tab */}
          {activeTab === "home" && (
            <div className="space-y-8">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-3xl p-8 shadow-xl flex items-center justify-between flex-wrap gap-6">
                <div className="space-y-2 max-w-xl">
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur">
                    Enterprise AI Workspace
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight">{t.welcomeBack}</h2>
                  <p className="text-sm text-blue-100">
                    {t.welcomeDesc}
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setActiveTab("transcribe")}
                    className="px-6 py-3 rounded-2xl bg-white text-blue-900 font-bold text-sm hover:bg-blue-50 shadow-lg transition-all"
                  >
                    {t.startNewTranscribe}
                  </button>
                  <button
                    onClick={() => setActiveTab("myFiles")}
                    className="px-6 py-3 rounded-2xl bg-blue-700/60 border border-white/30 text-white font-bold text-sm hover:bg-blue-700 backdrop-blur transition-all"
                  >
                    {t.browseMyFiles}
                  </button>
                </div>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`${bgCard} border rounded-2xl p-6 shadow-sm space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <span>⭐</span> {t.favoriteFiles} ({customWorksSessions.length})
                    </h3>
                    <button onClick={() => setActiveTab("myFiles")} className="text-xs text-blue-500 font-semibold hover:underline">
                      {t.viewAll}
                    </button>
                  </div>
                  {customWorksSessions.length === 0 ? (
                    <p className={`text-xs ${textSub} py-6 text-center`}>{t.noFavorites}</p>
                  ) : (
                    <div className="space-y-2">
                      {customWorksSessions.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          onClick={() => openSession(s)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:border-blue-500 transition-all ${inputBg}`}
                        >
                          <span className="font-medium text-xs truncate">🏷️ {customFileNames[s.id] || s.filename}</span>
                          <span className="text-[10px] text-blue-400">{t.open} ↗</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${bgCard} border rounded-2xl p-6 shadow-sm space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <span>📁</span> {t.availableFolders} ({folders.length})
                    </h3>
                    <button onClick={handleCreateFolder} className="text-xs text-amber-500 font-semibold hover:underline">
                      {t.createNewFolder}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {folders.map((f) => {
                      const count = sessions.filter((s) => (sessionFolderMap[s.id] || "default") === f.id).length;
                      return (
                        <div
                          key={f.id}
                          onClick={() => {
                            setSelectedFolderFilter(f.id);
                            setActiveTab("myFiles");
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:border-amber-500 transition-all ${inputBg}`}
                        >
                          <span className="font-medium text-xs truncate">📂 {f.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Transcribe & Record */}
          {activeTab === "transcribe" && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className={`${bgCard} backdrop-blur rounded-2xl p-6 shadow-xl border`}>
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                    <span>📂</span> {t.uploadTitle}
                  </h2>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) {
                        setFile(f);
                        resetRecording();
                        setError("");
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      dragOver
                        ? "border-blue-500 bg-blue-500/10"
                        : isDark ? "border-slate-800 hover:border-blue-500/60 bg-slate-950/40" : "border-slate-300 hover:border-blue-400 bg-slate-50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setFile(f);
                          resetRecording();
                          setError("");
                        }
                      }}
                    />
                    <div className="text-4xl mb-3">🎧</div>
                    <p className="font-semibold">{t.uploadTitle}</p>
                    <p className={`text-xs ${textSub} mt-1`}>{t.uploadDesc}</p>
                    {file && (
                      <div className="mt-4 inline-flex items-center gap-3 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-4 py-2 rounded-xl text-sm">
                        <span>📄 {file.name}</span>
                        <button
                          className="text-slate-400 hover:text-red-400 font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="my-6 flex items-center gap-3">
                    <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
                    <span className={`text-xs ${textSub} uppercase tracking-widest font-semibold`}>{t.orRecord}</span>
                    <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
                  </div>

                  <div>
                    {!recording && !recBlob && (
                      <button
                        onClick={startRecording}
                        className={`w-full rounded-xl border-2 py-4 text-center font-semibold transition-all flex items-center justify-center gap-2 ${
                          isDark ? "border-slate-800 bg-slate-950/50 hover:border-red-500 hover:bg-red-500/10 text-slate-200" : "border-slate-300 bg-white hover:border-red-400 hover:bg-red-50 text-slate-700"
                        }`}
                      >
                        <span className="text-lg">🔴</span> {t.recordMic}
                      </button>
                    )}

                    {recording && (
                      <div className="rounded-xl border-2 border-red-500/50 bg-red-500/10 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
                          <span className="font-semibold text-red-400">
                            {t.recording} {String(Math.floor(recSeconds / 60)).padStart(2, "0")}:
                            {String(recSeconds % 60).padStart(2, "0")}
                          </span>
                        </div>
                        <button
                          onClick={stopRecording}
                          className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-600/30"
                        >
                          {t.stopRecord}
                        </button>
                      </div>
                    )}

                    {recUrl && (
                      <div className={`rounded-xl border p-4 space-y-3 ${isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-50"}`}>
                        <audio src={recUrl} controls className="w-full accent-blue-600" />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setRecUrl(null);
                              setRecBlob(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${isDark ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-300 hover:bg-slate-100 text-slate-700"}`}
                          >
                            {t.discardRecord}
                          </button>
                          <button
                            onClick={() => {
                              if (mediaRecorderRef.current) resetRecording();
                              startRecording();
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${isDark ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-300 hover:bg-slate-100 text-slate-700"}`}
                          >
                            {t.reRecord}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${bgCard} backdrop-blur rounded-2xl p-6 shadow-xl border space-y-5`}>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <span>⚙️</span> {t.aiOptions}
                  </h2>

                  <div>
                    <label className={`block text-xs font-semibold ${textSub} mb-2`}>{t.audioLang}</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold ${textSub} mb-2`}>{t.expectedSpeakers}</label>
                    <select
                      value={numSpeakers}
                      onChange={(e) => setNumSpeakers(Number(e.target.value))}
                      disabled={!detectSpeakers}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-3 text-sm cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={detectSpeakers}
                      onChange={(e) => setDetectSpeakers(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    {t.autoSpeakers}
                  </label>

                  {phase === "uploading" && (
                    <div className="space-y-1.5 pt-2">
                      <div className={`flex justify-between text-xs ${textSub}`}>
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-200 border-slate-300"}`}>
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {(phase === "transcribing" || phase === "diarizing") && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs text-blue-400 font-medium">
                        <span>{message}</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-200 border-slate-300"}`}>
                        <div className="h-full bg-blue-500 animate-pulse w-3/4" />
                      </div>
                      <p className="text-[11px] text-amber-400/90 pt-1 leading-relaxed">
                        {t.largeFileTip}
                      </p>
                    </div>
                  )}

                  {phase === "error" && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleProcess}
                    disabled={!hasAudio || busy}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-blue-600/30 transition-all"
                  >
                    {busy ? t.processing : t.startTranscribe}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Archive */}
          {activeTab === "archive" && (
            <div className={`${bgCard} backdrop-blur rounded-2xl p-6 shadow-xl border space-y-6`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold">{t.archiveTitle}</h2>
                  <p className={`text-xs ${textSub}`}>{t.archiveDesc}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  >
                    <option value="all">{t.allStatus}</option>
                    <option value="done">{t.completedOnly}</option>
                    <option value="processing">{t.processingStatus}</option>
                  </select>
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className={`text-center py-16 ${textSub} rounded-2xl border ${isDark ? "bg-slate-950/40 border-slate-800/50" : "bg-slate-100 border-slate-200"}`}>
                  <p className="text-3xl mb-2">📭</p>
                  <p className="font-medium">No sessions found</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSessions.map((s) => {
                    const isCustom = customWorkIds.includes(s.id);
                    const displayName = customFileNames[s.id] || s.filename;
                    return (
                      <div
                        key={s.id}
                        onClick={() => openSession(s)}
                        className={`border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl flex flex-col justify-between group ${
                          isDark ? "bg-slate-950/60 border-slate-800/80 hover:border-blue-500/60" : "bg-white border-slate-200 hover:border-blue-400"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-sm truncate group-hover:text-blue-500 transition-colors" title={displayName}>
                              {displayName}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => toggleCustomWork(e, s.id)}
                                className={`text-sm px-1.5 py-0.5 rounded transition-colors ${
                                  isCustom ? "text-amber-400 bg-amber-500/20" : "text-slate-400 hover:text-amber-400"
                                }`}
                                title={isCustom ? t.removeFromCustom : t.addToCustom}
                              >
                                {isCustom ? "⭐" : "☆"}
                              </button>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  s.status === "done"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {s.status === "done" ? "Done" : s.status}
                              </span>
                            </div>
                          </div>
                          <p className={`text-xs ${textSub}`}>
                            📅 {new Date(s.created_at).toLocaleString()}
                          </p>
                          <p className={`text-xs ${textSub} mt-1`}>
                            📝 {s.segments?.length ?? 0} segments · 🌐 {s.language || "auto"}
                          </p>
                        </div>

                        <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                          <span className="text-xs text-blue-500 font-semibold group-hover:underline">
                            {t.openSession}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleRename(e, s.id)}
                              className="text-xs text-slate-400 hover:text-blue-400 px-2 py-1 rounded"
                              title="Rename"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => deleteSession(e, s.id)}
                              className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded"
                              title="Delete"
                            >
                              {t.delete}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: My files & Folders */}
          {activeTab === "myFiles" && (
            <div className={`${bgCard} backdrop-blur rounded-2xl p-6 shadow-xl border space-y-6`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{t.myFilesTitle}</h2>
                    <p className={`text-xs ${textSub}`}>{t.myFilesDesc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCreateFolder}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                  >
                    <span>📁</span> {t.createNewFolder}
                  </button>
                  <select
                    value={selectedFolderFilter}
                    onChange={(e) => setSelectedFolderFilter(e.target.value)}
                    className={`text-xs rounded-xl px-3 py-2 border font-medium focus:outline-none ${inputBg}`}
                  >
                    <option value="all">{t.allFiles} ({customWorksSessions.length})</option>
                    {folders.map((f) => {
                      const count = customWorksSessions.filter((s) => (sessionFolderMap[s.id] || "default") === f.id).length;
                      return (
                        <option key={f.id} value={f.id}>
                          📂 {f.name} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {folderFilteredSessions.length === 0 ? (
                <div className={`text-center py-16 ${textSub} rounded-2xl border ${isDark ? "bg-slate-950/40 border-slate-800/50" : "bg-slate-100 border-slate-200"}`}>
                  <div className="text-4xl mb-3">📁</div>
                  <p className="font-medium">{t.noFilesFolder}</p>
                  <p className="text-xs mt-1 text-slate-400">{t.noFilesFolderDesc}</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folderFilteredSessions.map((s) => {
                    const displayName = customFileNames[s.id] || s.filename;
                    const currentFolderId = sessionFolderMap[s.id] || "default";
                    return (
                      <div
                        key={s.id}
                        onClick={() => openSession(s)}
                        className={`border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl flex flex-col justify-between group ${
                          isDark ? "bg-slate-950/60 border-slate-800/80 hover:border-amber-500/60" : "bg-white border-slate-200 hover:border-amber-400"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-sm truncate group-hover:text-amber-500 transition-colors" title={displayName}>
                              🏷️ {displayName}
                            </h3>
                            <button
                              onClick={(e) => toggleCustomWork(e, s.id)}
                              className="text-sm px-1.5 py-0.5 rounded text-amber-400 bg-amber-500/20 shrink-0"
                              title={t.removeFromCustom}
                            >
                              ⭐
                            </button>
                          </div>
                          <p className={`text-xs ${textSub}`}>
                            📅 {new Date(s.created_at).toLocaleString()}
                          </p>
                          <p className={`text-xs ${textSub} mt-1`}>
                            📝 {s.segments?.length ?? 0} segments · 🌐 {s.language || "auto"}
                          </p>

                          <div className="mt-3 pt-2 border-t border-slate-800/40 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] text-slate-400">{t.folderLabel}</span>
                            <select
                              value={currentFolderId}
                              onChange={(e) => handleMoveToFolder(s.id, e.target.value)}
                              className={`text-xs rounded-lg px-2 py-1 border font-medium focus:outline-none flex-1 ${inputBg}`}
                            >
                              {folders.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                          <span className="text-xs text-amber-500 font-semibold group-hover:underline">
                            {t.openSession}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleRename(e, s.id)}
                              className="text-xs text-slate-400 hover:text-amber-400 px-2 py-1 rounded"
                              title={t.renameFile}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => deleteSession(e, s.id)}
                              className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded"
                            >
                              {t.delete}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Settings */}
          {activeTab === "settings" && (
            <div className={`${bgCard} backdrop-blur rounded-2xl p-6 shadow-xl border space-y-6 max-w-2xl`}>
              <div>
                <h2 className="text-lg font-bold">{t.settingsTitle}</h2>
                <p className={`text-xs ${textSub}`}>Paramètres de langue, thème et sauvegarde</p>
              </div>

              <div className="space-y-4 divide-y divide-slate-800">
                <div className="flex items-center justify-between pt-4">
                  <div>
                    <h4 className="text-sm font-semibold">{t.autoSave}</h4>
                    <p className={`text-xs ${textSub}`}>{t.autoSaveDesc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    className="w-5 h-5 rounded accent-blue-600"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <h4 className="text-sm font-semibold">{t.themeMode}</h4>
                    <p className={`text-xs ${textSub}`}>Basculer entre le mode sombre et clair</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${theme === "dark" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-800 text-slate-300 border-slate-700"}`}
                    >
                      🌙 {t.darkMode}
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${theme === "light" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-200 text-slate-800 border-slate-300"}`}
                    >
                      ☀️ {t.lightMode}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <h4 className="text-sm font-semibold">{t.languageUi}</h4>
                    <p className={`text-xs ${textSub}`}>Choisissez la langue de l'interface</p>
                  </div>
                  <select
                    value={uiLang}
                    onChange={(e) => setUiLang(e.target.value)}
                    className={`text-xs rounded-xl px-3 py-2 border font-medium focus:outline-none ${inputBg}`}
                  >
                    <option value="ar">العربية (Arabic)</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
