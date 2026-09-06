import { useRef, useState } from "react";

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export default function PlayerPanel({
  src,
  kind,
  filename,
  mode,
  onMode,
  mediaRef,
}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(() => ({
    x: typeof window !== "undefined" ? Math.max(window.innerWidth - 420, 8) : 420,
    y: 80,
  }));

  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const x = clamp(d.ox + e.clientX - d.sx, 0, window.innerWidth - d.w);
    const y = clamp(d.oy + e.clientY - d.sy, 0, window.innerHeight - d.h - 8);
    setPos({ x, y });
  };

  const onUp = () => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  const startDrag = (e) => {
    if (mode !== "floating") return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: pos.x,
      oy: pos.y,
      w: rect.width,
      h: rect.height,
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (mode === "hidden") return null;

  const isVideo = kind === "video";
  const floating = mode === "floating";

  const toolbar = (
    <div className="flex items-center gap-1 shrink-0">
      {floating ? (
        <button
          onClick={() => onMode("docked")}
          className="text-xs px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
          title="Dock player"
        >
          Dock
        </button>
      ) : (
        <button
          onClick={() => onMode("floating")}
          className="text-xs px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
          title="Undock as floating player"
        >
          Float
        </button>
      )}
      <button
        onClick={() => onMode("hidden")}
        className="text-xs px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
        title="Hide player"
      >
        Hide
      </button>
    </div>
  );

  const header = (
    <div
      onPointerDown={startDrag}
      className={`flex items-center gap-2 px-3 py-2 border-b border-slate-100 select-none ${
        floating ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      title={floating ? "Drag to move player" : filename}
    >
      <span className="text-xs font-medium text-slate-500 truncate min-w-0">{filename}</span>
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        {isVideo ? "video" : "audio"}
      </span>
      <div className="ml-auto">{toolbar}</div>
    </div>
  );

  const media = isVideo ? (
    <video
      ref={mediaRef}
      src={src}
      controls
      playsInline
      className="w-full aspect-video bg-black rounded-b-2xl"
    />
  ) : (
    <audio ref={mediaRef} src={src} controls className="w-full rounded-b-2xl" />
  );

  if (floating) {
    return (
      <div
        ref={panelRef}
        className="fixed z-50 w-[400px] max-w-[calc(100vw-16px)] bg-white rounded-2xl shadow-2xl border border-slate-200"
        style={{ left: pos.x, top: pos.y }}
      >
        {header}
        {media}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow">
      {header}
      {media}
    </div>
  );
}