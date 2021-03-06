import * as api from "./api.mjs";
import $ from "./dollar.mjs";
import {DP} from "./fs.mjs";
import {schema} from "./config.mjs";


import {EditorView} from "@codemirror/view";


export const CARDBOX = $("#cardbox");

/*
 * Opens a new card into the window
 */
export function openCard(name) {
  name = name.trim();

  let targetCard = null;
  if(!schema.DUPLICATE_CARDS.get()) {
    for(let card of CARDBOX.querySelectorAll("ibis-card")) {
      if(card.slug === name) {
        targetCard = card;
        break;
      }
    }
  }

  if(targetCard === null) {
    targetCard = new Card({ slug: name });
    CARDBOX.appendChild(targetCard);
  }

  targetCard.focus();
}

// TODO 2021-11-12 remove functionality to change a card's slug

export const View = $.define("ibis-view", B => class View extends B {
  static get observedAttributes() {
    return [ "slug" ];
  }

  get slug() {
    let slug = this.getAttribute("slug");
    if(!slug) throw Error("missing attribute 'slug'");
    return slug;
  }
  set slug(val) { this.setAttribute("slug", val); }

  constructor(props) {
    super(props);

    this.view = new EditorView({
      state: DP.pendingState,
      parent: this,
    });
    this.shownSlug = null;
  }

  async doRender() {
    const slug = this.slug;
    if(slug == this.shownSlug) return;

    this.setAttribute("loading", "1");
    const rdoc = await DP.open(slug);

    // Only apply change if we actually need to
    if(this.slug === slug && this.shownSlug !== slug) {
      this.removeAttribute("loading");
      this.view.setState(rdoc);
      this.shownSlug = slug;
    }
  }
});

export const Card = $.define("ibis-card", B => class Card extends B {
  get slug() { return this.inner.slug; }
  set slug(val) { this.inner.slug = val; }

  get content() { return this.inner.content; }

  async focus() {
    this.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    document.activeElement.blur();

    this.classList.add("opened");
    await $.frame();
    await $.frame();
    this.classList.remove("opened");
  }

  constructor(props) {
    // don't have slug as an attribute
    super(props);
    let { slug } = props;

    this.inner = new View(slug ? { slug } : {});

    const button = (name, onclick) => $.e("span", {
      class: "card-button",
      role: "button",
      onclick: (e) => onclick(),
    }, name);

    const label = $.e("span", {}, this.slug);

    this.appendChild($.e("h1", {},
        label,
        button("??", () => this.parentNode.removeChild(this)),
        button("???", () => {
          if(!this.previousElementSibling) return;
          this.previousElementSibling.insertAdjacentElement("beforebegin", this);
          this.focus();
        }),
        button("???", () => {
          if(!this.nextElementSibling) return;
          this.nextElementSibling.insertAdjacentElement("afterend", this);
          this.focus();
        }),
    ));
    this.appendChild(this.inner);
    this.inner.addEventListener("render", () => label.innerText = this.slug);
  }

  render() {}
});

export const Datalist = $.define("ibis-datalist", B => class Datalist extends B {
  constructor(props) {
    super(props);

    DP.addEventListener("listchanged", () => this.render());
  }

  async doRender() {
    const datalist = $.e("datalist", {id: "index"});

    for(let slug of await DP.list()) {
      datalist.appendChild($.e("option", {value: slug}));
    }

    this.replaceChildren(datalist);
  }
});

/*
 * A search bar element that allows you to also open new documents
 */
export const Search = $.define("ibis-search", B => class Search extends B {
  constructor(props) {
    super(props);
    this.style.display = "block";
  }

  async doRender() {
    const searchBox = document.createElement("input");
    searchBox.setAttribute("list", "index");

    const form = document.createElement("form");
    form.replaceChildren(searchBox);
    form.onsubmit = e => {
      e.preventDefault();
      openCard(searchBox.value);
    };

    this.replaceChildren(form);
  }
});

/*
 * Configuration menu
 */
export const ConfigCard = $.define("ibis-config", B => class ConfigCard extends B {
  constructor(props) {
    super(props);
  }

  makeInput(key, value) {
    if(typeof(value.default) === "boolean") {
      const el = $.e("input", {
        id: `config-${key}`,
        type: "checkbox",
        onchange(ev) {
          value.set(el.checked);
        },
      });
      el.checked = value.get();
      return el;
    } else if(typeof(value.default) === "number") {
      const el = $.e("input", {
        id: `config-${key}`,
        type: "number",
        onchange(ev) {
          value.set(el.value);
        },
      });
      el.value = value.get();
      return el;
    } else if(typeof(value.default) === "string") {
      if(value.options !== undefined) {
        const el = $.e("select", {
          id: `config-${key}`,
          onchange(ev) {
            value.set(el.value);
          },
        }, ...value.options.map(o => $.e("option", value.get() === o ? { selected: 1 } : {}, o)));
        return el;
      } else {
        const el = $.e("input", {
          id: `config-${key}`,
          type: "text",
          onchange(ev) {
            value.set(el.value);
          },
        });
        el.value = value.get();
        return el;
      }
    }
    return "<unrepresentable>";
  }

  async doRender() {
    const inner = $.e("table", {},
      Object.entries(schema).flatMap(([key, value]) => {
        return [
          $.e("tr", {},
            $.e("th", { scope: "row" }, $.e("label", { for: `config-${key}` }, key)),
            $.e("td", {}, this.makeInput(key, value)),
          ),
          $.e("tr", { style: { whiteSpace: "pre-wrap" } }, $.e("td", { colspan: 2 }, value.help)),
        ];
      })
    );

    this.replaceChildren(inner);
  }
});
