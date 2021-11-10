import * as md from "https://cdn.skypack.dev/@lezer/markdown@^0.15.1";
import {LRLanguage, LanguageSupport} from "https://cdn.skypack.dev/@codemirror/language@^0.19.0";
import {styleTags, Tag, HighlightStyle, tags} from "https://cdn.skypack.dev/@codemirror/highlight@^0.19.0";
import {EditorView} from "https://cdn.skypack.dev/@codemirror/view@^0.19.0";

// internal links
const RefLinkDelim = { resolve: "RefLink", mark: "RefLinkMark" };
const RefLink = {
  defineNodes: ["RefLink", "RefLinkMark"],
  parseInline: [{
    name: "reflink",
    before: "Link",
    parse(cx, next, pos) {
      if(next == 91 /* [ */ && cx.char(pos + 1) == 91)
        return cx.addDelimiter(RefLinkDelim, pos, pos + 2, true, false);
      if(next == 93 /* ] */ && cx.char(pos + 1) == 93)
        return cx.addDelimiter(RefLinkDelim, pos, pos + 2, false, true);
      return -1;
    }
  }],
}

// new tags
const tx = {
  refLink: Tag.define(tags.link),
  urlLink: Tag.define(tags.link),

  ulMark: Tag.define(tags.annotation),
  olMark: Tag.define(tags.annotation),
};

const tagSpec = {
  // special bits
  RefLinkMark: tags.squareBracket,
  RefLink: tx.refLink,
  URL: tx.urlLink,

  // formatting
  "Emphasis/...": tags.emphasis,
  "StrongEmphasis/...": tags.strong,
  EmphasisMark: tags.punctuation,
  "Strikethrough/...": tags.strikethrough,
  StrikethroughMark: tags.punctuation,

  // headings
  HeaderMark: tags.punctuation,
  "ATXHeading1/... SetextHeading1/...": tags.heading1,
  "ATXHeading2/... SetextHeading2/...": tags.heading2,
  "ATXHeading3/...": tags.heading3,
  "ATXHeading4/...": tags.heading4,
  "ATXHeading5/...": tags.heading5,
  "ATXHeading6/...": tags.heading6,

  // lists
  "BulletList/ListIem/ListMark": tx.ulMark,
  "OrderedList/ListIem/ListMark": tx.olMark,
  "ListItem/...": tags.list,

  // codeblocks
  CodeMark: tags.punctuation,
  "InlineCode FencedCode CodeText": tags.monospace,
  CodeInfo: tags.labelName, // TODO(2021-11-03) is this the right tag?

  // misc things
  HorizontalRule: tags.contentSeparator,
  "Blockquote/...": tags.quote,
  QuoteMark: tags.punctuation,
};

export const parser = md.parser.configure([
  md.Strikethrough,
  RefLink,
  {props: [styleTags(tagSpec)]},
]);

//export const showParse = x => longParse(parser, x);

const language = new LanguageSupport(LRLanguage.define({
    parser: parser,
    languageData: {},
}));

/*
 * Syntax highlighting
 */
const highlighting = HighlightStyle.define([
  // fallbacks
  {tag: tags.punctuation, color: "rgb(127.5, 127.5, 127.5)"},

  {tag: tx.refLink, class: "cm-link cm-js-reflink"},
  {tag: tx.urlLink, class: "cm-link cm-js-urllink"},

  // standard formatting tags
  {tag: tags.emphasis, fontStyle: "italic"},
  {tag: tags.strong, fontWeight: "bold"},
  {tag: tags.monospace, fontFamily: "monospace"},
  {tag: tags.strikethrough, textDecoration: "line-through"},

  // headings
  {tag: tags.heading1, fontSize: "1.5em"},
  {tag: tags.heading2, fontSize: "1.4em"},
  {tag: tags.heading3, fontSize: "1.3em"},
  {tag: tags.heading, fontSize: "1.2em"},
]);

/*
 * Links
 */

const linkHandler = EditorView.domEventHandlers({
  mousedown(e, view) {
    const classes = e.target.classList;
    if(classes.contains("cm-js-reflink")) {
      window.openCard(e.target.innerText.trim());
    } else if(classes.contains("cm-js-urllink")) {
      window.open(e.target.innerText.replace(/^\s*<\s*|\s*>\s*$/g, ""), "_blank", "noopener,noreferrer");
    } else {
      return false;
    }
    return true;
  }
});

export const extensions = [language, highlighting, linkHandler];
