import $ from "./dollar.mjs";

export function reportError(error) {
  const elem = $.e("div", {
    class: "error",
    onclick: () => elem.parentNode.removeChild(elem),
  }, error);
  $("#errors").appendChild(elem);
}
