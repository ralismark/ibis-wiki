"use strict";

const CARDBOX = $("#cardbox");

/*
 * Opens a new card into the window
 */
function openCard(name) {
  name = name.trim();

  let targetCard = null;
  if(!DUPLICATE_CARDS) {
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

  constructor(props) {
    super(props);

    // import
    const {EditorView} = CM.view;

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

const Datalist = $.define("ibis-datalist", B => class Datalist extends B {
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
