"use strict";

function openCard(name) {
  name = name.trim();

  let targetCard = null;
  for(let card of document.querySelectorAll('ibis-card')) {
    if(card.slug === name) {
      targetCard = card;
      break;
    }
  }

  if(targetCard === null) {
    targetCard = new Card({ slug: name });
    document.body.appendChild(targetCard);
  }

  console.log("going to", targetCard);
  targetCard.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });

  document.activeElement.blur();

  targetCard.classList.add("opened");
  $.frame().then($.frame).then(() => targetCard.classList.remove("opened"));
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

    this.codemirror.on("mousedown", ({}, event) => {
      const target = event.target;
      if(!target.classList.contains("cm-local-link")) return;

      if(event.button === 0) {
        event.preventDefault();
        event.codemirrorIgnore = true;

        openCard(event.target.innerText);
      }
    });

    this.load();
  }

  async load() {
    this.setAttribute("loading", "");
    const slug = this.slug;
    const rdoc = await DP.getRootDocument(slug);

    // Only apply change if we actually need to
    if(this.slug === slug && this.shownSlug !== slug) {
      this.removeAttribute("loading");
      Doc.linkCodemirror(this.codemirror, rdoc);
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

  constructor(props) {
    // don't have slug as an attribute
    super(props);
    let { slug } = props;

    this.inner = new View(slug ? { slug } : {});

    const closeButton = document.createElement("a");
    closeButton.innerText = "X";
    closeButton.href = "##";
    closeButton.onclick = e => {
      e.preventDefault();
      this.parentNode.removeChild(this);
    };

    const label = document.createElement("span");
    label.innerText = this.slug;

    const title = document.createElement("h1");
    title.appendChild(closeButton);
    title.append(" ");
    title.appendChild(label);

    this.appendChild(title);
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

  async render() {
    const links = document.createElement("div");
    const datalist = document.createElement("datalist");
    datalist.id = "index";

    const searchBox = document.createElement("input");
    searchBox.setAttribute("list", "index");

    const form = document.createElement("form");
    form.replaceChildren(searchBox, datalist);
    form.onsubmit = e => {
      e.preventDefault();
      openCard(searchBox.value);
    };

    this.replaceChildren(form, links);

    // this may take time, so we set up the elements first
    const slugs = await DP.knownSlugs();

    const linkItems = slugs.map(slug => {
      const item = document.createElement("a");
      item.innerText = slug;
      item.href = "##";
      item.onclick = e => {
        e.preventDefault();
        openCard(slug);
      };
      return item;
    });
    links.replaceChildren(...linkItems);

    const datalistItems = slugs.map(slug => {
      const item = document.createElement("option");
      item.value = slug;
      return item;
    });
    datalist.replaceChildren(...datalistItems);

  }
});
