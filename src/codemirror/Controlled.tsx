import { EditorState, Transaction, TransactionSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { MutableRefObject } from "react";
import { Feed } from "../extern";

/*
 * EditorStateRef wraps a CodeMirror EditorState to allow it to be "shared",
 * rather than being owned by a particular editor view.
 */
export class EditorStateRef {
  private state: EditorState
  private feed: Feed<[Transaction /*| EditorState*/]> = new Feed();

  constructor(state: EditorState) {
    this.state = state;
  }

  subscribe(f: (tr: Transaction /*| EditorState*/) => void): () => void {
    return this.feed.subscribe(f);
  }

  // Get the current EditorState. If this is called during a callback, the
  // state is the new state.
  getState(): EditorState {
    return this.state;
  }

  /*setState(state: EditorState) {
    this.state = state;
    this.feed.signal(state);
    }*/

  update(tr: Transaction): void
  update(...specs: TransactionSpec[]): void
  update(...input: TransactionSpec[] | [Transaction]): void {
    const tr = input.length === 1 && input[0] instanceof Transaction ? input[0]
      : this.state.update(...input as TransactionSpec[]);

    this.state = tr.state;
    this.feed.signal(tr);
  }

  attach(ref: MutableRefObject<HTMLElement | null>): () => void {
    if (ref.current) {
      const view = new EditorView({
        parent: ref.current,
        state: this.state,
        dispatch: tr => this.update(tr),
      });
      const unsub = this.subscribe(tr => {
        /*if (tr instanceof EditorState) {
          view.setState(tr)
        } else*/ {
          view.update([tr]);
        }
      });

      return () => {
        unsub();
        view.destroy();
      };
    }

    return () => {};
  }
}
