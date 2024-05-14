import * as md from "@lezer/markdown";
import { Language, HighlightStyle, LanguageSupport, syntaxHighlighting, defineLanguageFacet, languageDataProp, syntaxTree } from "@codemirror/language"
import { styleTags, tags, Tag } from "@lezer/highlight";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { IbisController } from "../App";
import { FileWidget } from "../components/FileWidget"
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { FacadeExtern } from "../backend";
import { shortdate, today } from "../util/calendar";

// new tags
const tx = {
  refLink: Tag.define(tags.link),
  urlLink: Tag.define(tags.link),

  ulMark: Tag.define(tags.annotation),
  olMark: Tag.define(tags.annotation),
};

// Internal Links -------------------------------------------------------------

const refLinkDelim: md.DelimiterType = { resolve: "RefLink", mark: "RefLinkMark" };

const RefLink: md.MarkdownExtension & Extension = {
  defineNodes: ["RefLink", "RefLinkMark"],
  parseInline: [{
    name: "reflink",
    before: "Link",
    parse(cx, next, pos) {
      if(next == 91 /* [ */ && cx.char(pos + 1) == 91)
        return cx.addDelimiter(refLinkDelim, pos, pos + 2, true, false);
      if(next == 93 /* ] */ && cx.char(pos + 1) == 93)
        return cx.addDelimiter(refLinkDelim, pos, pos + 2, false, true);
      return -1;
    }
  }],
  props: [
    styleTags({
      RefLinkMark: tags.squareBracket,
      RefLink: tx.refLink,
      URL: tx.urlLink,
    }),
  ],
  extension: [
    syntaxHighlighting(
      HighlightStyle.define([
        {tag: tx.refLink, class: "cm-ibis-link cm-ibix-reflink"},
        {tag: tx.urlLink, class: "cm-ibis-link cm-ibix-urllink"},
      ]),
    ),
    EditorView.domEventHandlers({
      mousedown(e: MouseEvent, _view) {
        if (!(e.target instanceof HTMLElement)) return;
        const classes = e.target.classList;
        if (classes.contains("cm-ibix-reflink")) {
          IbisController.getSnapshot().open(new FileWidget(e.target.innerText.trim()))
        } else if(classes.contains("cm-ibix-urllink")) {
          window.open(e.target.innerText.replace(/^\s*<\s*|\s*>\s*$/g, ""), "_blank", "noopener,noreferrer");
        } else {
          return false;
        }
        return true;
      }
    })
  ],
}

async function refLinkCompletion(context: CompletionContext): Promise<CompletionResult | null> {
  const node = syntaxTree(context.state).resolveInner(context.pos, -1)
  if (node.name === "RefLink") {
    const facade = FacadeExtern.getSnapshot()
    if (!facade) return null

    const todayPath = shortdate(today)

    return {
      from: node.firstChild?.to ?? node.from + 2,
      to: node.lastChild?.from ?? context.pos,
      options: [
        {
          label: "today",
          displayLabel: todayPath,
          apply: todayPath,
          boost: 1,
        },
        // since it might not exist yet
        {
          label: todayPath,
          boost: 1,
        },
        ...Array.from(facade.listing.getSnapshot()).map(name => ({
          label: name,
        }))
      ],
      validFor: /[^\[]+/,
    }
  }
  return null
}

// Language Definition --------------------------------------------------------

// compatibility between `@lezer/markdown` and `@codemirror/language`, since
// `MarkdownParser` is not a `LRParser`.
function defineMdLanguage(spec: {
  name?: string,
  parser: md.MarkdownParser,
  languageData?: {[key: string]: any},
}): Language {
  // based on <https://github.com/codemirror/language/blob/432b09a68c2ea72c35b8c7e9e8b41cc92eaa5fe5/src/language.ts#L174-L189>
  const data = defineLanguageFacet(spec.languageData);
  return new Language(
    data,
    spec.parser.configure({ props: [languageDataProp.add(type => type.isTop ? data : undefined)] }),
    [],
    spec.name,
  );
}

export default new LanguageSupport(
  defineMdLanguage({
    name: "markdown",
    parser: md.parser.configure([
      md.Strikethrough,
      RefLink,
      {props: [styleTags({
        // formatting
        "Emphasis/...": tags.emphasis,
        "StrongEmphasis/...": tags.strong,
        "EmphasisMark": tags.punctuation,
        "Strikethrough/...": tags.strikethrough,
        "StrikethroughMark": tags.punctuation,

        // headings
        "HeaderMark": tags.punctuation,
        "ATXHeading1/...": tags.heading1,
        "ATXHeading2/...": tags.heading2,
        "ATXHeading3/...": tags.heading3,
        "ATXHeading4/...": tags.heading4,
        "ATXHeading5/...": tags.heading5,
        "ATXHeading6/...": tags.heading6,

        // lists
        "BulletList/ListIem/ListMark": tx.ulMark,
        "OrderedList/ListIem/ListMark": tx.olMark,
        "ListItem/...": tags.list,

        // codeblocks
        "CodeMark": tags.punctuation,
        "InlineCode FencedCode CodeText": tags.monospace,
        "CodeInfo": tags.labelName, // TODO(2021-11-03) is this the right tag?

        // misc things
        "HorizontalRule": tags.contentSeparator,
        "Blockquote/...": tags.quote,
        "QuoteMark": tags.punctuation,
      })]}
    ]),
    languageData: {
      autocomplete: refLinkCompletion,
    },
  }),
  [
    RefLink,
    syntaxHighlighting(
      HighlightStyle.define([
        // fallbacks
        {tag: tags.punctuation, color: "rgb(127.5, 127.5, 127.5)"},

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
      ]),
    )
  ],
);
