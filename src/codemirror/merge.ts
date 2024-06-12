import { unifiedMergeView, originalDocChangeEffect } from "@codemirror/merge"
import { ChangeSet, Compartment, EditorState, Extension, StateEffect, StateEffectType, StateField, Text } from "@codemirror/state"
export { getOriginalDoc } from "@codemirror/merge"

// HACK to get the StateEffectType
export const updateOriginalDoc: StateEffectType<{doc: Text, changes: ChangeSet}>  = (originalDocChangeEffect(
  EditorState.create({ doc: Text.empty }),
  ChangeSet.empty(0),
) as any).type

/*
 * This entire this is a big HACK for multiple reasons:
 *
 * 1. The merge plugin doesn't really have a way to have it conditionally
 *    enabled -- it has to be always enabled.
 *
 *    To work around this, we put it in a compartment.
 *
 * 2. Compartment state isn't JSON-serialisable. Even worse, compartment
 *    reconfigure effects are completely opaque so we can't JSON-seralise those
 *    either.
 *
 *    (updateOriginalDoc is at least not opaque so we can use that)
 *
 *    (Also, I don't think we can even use the builtin EditorState.to/fromJSON
 *    with originalDoc since it's inside a compartment...)
 *
 *    To work around this, we create a StateField<Text | null> that represents
 *    the optional merging state, and use a transactionExtender to apply the
 *    necessary updates onto everything.
 *
 * 3. There's no way to set the compartment state when installing the
 *    stateEffect (e.g. on fromJSON).
 *
 *    To work around this, we have the fixMerging stateEffect which simply
 *    reconfigures the compartment to the right thing.
 *
 * I wish this wasn't necessary but within CodeMirror I don't think there's any
 * other way. But at least it kinda works now?
 */

export const merging = new Compartment();

function compartment(m: Text | null): Extension[] {
  if (m === null) return []
  return unifiedMergeView({
    original: m,
  })
}

// HACK effect to make the compartment reflect the state of mergingDoc e.g.
// after fromJSON
export const fixMerging = StateEffect.define<null>({})

// effect to set whether we're merging
export const setMerging = StateEffect.define<Text | null>({
})

export const mergingDoc = StateField.define<Text | null>({
  create: () => null,
  update(doc, tr) {
    for (let e of tr.effects) {
      if (e.is(updateOriginalDoc)) doc = e.value.doc
      if (e.is(setMerging)) doc = e.value
    }
    return doc
  },
  provide(field) {
    return [
      merging.of([]),
      EditorState.transactionExtender.of(tr => {
        const fm = tr.effects.find(e => e.is(fixMerging))
        if (fm === undefined) return {}
        return {
          effects: merging.reconfigure(compartment(tr.startState.field(field)))
        }
      }),
      EditorState.transactionExtender.of(tr => {
        // handle updateMerging
        // TODO multiple updateMerging??
        const sm = tr.effects.find(e => e.is(setMerging))
        if (sm === undefined) return {}
        const newDoc: Text | null = sm.value
        const prevDoc = tr.startState.field(mergingDoc)

        if (newDoc !== null) {
          if (prevDoc !== null) {
            // update merge
            // TODO is this correct
            console.warn("Trying to start merge on merging document")
            return {effects: merging.reconfigure(compartment(newDoc))}
          } else {
            // start merge
            return {effects: merging.reconfigure(compartment(newDoc))}
          }
        } else {
          if (prevDoc !== null) {
            // end merge
            return {effects: merging.reconfigure(compartment(newDoc))}
          } else {
            // merge already ended
            return {}
          }
        }
      }),
    ]
  },
  toJSON(doc) {
    return doc === null ? null : doc.toJSON()
  },
  fromJSON(json) {
    return json === null ? null : Text.of(json)
  }
})
