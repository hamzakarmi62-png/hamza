import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { formatTime, nextColor, uid } from "../utils.js";
import Segment from "./Segment.jsx";
import ExportMenu from "./ExportMenu.jsx";
import PlayerPanel from "./PlayerPanel.jsx";

const VIDEO_EXTS = ["mp4", "webm", "mov", "m4v", "mkv", "avi"];

export default function TranscriptScreen({ initialSession, onBack }) {
  const [session, setSession] = useState(initialSession || {});
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeWordKey, setActiveWordKey] = useState(null);
  const [editingWordKey, setEditingWordKey] = useState(null);

  const updateWordText = (segId, wordIdx, newWordText) => {
    mutate((prev) => ({
      ...prev,
      segments: prev.segments.map((s) => {
        if (s.id !== segId) return s;
        const newWords = [...(s.words || [])];
        if (newWords[wordIdx]) {
          newWords[wordIdx] = { ...newWords[wordIdx], word: newWordText };
        }
        const newText = newWords.map((w) => w.word).join(" ");
        return { ...s, text: newText, words: newWords };
      }),
    }));
  };
  const [saveState, setSaveState] = useState("saved");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [playerMode, setPlayerMode] = useState("docked");
  const [viewMode, setViewMode] = useState("stream"); // stream | cards
  const [highlightOffset, setHighlightOffset] = useState(0.25);
  const [history, setHistory] = useState([initialSession || {}]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const audioRef = useRef(null);
  const saveTimerRef = useRef(null);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const speakers = session?.speakers || [];
  const segments = session?.segments || [];

  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, searchQuery]);

  const mediaKind = useMemo(() => {
    if (session?.kind) return session.kind;
    const p = (session?.audio_path || "").toLowerCase();
    return VIDEO_EXTS.some((e) => p.endsWith(e)) ? "video" : "audio";
  }, [session?.kind, session?.audio_path]);

  const speakerById = useMemo(() => {
    const m = {};
    speakers.forEach((s) => {
      if (s && s.id) m[s.id] = s;
    });
    return m;
  }, [speakers]);

  const skipTime = (seconds) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (audio) {
      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }
  };

  const setSpeed = (spd) => {
    setPlaybackSpeed(spd);
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = spd;
    }
  };

  useEffect(() => {
    if (!initialSession) return;
    const segs = (initialSession.segments || []).map((s) => ({ ...s, words: s.words || [] }));
    let spk = initialSession.speakers || [];
    if (spk.length === 0 && segs.length > 0) {
      spk = [{ id: "s1", name: "Speaker 1", color: "#2563eb" }];
      segs.forEach((s) => (s.speaker = "s1"));
    }
    setSession({ ...initialSession, segments: segs, speakers: spk });
  }, [initialSession]);

  useEffect(() => {
    let raf;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        setCurrentTime(audio.currentTime);
        setPlaying(!audio.paused && !audio.ended);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const payloadFor = useCallback((s) => ({
    segments: s.segments,
    speakers: s.speakers,
    settings: s.settings || {},
    language: s.language,
    duration: s.duration,
  }), []);

  const scheduleSave = useCallback(() => {
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.saveSession(sessionRef.current.id, payloadFor(sessionRef.current));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 900);
  }, [payloadFor]);

  const mutate = useCallback((transform) => {
    setSession((prev) => {
      const next = transform(prev);
      setHistory((h) => {
        const sliced = h.slice(0, historyIndex + 1);
        return [...sliced, next];
      });
      setHistoryIndex((idx) => idx + 1);
      return next;
    });
    scheduleSave();
  }, [historyIndex, scheduleSave]);

  const undo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setSession(history[newIdx]);
      scheduleSave();
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setSession(history[newIdx]);
      scheduleSave();
    }
  };

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  const manualSave = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    try {
      await api.saveSession(sessionRef.current.id, payloadFor(sessionRef.current));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const activeIdx = useMemo(() => {
    let idx = -1;
    segments.forEach((s, i) => {
      if (currentTime >= s.start && currentTime < s.end) idx = i;
    });
    return idx;
  }, [currentTime, segments]);

  const activeSegment = activeIdx >= 0 ? segments[activeIdx] : null;

  const groupedTurns = useMemo(() => {
    const turns = [];
    let currentTurn = null;
    filteredSegments.forEach((seg, i) => {
      const spk = seg.speaker;
      if (!currentTurn || currentTurn.speaker !== spk) {
        if (currentTurn) turns.push(currentTurn);
        currentTurn = {
          id: `turn-${seg.id}`,
          speaker: spk,
          start: seg.start,
          end: seg.end,
          segments: [{ seg, index: i }],
        };
      } else {
        currentTurn.segments.push({ seg, index: i });
        currentTurn.end = seg.end;
      }
    });
    if (currentTurn) turns.push(currentTurn);
    return turns;
  }, [filteredSegments]);

  useEffect(() => {
    if (!playing || !activeSegment) return;
    const el = document.getElementById(`seg-${activeSegment.id}`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeSegment, playing]);

  useEffect(() => {
    if (segments.length === 0) {
      setActiveWordKey(null);
      return;
    }
    let foundKey = null;
    const speechTime = currentTime + highlightOffset;

    let allWords = [];
    segments.forEach(seg => {
      (seg.words || []).forEach((w, i) => {
        allWords.push({ key: `${seg.id}-w${i}`, start: w.start, end: w.end });
      });
    });

    if (allWords.length > 0) {
      let activeWord = null;
      let lastPastWord = null;

      for (const w of allWords) {
        if (speechTime >= w.start && speechTime <= w.end) {
          activeWord = w;
          break;
        }
        if (speechTime > w.end) {
          lastPastWord = w;
        }
      }

      if (activeWord) {
        foundKey = activeWord.key;
      } else if (lastPastWord) {
        const nextWord = allWords.find(w => w.start > lastPastWord.end);
        if (!nextWord || speechTime < nextWord.start) {
          foundKey = lastPastWord.key;
        }
      }
    }

    setActiveWordKey(foundKey);
  }, [currentTime, segments, highlightOffset]);

  const seekTo = (t) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = t;
      audio.play().catch(() => {});
    }
  };

  const generateWordsForText = (text, start, end) => {
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return [];
    const totalChars = parts.reduce((acc, p) => acc + Math.max(p.length, 1), 0);
    const minDurationNeeded = parts.length * 0.08;
    const effectiveEnd = Math.max(end, start + minDurationNeeded);
    const duration = effectiveEnd - start;
    let curTime = start;
    return parts.map((w, idx) => {
      const charWeight = Math.max(w.length, 1);
      const wDuration = (charWeight / totalChars) * duration;
      let wStart = curTime;
      if (idx > 0) {
        wStart = Math.max(curTime, start + (idx * 0.05));
      }
      let wEnd = wStart + wDuration;
      if (wEnd <= wStart) {
        wEnd = wStart + 0.05;
      }
      if (idx === parts.length - 1 && wEnd < effectiveEnd) {
        wEnd = effectiveEnd;
      }
      curTime = wEnd;
      return {
        word: w,
        start: Number(wStart.toFixed(3)),
        end: Number(wEnd.toFixed(3)),
      };
    });
  };

  const alignWords = (oldWords, newParts, segStart, segEnd) => {
    const n = oldWords.length;
    const m = newParts.length;
    
    if (n === 0 || m === 0) {
      const duration = Math.max(segEnd - segStart, m * 0.15);
      let cur = segStart;
      return newParts.map((w) => {
        const wDur = duration / m;
        const start = cur;
        const end = cur + wDur;
        cur = end;
        return { word: w, start: Number(start.toFixed(3)), end: Number(end.toFixed(3)) };
      });
    }

    const dp = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (oldWords[i - 1].word.toLowerCase() === newParts[j - 1].toLowerCase()) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let i = n, j = m;
    const matches = [];
    while (i > 0 && j > 0) {
      if (oldWords[i - 1].word.toLowerCase() === newParts[j - 1].toLowerCase()) {
        matches.unshift({ oldIdx: i - 1, newIdx: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    const result = Array(m);
    for (const match of matches) {
      result[match.newIdx] = {
        word: newParts[match.newIdx],
        start: oldWords[match.oldIdx].start,
        end: oldWords[match.oldIdx].end,
      };
    }

    let lastAssignedEnd = segStart;
    for (let idx = 0; idx < m; idx++) {
      if (result[idx]) {
        lastAssignedEnd = result[idx].end;
        continue;
      }

      let nextMatchedStart = segEnd;
      let k = idx;
      while (k < m && !result[k]) {
        k++;
      }
      if (k < m) {
        nextMatchedStart = result[k].start;
      }

      const unassignedCount = k - idx;
      const availableDuration = Math.max(0.15 * unassignedCount, nextMatchedStart - lastAssignedEnd);
      const step = availableDuration / unassignedCount;

      let cur = lastAssignedEnd;
      for (let subIdx = idx; subIdx < k; subIdx++) {
        const start = cur;
        const end = Math.min(nextMatchedStart, cur + step);
        result[subIdx] = {
          word: newParts[subIdx],
          start: Number(start.toFixed(3)),
          end: Number(Math.max(end, start + 0.1).toFixed(3)),
        };
        cur = result[subIdx].end;
      }
      idx = k - 1;
      lastAssignedEnd = cur;
    }

    return result;
  };

  const updateSegmentText = (id, text) =>
    mutate((prev) => ({
      ...prev,
      segments: prev.segments.map((s) => {
        if (s.id !== id) return s;
        const newParts = text.trim().split(/\s+/).filter(Boolean);
        const oldWords = s.words || [];

        if (newParts.length === 0) {
          return { ...s, text, words: [] };
        }

        const words = alignWords(oldWords, newParts, s.start, s.end);
        const lastWordEnd = words[words.length - 1]?.end || s.end;
        const newEnd = Math.max(s.end, lastWordEnd);

        return {
          ...s,
          text,
          end: Number(newEnd.toFixed(3)),
          words,
        };
      }),
    }));

  const deleteSegment = (id) =>
    mutate((prev) => ({ ...prev, segments: prev.segments.filter((s) => s.id !== id) }));

  const splitSegment = (id, caret) => {
    if (!caret || caret <= 0) return;
    mutate((prev) => {
      const seg = prev.segments.find((s) => s.id === id);
      if (!seg || caret <= 0 || caret >= seg.text.length) return prev;
      const before = seg.text.slice(0, caret);
      const after = seg.text.slice(caret);
      if (!before.trim() || !after.trim()) return prev;
      const ratio = before.length / Math.max(seg.text.length, 1);
      const mid = (seg.start + (seg.end - seg.start) * ratio).toFixed(3);
      const leftWords = (seg.words || []).filter((w) => w.start < Number(mid));
      const rightWords = (seg.words || []).filter((w) => w.start >= Number(mid));
      const right = {
        id: uid(),
        start: Number(mid),
        end: seg.end,
        text: after.trim(),
        speaker: seg.speaker,
        words: rightWords,
      };
      const idx = prev.segments.findIndex((s) => s.id === id);
      const next = [...prev.segments];
      next[idx] = { ...seg, text: before.trim(), end: Number(mid), words: leftWords };
      next.splice(idx + 1, 0, right);
      return { ...prev, segments: next };
    });
  };

  const splitSegmentAtWord = (segId, wordIdx) => {
    if (wordIdx <= 0) return;
    mutate((prev) => {
      const seg = prev.segments.find((s) => s.id === segId);
      if (!seg || !seg.words || wordIdx >= seg.words.length) return prev;
      
      const leftWords = seg.words.slice(0, wordIdx);
      const rightWords = seg.words.slice(wordIdx);
      
      if (leftWords.length === 0 || rightWords.length === 0) return prev;

      const leftText = leftWords.map(w => w.word).join(" ");
      const rightText = rightWords.map(w => w.word).join(" ");
      const splitTime = rightWords[0].start;

      const right = {
        id: uid(),
        start: splitTime,
        end: seg.end,
        text: rightText,
        speaker: seg.speaker,
        words: rightWords,
      };

      const idx = prev.segments.findIndex((s) => s.id === segId);
      const next = [...prev.segments];
      next[idx] = { ...seg, text: leftText, end: splitTime, words: leftWords };
      next.splice(idx + 1, 0, right);
      return { ...prev, segments: next };
    });
  };

  const mergeWithNext = (id) =>
    mutate((prev) => {
      const idx = prev.segments.findIndex((s) => s.id === id);
      if (idx < 0 || idx >= prev.segments.length - 1) return prev;
      const cur = prev.segments[idx];
      const nxt = prev.segments[idx + 1];
      const merged = {
        ...cur,
        text: `${cur.text} ${nxt.text}`.trim(),
        end: nxt.end,
        words: [...(cur.words || []), ...(nxt.words || [])],
      };
      const next = [...prev.segments];
      next[idx] = merged;
      next.splice(idx + 1, 1);
      return { ...prev, segments: next };
    });

  const mergeWithPrev = (id) =>
    mutate((prev) => {
      const idx = prev.segments.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      const cur = prev.segments[idx];
      const prv = prev.segments[idx - 1];
      const merged = {
        ...prv,
        text: `${prv.text} ${cur.text}`.trim(),
        end: cur.end,
        words: [...(prv.words || []), ...(cur.words || [])],
      };
      const next = [...prev.segments];
      next[idx - 1] = merged;
      next.splice(idx, 1);
      return { ...prev, segments: next };
    });

  const reassign = (id, speakerId) =>
    mutate((prev) => ({
      ...prev,
      segments: prev.segments.map((s) => (s.id === id ? { ...s, speaker: speakerId } : s)),
    }));

  const renameSpeaker = (id, name) =>
    mutate((prev) => ({
      ...prev,
      speakers: prev.speakers.map((s) => (s.id === id ? { ...s, name } : s)),
    }));

  const addSpeaker = () =>
    mutate((prev) => ({
      ...prev,
      speakers: [
        ...prev.speakers,
        { id: uid(), name: `Speaker ${prev.speakers.length + 1}`, color: nextColor(prev.speakers.length) },
      ],
    }));

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Auto-saved";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
          >
            ← New
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold truncate text-sm sm:text-base">{session.filename}</h1>
            <p className="text-xs text-slate-500">
              {session.language || "auto"} · {segments.length} segments
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {playerMode === "hidden" && (
              <button
                onClick={() => setPlayerMode("docked")}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
                title="Show player"
              >
                ▶ Show player
              </button>
            )}
            <span className={`text-xs ${saveState === "error" ? "text-red-500" : "text-slate-400"}`}>
              {saveLabel}
            </span>
            <button
              onClick={manualSave}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
            >
              Save
            </button>
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs" title="تحكم في توقيت وسرعة التظليل الزمني">
              <span className="text-slate-600 font-medium">⚡ Sync:</span>
              <select
                value={highlightOffset}
                onChange={(e) => setHighlightOffset(Number(e.target.value))}
                className="bg-white rounded px-1 py-0.5 text-xs font-semibold text-slate-800 border border-slate-300 focus:outline-none"
              >
                <option value="0.0">بدون إزاحة (0.0s)</option>
                <option value="0.15">سريع (+0.15s)</option>
                <option value="0.25">مثالي / منع التأخير (+0.25s)</option>
                <option value="0.4">متوسط (+0.4s)</option>
                <option value="0.6">بطيء (+0.6s)</option>
              </select>
            </div>
            <div className="flex items-center bg-slate-200 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${viewMode === "cards" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                title="مربعات منفصلة"
              >
                🗂️ Cards
              </button>
              <button
                onClick={() => setViewMode("stream")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${viewMode === "stream" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                title="نص متسلسل ومرن"
              >
                📜 Stream
              </button>
            </div>
            <ExportMenu sessionId={session.id} filename={session.filename} />
          </div>
        </div>
      </header>

      {/* Rich Toolbar matching user's reference image */}
      <div className="sticky top-[61px] z-20 bg-slate-100/95 backdrop-blur-md pt-2 pb-2">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* 1. Replay 15s */}
              <button
                onClick={() => skipTime(-15)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center gap-0.5 text-xs font-medium transition-colors"
                title="رجوع 15 ثانية"
              >
                <span className="text-base">↺</span><span className="text-[10px]">15</span>
              </button>

              {/* 2. Play / Pause */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-800 text-lg transition-colors"
                title={playing ? "إيقاف مؤقت" : "تشغيل"}
              >
                {playing ? "⏸" : "▶"}
              </button>

              {/* 3. Forward 30s */}
              <button
                onClick={() => skipTime(30)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center gap-0.5 text-xs font-medium transition-colors"
                title="تقديم 30 ثانية"
              >
                <span className="text-[10px]">30</span><span className="text-base">↻</span>
              </button>

              <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

              {/* 4. Speed 1X */}
              <select
                value={playbackSpeed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                title="سرعة التشغيل"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1X</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2X</option>
              </select>

              <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

              {/* 5. Add segment */}
              <button
                onClick={() => {
                  const t = audioRef.current?.currentTime || 0;
                  mutate((prev) => ({
                    ...prev,
                    segments: [
                      ...prev.segments,
                      {
                        id: uid(),
                        start: t,
                        end: t + 3,
                        text: "مقطع جديد...",
                        speaker: prev.speakers[0]?.id || "s1",
                        words: [],
                      },
                    ].sort((a, b) => a.start - b.start),
                  }));
                }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
                title="إضافة مقطع جديد"
              >
                💬+
              </button>

              {/* 6. Split active segment */}
              <button
                onClick={() => {
                  if (activeSegment) {
                    splitSegment(activeSegment.id, Math.floor(activeSegment.text.length / 2));
                  }
                }}
                disabled={!activeSegment}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 disabled:opacity-40 transition-colors"
                title="قص / تقسيم المقطع (Scissors)"
              >
                ✂️
              </button>

              {/* 7. Highlight tool */}
              <button
                onClick={() => {
                  if (activeSegment) setEditingId(activeSegment.id);
                }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 border-b-2 border-purple-400 transition-colors"
                title="أداة التحديد والتعديل والتظليل"
              >
                🖍️
              </button>

              <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

              {/* 8. Undo */}
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 disabled:opacity-40 transition-colors"
                title="تراجع (Undo)"
              >
                ↩️
              </button>

              {/* 9. Redo */}
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 disabled:opacity-40 transition-colors"
                title="إعادة (Redo)"
              >
                ↪️
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

              {/* 10. Download / Export */}
              <ExportMenu sessionId={session.id} filename={session.filename} />

              {/* 11. Saved status */}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${saveState === "error" ? "bg-red-100 text-red-600" : saveState === "saving" ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {saveState === "saving" ? "Saving…" : saveState === "error" ? "Error" : "Saved"}
              </span>

              <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

              {/* 12. Search */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
                title="بحث في النص"
              >
                🔍
              </button>

              {/* 13. More options */}
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 font-bold transition-colors"
                  title="المزيد"
                >
                  ⋯
                </button>
                {moreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 px-2 py-1">تزامن التظليل (Sync Offset)</div>
                    <select
                      value={highlightOffset}
                      onChange={(e) => {
                        setHighlightOffset(Number(e.target.value));
                        setMoreMenuOpen(false);
                      }}
                      className="w-full bg-slate-50 border rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="0.0">0.0s (دقيق)</option>
                      <option value="0.15">+0.15s (سريع)</option>
                      <option value="0.25">+0.25s (مثالي)</option>
                      <option value="0.4">+0.4s (متوسط)</option>
                      <option value="0.6">+0.6s (بطيء)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search bar expandable */}
          {showSearch && (
            <div className="mt-2 bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-2">
              <span className="text-sm">🔍</span>
              <input
                type="text"
                placeholder="ابحث في النص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none bg-transparent"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-xs text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div
          className={`grid gap-6 ${playerMode === "docked" ? "lg:grid-cols-[440px_1fr]" : "grid-cols-1"}`}
        >
          <aside className="h-fit space-y-4 lg:sticky lg:top-[72px]">
            <PlayerPanel
              src={api.audioUrl(session.id)}
              kind={mediaKind}
              filename={session.filename}
              mode={playerMode}
              onMode={setPlayerMode}
              mediaRef={audioRef}
            />
            <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Speakers
              </span>
              {speakers.map((s) =>
                renamingId === s.id ? (
                  <input
                    key={s.id}
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => {
                      if (renameValue.trim()) renameSpeaker(s.id, renameValue.trim());
                      setRenamingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="text-sm px-2 py-1 rounded-full border-2 focus:outline-none"
                    style={{ borderColor: s.color }}
                  />
                ) : (
                  <button
                    key={s.id}
                    onClick={() => {
                      setRenamingId(s.id);
                      setRenameValue(s.name);
                    }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: s.color }}
                    title="Click to rename speaker"
                  >
                    {s.name}
                  </button>
                )
              )}
              <button
                onClick={addSpeaker}
                className="px-3 py-1.5 rounded-full text-sm border border-dashed border-slate-300 hover:bg-slate-50"
                title="Add a new speaker"
              >
                + Add speaker
              </button>
            </div>
          </aside>

          <section>
            {segments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-10 text-center text-slate-500">
                No transcript available for this session yet.
              </div>
            ) : viewMode === "stream" ? (
              <div className="space-y-6 pb-10 max-w-4xl mx-auto">
                <div className="pb-2 mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-700 text-sm">📜 Continuous Stream Reading View</h3>
                  <span className="text-xs text-slate-400">{segments.length} segments · انقر على أي كلمة للتصحيح المباشر</span>
                </div>
                <div className="text-[17px] leading-relaxed space-y-6" dir="auto">
                  {groupedTurns.map((turn) => {
                    const speaker = speakerById[turn.speaker];
                    const startColor = speaker?.color || "#94a3b8";
                    return (
                      <div key={turn.id} className="space-y-2">
                        <div className="inline-flex items-center gap-2 mt-4 mb-1">
                          <span
                            className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: startColor }}
                          >
                            {speaker?.name || "Unassigned"}
                          </span>
                          <span
                            onClick={() => seekTo(turn.start)}
                            className="text-[11px] text-slate-400 tabular-nums cursor-pointer hover:text-blue-600"
                            title="الانتقال إلى بداية التحدث"
                          >
                            [{formatTime(turn.start)}] ▶
                          </span>
                        </div>
                        <div className="space-y-2">
                          {turn.segments.map(({ seg }) => {
                            const isEditing = editingId === seg.id;
                            return (
                              <div key={seg.id} className="relative group py-1">
                                {isEditing ? (
                                  <textarea
                                    value={seg.text}
                                    onChange={(e) => updateSegmentText(seg.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const caret = e.target.selectionStart;
                                        splitSegment(seg.id, caret);
                                      } else if (e.key === "Backspace" && e.target.selectionStart === 0) {
                                        e.preventDefault();
                                        mergeWithPrev(seg.id);
                                      }
                                    }}
                                    onBlur={() => setEditingId(null)}
                                    rows={Math.max(1, Math.ceil(seg.text.length / 85))}
                                    className="w-full bg-transparent border-0 p-0 text-[17px] leading-relaxed resize-none focus:outline-none focus:ring-0 text-slate-900"
                                    dir="auto"
                                    autoFocus
                                  />
                                ) : (
                                  <p
                                    dir="auto"
                                    className="text-[17px] leading-relaxed select-text cursor-text hover:bg-slate-50/50 rounded px-1 transition-colors"
                                    onClick={() => setEditingId(seg.id)}
                                    title="انقر للتعديل المباشر"
                                  >
                                    {seg.words && seg.words.length > 0 ? (
                                      seg.words.map((w, i) => {
                                        const wKey = `${seg.id}-w${i}`;
                                        const isHighlighted = activeWordKey === wKey;
                                        return (
                                          <span
                                            key={i}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              seekTo(w.start);
                                            }}
                                            className={`cursor-pointer hover:bg-blue-100 rounded px-0.5 transition-colors inline-block ${
                                              isHighlighted
                                                ? "bg-amber-300 text-slate-900 font-semibold"
                                                : ""
                                            }`}
                                            title={`الانتقال إلى الثانية ${w.start.toFixed(1)}`}
                                          >
                                            {w.word}{" "}
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span>{seg.text}</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {groupedTurns.map((turn) => {
                  const speaker = speakerById[turn.speaker];
                  const startColor = speaker?.color || "#94a3b8";
                  return (
                    <div
                      key={turn.id}
                      className="rounded-2xl border-l-4 bg-white shadow-sm p-5 space-y-4 transition-all"
                      style={{ borderLeftColor: startColor }}
                    >
                      <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-100">
                        <span
                          className="text-xs font-semibold px-3 py-1 rounded-full text-white"
                          style={{ backgroundColor: startColor }}
                        >
                          {speaker?.name || "Unassigned"}
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">
                          [{formatTime(turn.start)} – {formatTime(turn.end)}]
                        </span>
                      </div>

                      <div className="space-y-3">
                        {turn.segments.map(({ seg, index }) => (
                          <Segment
                            key={seg.id}
                            segment={seg}
                            speaker={speaker}
                            isActive={activeSegment?.id === seg.id}
                            activeWordKey={activeWordKey}
                            editingWordKey={editingWordKey}
                            onSetEditingWordKey={setEditingWordKey}
                            onUpdateWord={updateWordText}
                            editing={editingId === seg.id}
                            canMerge={index < segments.length - 1}
                            speakers={speakers}
                            onStartEdit={(id) => setEditingId(id)}
                            onCommitEdit={updateSegmentText}
                            onDelete={(id) => {
                              if (editingId === id) setEditingId(null);
                              deleteSegment(id);
                            }}
                            onSplit={splitSegment}
                            onMerge={mergeWithNext}
                            onReassign={reassign}
                            onSeek={seekTo}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}