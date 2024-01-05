import { ChangeSet, EditorState, StateEffect, StateEffectType, StateField, Text, Transaction } from "@codemirror/state"
import { fixMerging, getOriginalDoc, mergingDoc, setMerging, updateOriginalDoc } from "./merge"
import extensions from "./extensions"

// Transaction effects --------------------------------------------------------

type EffectSharingSpec<T> = {
  type: StateEffectType<T>,
  toJSON(value: T, state: EditorState): any,
  fromJSON(json: any, state: EditorState): T,
}

function shareFor<T>(type: StateEffectType<T>): (spec: Omit<EffectSharingSpec<T>, "type">) => EffectSharingSpec<T> {
  return (spec: any) => {
    spec.type = type
    return spec
  }
}

const sharedEffects: { [key: string]: EffectSharingSpec<any> } = {
  updateOriginalDoc: shareFor(updateOriginalDoc)({
    toJSON(value) {
      return value.changes.toJSON()
    },
    fromJSON(json, state) {
      const changes = ChangeSet.fromJSON(json)
      return {
        doc: changes.apply(getOriginalDoc(state)),
        changes: changes,
      }
    },
  }),
  setMerging: shareFor(setMerging)({
    toJSON(value) {
      console.log(value)
      return value !== null ? value.toJSON() : null
    },
    fromJSON(json) {
      return json !== null ? Text.of(json) : null
    },
  }),
}

type sharedEffect = { type: string, value: any }

export function effectsToJSON(
  effects: readonly StateEffect<any>[],
  state: EditorState,
): sharedEffect[] {
  const out: sharedEffect[] = []
  for (const effect of effects) {
    for (const [name, spec] of Object.entries(sharedEffects)) {
      if (effect.is(spec.type)) {
        out.push({ type: name, value: spec.toJSON(effect.value, state) })
        break
      }
    }
  }
  return out
}

export function effectsFromJSON(
  json: sharedEffect[],
  state: EditorState,
): StateEffect<any>[] {
  return json.map(effect => {
    const spec = sharedEffects[effect.type]
    return spec.type.of(spec.fromJSON(effect.value, state))
  })
}

// Transaction ----------------------------------------------------------------

type trRepr = {
  changes: any,
  effects: any[],
}

export function trToJSON(tr: Transaction): trRepr {
  return {
    changes: tr.changes.toJSON(),
    effects: effectsToJSON(tr.effects, tr.startState),
  }
}

export function trFromJSON(tr: trRepr, state: EditorState): Transaction {
  return state.update({
    changes: ChangeSet.fromJSON(tr.changes),
    effects: effectsFromJSON(tr.effects, state),
    annotations: Transaction.remote.of(true),
  })
}

// Editor state ---------------------------------------------------------------

const sharedState: { [key: string]: StateField<any> } = {
  mergingDoc,
}

export function stateToJSON(state: EditorState): unknown {
  return state.toJSON(sharedState)
}

export function stateFromJSON(state: unknown): EditorState {
  return EditorState.fromJSON(state, {
    extensions,
  }, sharedState).update({
    effects: [
      fixMerging.of(null),
    ],
  }).state
}
