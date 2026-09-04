const BASE = "/api";

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        let detail = xhr.responseText;
        try {
          detail = JSON.parse(xhr.responseText).detail || detail;
        } catch {
          /* ignore */
        }
        reject(new Error(detail));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    const form = new FormData();
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

export const api = {
  upload: uploadFile,

  getHealth: () => request(`${BASE}/health`),

  listSessions: () => request(`${BASE}/sessions`),

  getSession: (id) => request(`${BASE}/sessions/${id}`),

  saveSession: (id, data) =>
    request(`${BASE}/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteSession: (id) =>
    request(`${BASE}/sessions/${id}`, { method: "DELETE" }),

  startTranscribe: (id, language) =>
    request(`${BASE}/sessions/${id}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: language || null }),
    }),

  startDiarize: (id, numSpeakers) =>
    request(`${BASE}/sessions/${id}/diarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ num_speakers: numSpeakers }),
    }),

  exportUrl: (id, { format, includeSpeakers, includeTimestamps }) => {
    const params = new URLSearchParams({
      format,
      include_speakers: String(includeSpeakers),
      include_timestamps: String(includeTimestamps),
    });
    return `${BASE}/sessions/${id}/export?${params.toString()}`;
  },

  audioUrl: (id) => `${BASE}/sessions/${id}/audio`,
};