import winkNLP from "wink-nlp"
import model from "wink-eng-lite-web-model"

const nlp = winkNLP(model, [])

export function tokenise(text: string): string[] {
  return nlp.readDoc(text)
    .tokens()
    .filter(t => t.out(nlp.its.type) === "word" && !t.out(nlp.its.stopWordFlag))
    .out(nlp.its.stem, nlp.as.unique)
}

const refPattern = /\[\[([^\r\n\[\]]+)\]\]/g
export function outlinks(text: string): string[] {
  const out = new Set<string>()
  for (let [_, target] of text.matchAll(refPattern)) {
    target = target.trim()
    if (target === "") continue
    out.add(target)
  }

  return Array.from(out)
}
