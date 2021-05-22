"use strict";

/*
 * This file defines a codemirror mode "mdm" which has our custom syntax format
 */

CodeMirror.defineSimpleMode("mdm", (() => {
  const eps = (next, sol=false) => ({
    sol: sol,
    regex: /.{0}/,
    token: null,
    next: next,
  });

  const textmodes = (extras) => [
    { regex: /(\[\[)([^\]]*)(\]\])/,
      token: ["bracket" + extras, "link js-click js-click-opencard" + extras, "bracket" + extras],
    },
    { regex: /(<)([^>]*)(>)/,
      token: ["bracket" + extras, "link js-click js-click-openlink" + extras, "bracket" + extras],
    },
  ];

  const fmtmodes = (extras) => [
    ...textmodes(extras),

    // end of line
    eps("main", true),

    { regex: /./,
      token: extras,
    },
  ];

  // numbered to avoid collapsing them together
  const list = (n) => [
    { regex: /\s*-/,
      token: "line-list ul meta " + n,
      next: "list" + (1 - n),
    },
    eps("main"),
  ];

  return {
    // special start node to detect preamble
    start: [
      { sol: true, regex: /---$/,
        token: "line-preamble preamble-fence meta",
        next: "preamble",
      },
      { sol: true, regex: /.*\svim:.*ft=javascript.*/,
        token: "line-rest-is-mono comment",
        mode: { spec: "js" },
      },
      eps("main", true),
    ],

    preamble: [
      { sol: true, regex: /---$/,
        token: "line-preamble preamble-fence meta",
        next: "main",
      },
      { regex: /.*/,
        token: "line-preamble",
      },
    ],

    main: [
      { sol: true, regex: /###+/,
        token: "line-h h meta",
      },
      { sol: true, regex: /##/,
        token: "line-h2 line-h h meta",
      },
      { sol: true, regex: /#/,
        token: "line-h1 line-h h meta",
      },

      { sol: true, regex: />/,
        token: "line-blockquote blockquote meta",
      },
      { sol: true, regex: /```/,
        token: "codeblock codeblock-fence meta",
        next: "codeblock",
      },
      { sol: true, regex: /\s*-/,
        token: "line-list ul meta 0",
        next: "list1",
      },

      { regex: /\*\*/,
        token: "starstar t-bold meta",
        next: "s2",
      },
      { regex: /\*/,
        token: "star t-italics meta",
        next: "s1",
      },

      ...textmodes(""),
    ],

    codeblock: [
      { regex: /(.*)(```)/,
        token: ["codeblock", "codeblock codeblock-fence meta"],
        next: "main",
      },
      { regex: /.*/,
        token: "codeblock",
      },
    ],

    list0: list(0),
    list1: list(1),

    // formatting modes
    s2: [
      { regex: /\*\*/,
        token: "starstar t-bold meta",
        next: "main",
      },
      { regex: /\*/,
        token: "star t-bold t-italics meta",
        next: "s3"
      },
      ...fmtmodes(" t-bold"),
    ],
    s1: [
      { regex: /\*\*/,
        token: "starstar t-bold t-italics meta",
        next: "s3",
      },
      { regex: /\*/,
        token: "star t-italics meta",
        next: "main"
      },
      ...fmtmodes(" t-italics"),
    ],
    s3: [
      { regex: /\*\*/,
        token: "starstar t-bold t-italics meta",
        next: "s1",
      },
      { regex: /\*/,
        token: "star t-bold t-italics meta",
        next: "s2"
      },
      ...fmtmodes(" t-bold t-italics"),
    ],
  };
})());
