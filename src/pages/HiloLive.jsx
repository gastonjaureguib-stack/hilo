import { useEffect, useRef, useState } from "react";
import { capturarMicrofono, detenerStream, escucharFinCaptura } from "../audio/audioCapture.js";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { createLiveSession } from "../services/liveService.js";
import { crearSesionTranscripcion } from "../services/transcriptionService.js";
import { liveLanguages, liveModes } from "../utils/liveModes.js";
import { formatearTiempo } from "../utils/timeUtils.js";
import "../styles/live.css";

const labels = {
  idle: "Sin conexión",
  connecting: "Conectando",
  listening: "Escuchando",
  paused: "En pausa",
  finished: "Sesión finalizada",
  error: "Escucha interrumpida",
};

const initial = {
  status: "idle", elapsed: 0, entries: [], transcript: "", partial: "", analyzing: false, error: "",
};

function LiveSession() {
  const [view, setView] = useState(initial);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState("general");
  const [language, setLanguage] = useState("es");
  const session = useRef(null);

  useEffect(() => {
    const live = createLiveSession({
      capture: capturarMicrofono,
      stopStream: detenerStream,
      watchTrack: escucharFinCaptura,
      openTranscription: crearSesionTranscripcion,
      openAudioContext() {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) throw new Error("Este navegador no admite Web Audio.");
        const audio = new Context();
        void audio.resume().catch(() => {});
        return audio;
      },
      async getAccessToken() {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Iniciá sesión para usar Hilo Live.");
        return data.session.access_token;
      },
      update: (patch) => setView((current) => ({ ...current, ...patch })),
    });
    session.current = live;
    const clock = window.setInterval(live.tick, 250);
    const pause = () => live.interrupt();
    const onVisibility = () => { if (document.hidden) pause(); };
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(clock);
      window.removeEventListener("pagehide", pause);
      document.removeEventListener("visibilitychange", onVisibility);
      live.stop();
      session.current = null;
    };
  }, []);

  const { status, elapsed, entries, transcript, partial, analyzing, error } = view;
  const active = status === "listening";
  const connecting = status === "connecting";
  const resumable = status === "paused" || status === "error";
  const running = connecting || active;
  const translating = mode === "traductor";
  const [latest, ...history] = entries;
  const start = (resume) => session.current?.start({ consent, mode, language }, { resume });

  return (
    <div className="hilo-live">
      <div className="live-heading">
        <h1>Hilo Live</h1>
        <div className="live-status">
          <span role="status"><span className="live-dot" data-active={active} aria-hidden="true" />{labels[status]}</span>
          <time aria-label="Tiempo de escucha">{formatearTiempo(elapsed / 1000)}</time>
        </div>
      </div>

      <section className="live-controls" aria-label="Controles de escucha">
        <div className="live-settings">
          <label>Modo
            <select value={mode} disabled={running || resumable} onChange={(event) => setMode(event.target.value)}>
              {Object.entries(liveModes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          {translating && <label>Traducir a
            <select value={language} disabled={running || resumable} onChange={(event) => setLanguage(event.target.value)}>
              {Object.entries(liveLanguages).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>}
        </div>

        <label className="live-consent">
          <input type="checkbox" checked={consent} disabled={running} onChange={(event) => setConsent(event.target.checked)} />
          <span>Tengo el consentimiento de las personas que participan. AssemblyAI recibe el audio y OpenAI procesa la transcripción. Hilo conserva el historial solo en esta página.</span>
        </label>

        <div className="live-actions">
          {active && <button className="live-primary" onClick={() => session.current?.stop("paused")}>Pausar</button>}
          {!running && <button className="live-primary" disabled={!consent} onClick={() => start(resumable)}>
            {resumable ? "Reanudar escucha" : "Iniciar escucha"}
          </button>}
          {(running || resumable) && <button onClick={() => session.current?.stop()}>Finalizar</button>}
        </div>
        {error && <p className="live-error" role="alert">{error}</p>}
      </section>

      <section className="live-answer" aria-labelledby="live-answer-heading" aria-busy={analyzing}>
        <h2 id="live-answer-heading">{translating ? "Traducción en vivo" : "Respuesta en vivo"}</h2>
        {latest && <p className="live-question">{latest.question}</p>}
        <p className={latest?.answer ? "live-answer-text" : "live-placeholder"}>
          {latest?.answer || (analyzing ? "Procesando la conversación…" : translating ? "La traducción aparecerá acá." : "Cuando se detecte una pregunta, la respuesta aparecerá acá.")}
        </p>
      </section>

      <section className="live-transcript">
        <h2>Transcripción reciente</h2>
        <p>{partial || transcript || "El texto aparecerá al hablar."}</p>
      </section>

      <section className="live-history" aria-labelledby="live-history-heading">
        <div className="live-history-heading">
          <h2 id="live-history-heading">Historial de la sesión</h2>
          <button onClick={() => session.current?.clear()} disabled={!entries.length && !transcript && !partial && !analyzing}>Limpiar historial</button>
        </div>
        {history.length > 0 ? <ol>
          {history.map((entry, index) => <li key={index}>
            <p className="live-question">{entry.question}</p>
            <p>{entry.answer}</p>
          </li>)}
        </ol> : <p className="live-placeholder">Las respuestas anteriores aparecerán acá.</p>}
      </section>
    </div>
  );
}

export default function HiloLive() {
  const { user } = useAuth();
  return <LiveSession key={user.id} />;
}
