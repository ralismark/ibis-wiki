import { EditorState, Transaction, TransactionSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { MutableRefObject } from "react";
import { Feed } from "../extern";

export class EditorStateRef {
  private state: EditorState
  private feed: Feed<[Transaction]> = new Feed();

  constructor(state: EditorState) {
    this.state = state;
  }

  subscribe(f: (tr: Transaction) => void): () => void {
    return this.feed.subscribe(f);
  }

  getState(): EditorState {
    return this.state;
  }

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
        view.update([tr]);
      });

      return () => {
        unsub();
        view.destroy();
      };
    }

    return () => {};
  }
}