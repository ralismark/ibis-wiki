"use strict";

const CARDBOX = $("#cardbox");

/*
 * Opens a new card into the window
 */
function openCard(name) {
  name = name.trim();

  let targetCard = null;
  for(let card of CARDBOX.querySelectorAll("ibis-card")) {
    if(card.slug === name) {
      targetCard = card;
      break;
    }
  }

  if(targetCard === null) {
    targetCard = new Card({ slug: name });
    CARDBOX.appendChild(targetCard);
  }

  targetCard.focus();
}

const View = $.define("ibis-view", B => class View extends B {
  static get observedAttributes() {
    return [ "slug" ];
  }

  get slug() {
    let slug = this.getAttribute("slug");
    if(!slug) throw Error("missing attribute 'slug'");
    return slug;
  }
  set slug(val) { this.setAttribute("slug", val); }

  get content() { return this.codemirror.getValue(); }
  get doc() { return this.codemirror.getDoc(); }

  constructor(props) {
    super(props);

    this.codemirror = CodeMirror(this, {
      readOnly: true,
      lineWrapping: true,
      cursorBlinkRate: 0,
    });
    this.codemirror.getWrapperElement().classList.add("CodeMirror-readonly");

    this.codemirror.on("mousedown", ({}, event) => {
      const classList = event.target.classList;
      if(!classList.contains("cm-js-click")) return;
      if(event.button !== 0) return;
      event.preventDefault();
      event.codemirrorIgnore = true;

      if(classList.contains("cm-js-click-opencard")) {
        openCard(event.target.innerText.trim());
      } else if(classList.contains("cm-js-click-unlock")) {
        this.codemirror.getDoc().setValue("");
      } else if(classList.contains("cm-js-click-openlink")) {
        window.open(event.target.innerText.trim(), "_blank", "noopener,noreferrer");
      }
    });

    this.load();
  }

  async load() {
    this.setAttribute("loading", "1");
    const slug = this.slug;
    const rdoc = await DP.open(slug);

    // Only apply change if we actually need to
    if(this.slug === slug && this.shownSlug !== slug) {
      this.removeAttribute("loading");
      this.codemirror.swapDoc(rdoc.linkedDoc({ sharedHist: true }));
      this.codemirror.setOption("readOnly", false);
      this.shownSlug = slug;
    }
  }

  doRender() {
    if(this.slug !== this.shownSlug) {
      // sync up the slug if needed
      this.load();
    }

    this.codemirror.refresh();
  }
});

const Card = $.define("ibis-card", B => class Card extends B {
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
        button("×", () => this.parentNode.removeChild(this)),
        button("↑", () => {
          if(!this.previousElementSibling) return;
          this.previousElementSibling.insertAdjacentElement("beforebegin", this);
          this.focus();
        }),
        button("↓", () => {
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

const Index = $.define("ibis-index", B => class Index extends B {
  constructor(props) {
    super(props);

    DP.addEventListener("listchanged", () => this.render());
  }

  async doRender() {
    const links = document.createElement("div");
    const datalist = document.createElement("datalist");
    datalist.id = "index";

    for(let slug of await DP.list()) {
      links.appendChild($.e("span", {
        role: "button",
        onclick: () => openCard(slug),
      }, slug));
      links.appendChild(document.createTextNode(" "));

      datalist.appendChild($.e("option", { value: slug }));
    }

    this.replaceChildren(links, datalist);
  }
});

/*
 * A search bar element that allows you to also open new documents
 */
const Search = $.define("ibis-search", B => class Search extends B {
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
