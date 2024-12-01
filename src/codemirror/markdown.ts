import * as md from "@lezer/markdown";
import { Language, HighlightStyle, LanguageSupport, syntaxHighlighting, defineLanguageFacet, languageDataProp, syntaxTree } from "@codemirror/language"
import { styleTags, tags } from "@lezer/highlight";
import { Extension } from "@codemirror/state";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { FacadeExtern } from "../backend";
import { shortdate, today } from "../util/calendar";

// Internal Links -------------------------------------------------------------

const refLinkDelim: md.DelimiterType = { resolve: "RefLink", mark: "RefLinkMark" };

const RefLink: md.MarkdownExtension & Extension = {
  defineNodes: ["RefLink", "RefLinkMark"],
  parseInline: [{
    name: "RefLink",
    before: "Link",
    parse(cx, next, pos) {
      if(next == 91 /* [ */ && cx.char(pos + 1) == 91) {
        return cx.addDelimiter(refLinkDelim, pos, pos + 2, true, false);
      }
      if(next == 93 /* ] */ && cx.char(pos + 1) == 93) {
        return cx.addDelimiter(refLinkDelim, pos, pos + 2, false, true);
      }
      return -1;
    }
  }],
  props: [
    styleTags({
      RefLinkMark: tags.squareBracket,
      RefLink: tags.link,
    }),
  ],
  extension: [
  ],
}

async function refLinkCompletion(context: CompletionContext): Promise<CompletionResult | null> {
  const node = syntaxTree(context.state).resolveInner(context.pos, -1)

  if (node.name === "RefLink") {
    const facade = FacadeExtern.getSnapshot()
    if (!facade) return null

    const todayPath = shortdate(today)

    const listing = facade.listing.getSnapshot()
    const listingArray = Array.from(listing)
    if (!listing.has(todayPath)) listingArray.push(todayPath) // since it might not exist yet

    return {
      from: node.firstChild?.to ?? node.from + 2,
      to: node.to,
      options: [
        // complete [[today]] to the actual card for today
        {
          displayLabel: todayPath,
          label: "today]]",
          apply: todayPath + "]]",
          boost: 1,
        },
        ...listingArray.map(name => ({
          displayLabel: name,
          label: name + "]]",
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
      // TODO disable indent = code and underlined headings
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
        //"BulletList/ListIem/ListMark": tx.ulMark,
        //"OrderedList/ListIem/ListMark": tx.olMark,
        "ListItem/...": tags.list,

        // codeblocks
        "CodeMark": tags.punctuation,
        "InlineCode FencedCode CodeText": tags.monospace,
        "CodeInfo": tags.labelName, // TODO(2021-11-03) is this the right tag?

        // misc things
        "HorizontalRule": tags.contentSeparator,
        "Blockquote/...": tags.quote,
        "QuoteMark": tags.punctuation,
        "URL": tags.link,
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

        // other
        {tag: tags.link, color: "#7777ee", textDecoration: "underline", cursor: "pointer"},
      ]),
    )
  ],
);
