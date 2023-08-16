import { unifiedMergeView } from "@codemirror/merge";
import { Compartment, EditorState, Extension, StateEffect, Text } from "@codemirror/state"

const merging = new Compartment();

export function isMerging(state: EditorState) {
  const inner = merging.get(state);
  return inner && !(inner instanceof Array && inner.length == 0);
}

export function ofNotMerging(): Extension {
  return merging.of([]);
}

export function ofMerging(remote: string | Text): Extension {
  return merging.of([
    unifiedMergeView({
      original: remote,
    }),
  ]);
}

export function startMerge(remote: string | Text): StateEffect<unknown> {
  return merging.reconfigure([
    unifiedMergeView({
      original: remote,
    }),
  ]);
}

export function endMerge(): StateEffect<unknown> {
  return merging.reconfigure([]);
}
