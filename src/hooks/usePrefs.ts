import { useSyncExternalStore } from "react";
import { defaultPrefs, getPrefs, savePrefs, subscribePrefs, type Prefs } from "@/lib/prefs";

// O HTML estático é gerado em PT; o valor real entra logo após a hidratação.
const serverPrefs = defaultPrefs("pt");
const getServerPrefs = () => serverPrefs;
const update = (patch: Partial<Prefs>) => savePrefs({ ...getPrefs(), ...patch });

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  return [useSyncExternalStore(subscribePrefs, getPrefs, getServerPrefs), update];
}
