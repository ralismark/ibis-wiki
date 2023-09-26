import winkNLP from "wink-nlp"
import model from "wink-eng-lite-web-model"

const nlp = winkNLP(model, [])

export default function tokenise(text: string): string[] {
  return nlp.readDoc(text)
    .tokens()
    .filter(t => t.out(nlp.its.type) === "word" && !t.out(nlp.its.stopWordFlag))
    .out(nlp.its.stem, nlp.as.unique)
}

console.log("tokenise", tokenise)
