"use strict";

const $ = (() => {

  function $(sel) { return document.querySelector(sel); }

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
  }

  $.define = function(name, deriver) {
    let elemType = deriver(ElementBase);
    elemType.extend = deriver;
    customElements.define(name, elemType);
    return elemType;
  }

  $.mix = function(deriver) {
    let kind = deriver(Object);
    kind.extend = deriver;
    return kind;
  }

  $.sleep = function(time) {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  }

  $.frame = function() {
    return new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
  }

  return $;

})();

function batchify(delay, fn, opts = {}) {
  let timeout = null;
  let running = false; // to prevent multiple runs of fn

  function poke() {
    if(timeout !== null) clearTimeout(timeout);
    else if(opts.latch && !running) opts.latch();

    timeout = setTimeout(async () => {
      timeout = null; // clear timeout
      if(running) {
        poke(); // schedule for later
      } else {
        running = true;
        await fn();
        if(opts.unlatch && timeout === null) opts.unlatch();
        running = false;
      }
    }, delay);
  }

  return poke;
}

function multilatch(mlatch, munlatch) {
  let counter = 0;

  function latch() {
    if(counter++ == 0) mlatch();
  }

  return {
    latch: () => { if(counter++ == 0) mlatch(); },
    unlatch: () => { if(--counter == 0) munlatch(); },
  };
}

const PENDING_LATCHES = (() => {
  function warning(e) {
    e.preventDefault();
    return e.returnValue = "tenpo lon la pali li lon. sina wile ala wile tawa?";
  }

  return multilatch(() => {
    console.log("latching PENDING");
    window.addEventListener("beforeunload", warning);
  }, () => {
    console.log("unlatching PENDING");
    window.removeEventListener("beforeunload", warning);
  });
})();
