export default function $(sel) { return document.querySelector(sel); }

class ElementBase extends HTMLElement {
  doRender() { throw Error("Element.doRender not implemented"); }

  constructor(props={}) {
    super();

    let observed = this.constructor.observedAttributes || [];
    for(let attr in props) {
      if(observed.includes(attr)) {
        this.setAttribute(attr, props[attr]);
      }
    }

    this.constructed = true;
  }

  render() {
    this.doRender();
    this.dispatchEvent(new Event("render"));
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if(this.constructed) {
      this.render();
    }
  }
};

$.define = function(name, deriver) {
  let elemType = deriver(ElementBase);
  elemType.extend = deriver;
  customElements.define(name, elemType);
  return elemType;
};

/*
 * Async function to sleep for a certain amount of time
 */
$.sleep = function(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
};

/*
 * Async function to wait until next animation frame
 */
$.frame = function() {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
};

/*
 * Helper to make Element creation easier
 */
$.e = function(tag, attr, ...ch) {
  const elem = document.createElement(tag);
  Object.entries(attr || {}).forEach(kv => {
    if(kv[0] === "style" && typeof(kv[1]) == "object") {
      Object.entries(kv[1]).forEach(st => {
        elem.style[st[0]] = st[1];
      });
    } else if(kv[0].startsWith("on")) {
      elem.addEventListener(kv[0].substr(2), kv[1]);
    } else {
      elem.setAttribute(kv[0], kv[1])
    }
  });
  ch.flat(Infinity).forEach(e => {
    if(!e) return;
    if(typeof(e) === "string") e = document.createTextNode(e);
    elem.appendChild(e)
  });
  return elem;
};

/*
 * Update stream
 */
$.u = function(prepare) {
  function resolver() {
    let resolve;
    const promise = new Promise(r => resolve = r);
    return { P: promise, R: resolve };
  }

  const head = resolver();
  let tail = head;
  let pretail = head;

  function append(value) {
    pretail = tail;
    tail = resolver()
    pretail.R({ value, next: tail.P });
  }

  async function on(cb) {
    let next = pretail.P;
    while(true) {
      let resolved = await next;
      if(cb(resolved.value) === true) break;
      next = resolve.next;
    }
  }

  return {
    append: append,
    head: head.P,
    next: () => tail.P,
    current: () => pretail.P,
    on: on,
  };
};
