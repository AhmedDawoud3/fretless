import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { NeckOut } from "../../api/client";
import { useMicrophone } from "../../listen";
import type { NamingSystem } from "../../notation/noteName";
import { MicControls } from "./MicControls";
import { TunerPanel } from "./TunerPanel";
import "./mic.css";

type Mic = ReturnType<typeof useMicrophone>;
/** The microphone shared by every question of the drill, and whether the free tuner is showing. */
type Scope = { mic: Mic; tuner: boolean };

const ScopeContext = createContext<Scope | null>(null);

export function useMicScope(): Scope {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error("useMicScope needs a MicScope around it");
  return scope;
}

type MicScopeProps = { neck: NeckOut; system: NamingSystem; children: ReactNode };

/**
 * Owns the microphone for the whole drill, so moving to the next question keeps it listening.
 * Never starts by itself. Stops on leaving the drill or the page. In tuner mode the question
 * stays mounted but hidden, so the score and the question are still there when you come back.
 */
export function MicScope({ neck, system, children }: MicScopeProps) {
  const mic = useMicrophone();
  const [tuner, setTuner] = useState(false);
  const { stop } = mic;
  useEffect(() => {
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [stop]);
  return (
    <ScopeContext.Provider value={{ mic, tuner }}>
      <MicControls status={mic.status} onStart={mic.start} onStop={mic.stop} />
      <p>
        <button type="button" aria-pressed={tuner} onClick={() => setTuner(!tuner)}>
          Tuner
        </button>
      </p>
      {tuner && <TunerPanel reading={mic.reading} neck={neck} system={system} />}
      <div hidden={tuner}>{children}</div>
    </ScopeContext.Provider>
  );
}
