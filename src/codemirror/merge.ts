import { unifiedMergeView } from "@codemirror/merge";
import { Compartment, EditorState, Text } from "@codemirror/state"

const merging = new Compartment();

export function isMerging(state: EditorState) {
  const inner = merging.get(state);
  return inner && !(inner instanceof Array && inner.length == 0);
}

export function setMerging(remote: string | Text | null) {
  const inner = remote ? [unifiedMergeView({ original: remote })] : [];

  return {
    get extension() {
      return merging.of(inner)
    },
    get effect() {
      return merging.reconfigure(inner)
    },
  }
}
