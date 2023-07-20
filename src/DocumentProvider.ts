import { Text, EditorState } from "@codemirror/state";
import { ViewPlugin, placeholder } from "@codemirror/view";
import { createContext } from "react";
import { Backend } from "./backend";

export const DocumentProviderContext = createContext<DocumentProvider | null>(null);

export class DocumentProvider {
  readonly backend: Backend;
  docs: { [key: string]: Promise<EditorState> } = {};

  constructor(backend: Backend) {
    this.backend = backend;
  }

  async list(): Promise<Array<string>> {
    return [];
  }

  private async create(path: string): Promise<EditorState> {
    const file = await this.storage.load(path);
    const content = Text.of((file === null ? "" : file.content).split("\n"));
    console.log("loaded!", path, content);

    return EditorState.create({
      doc: content,
      extensions: [
        ViewPlugin.define(() => ({
          update(update: ViewUpdate) => {
          }
        })),
        placeholder("..."),
      ],
    });
  }

  open(path: string): Promise<EditorState> {
    if (!(path in this.docs)) {
      this.docs[path] = this.create(path);
    }
    return this.docs[path];
  }
}

