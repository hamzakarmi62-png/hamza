import { useEffect, useRef } from "react";
import { formatTime } from "../utils.js";

export default function Segment({
  segment,
  speaker,
  isActive,
  activeWordKey,
  editingWordKey,
  onSetEditingWordKey,
  onUpdateWord,
  editing,
  canMerge,
  onStartEdit,
  onCommitEdit,
  onDelete,
  onSplit,
  onMerge,
  onReassign,
  onSeek,
  speakers,
  currentTime,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
    }
  }, [editing]);

  const startColor = speaker?.color || "#94a3b8";

  return (
    <div
      id={`seg-${segment.id}`}
      onClick={(e) => {
        if (e.target.tagName !== "BUTTON" && e.target.tagName !== "SELECT" && !editing) {
          onSeek(segment.start);
        }
      }}
      className={`rounded-xl border-l-4 bg-white shadow-sm p-4 transition-all ${
        isActive
          ? "ring-2 ring-blue-400 border-l-4"
          : "border-l-4"
      }`}
      style={{ borderLeftColor: startColor }}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
          style={{ backgroundColor: startColor }}
        >
          {speaker?.name || "Unassigned"}
        </span>
        <span className="text-xs text-slate-500 tabular-nums">
          [{formatTime(segment.start)} – {formatTime(segment.end)}]
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={segment.speaker || ""}
            onChange={(e) => onReassign(segment.id, e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-2 py-1 bg-white"
            title="Reassign speaker"
          >
            {speakers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!editing && (
            <button
              onClick={() => onStartEdit(segment.id)}
              className="text-xs px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
              title="Edit text"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => onSplit(segment.id, textareaRef.current?.selectionStart ?? -1)}
            disabled={!editing}
            className="text-xs px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
            title="Split at cursor"
          >
            Split
          </button>
          <button
            onClick={() => onMerge(segment.id)}
            disabled={!canMerge}
            className="text-xs px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
            title="Merge with next"
          >
            Merge ↓
          </button>
          <button
            onClick={() => onDelete(segment.id)}
            className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            title="Delete segment"
          >
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={segment.text}
            onChange={(e) => onCommitEdit(segment.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const caret = textareaRef.current?.selectionStart ?? -1;
                onSplit(segment.id, caret);
              } else if (e.key === "Backspace" && !segment.text.trim()) {
                e.preventDefault();
                onDelete(segment.id);
              }
            }}
            rows={Math.max(2, Math.ceil(segment.text.length / 80))}
            className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <p className="text-xs text-slate-400 mt-1">
            Editing — اضغط ⏎ Enter لتقسيم الفقرة للأسفل، أو ⌫ Backspace لمسح المقطع.
          </p>
        </div>
      ) : (
        <p
          dir="auto"
          className="text-[15px] leading-relaxed select-text"
        >
          {segment.words && segment.words.length > 0 ? (
            segment.words.map((w, i) => {
              const wKey = `${segment.id}-w${i}`;
              const isEditingWord = editingWordKey === wKey;
              const isHighlighted = activeWordKey === wKey;
              if (isEditingWord) {
                return (
                  <input
                    key={wKey}
                    autoFocus
                    value={w.word}
                    onChange={(e) => onUpdateWord(segment.id, i, e.target.value)}
                    onBlur={() => onSetEditingWordKey(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="w-24 bg-transparent border-b-2 border-blue-500 px-1 text-sm text-slate-900 focus:outline-none inline-block mx-0.5"
                  />
                );
              }
              let highlightClass = "";
              if (isHighlighted) {
                highlightClass = "bg-amber-300 text-slate-900 font-semibold";
              }
               return (
                <span
                  key={wKey}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(w.start);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onSetEditingWordKey(wKey);
                  }}
                  className={`cursor-pointer hover:bg-blue-100 rounded px-0.5 transition-colors ${highlightClass}`}
                  title="انقر للانتقال وتشغيل الصوت من هذه الكلمة · انقر نقراً مزدوجاً للتصحيح"
                >
                  {w.word}{" "}
                </span>
              );
            })
          ) : (
            segment.text
          )}
        </p>
      )}
    </div>
  );
}
