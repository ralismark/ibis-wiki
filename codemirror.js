"use strict";

/*
 * This file defines a codemirror mode "mdm" which has our custom syntax format
 */

CodeMirror.defineMode("mdm", () => ({

    // valid states:
    // - "skiptoend"
    // - "normal"
    // - "link"
    // - "start"
  startState: () => ({ state: "normal" }),

  copyState: ({ state }) => { state },

  token: (stream, state) => {

    if(state.state == "skiptoend") {
      stream.skipToEnd();
      state.state = "normal";
      return null;
    }

    if(stream.sol()) {
      // forbid multi-line formatting
      state.state = "normal";

      let heading = stream.match(/#{1,6}/);
      if(heading) return `line-h${heading.length} line-h h meta`;

      if(stream.match(/\s*>/)) return `line-blockquote blockquote meta`

    }

    if(state.state == "normal") {

      if(stream.match("]]")) {
        return "bracket";
      }

      if(stream.match("[[")) {
        state.state = "link";
        return "bracket";
      }

      stream.next();
      return null;

    } else if(state.state == "link") {

      if(stream.skipTo("]]")) {
        state.state = "normal";
        return "link local-link";
      }

      stream.skipToEnd();
      state.state = "normal";
      return null;

    }
  },
}));
