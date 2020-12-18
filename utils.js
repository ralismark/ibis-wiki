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

  /*
   * Async function to sleep for a certain amount of time
   */
  $.sleep = function(time) {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  }

  /*
   * Async function to wait until next animation frame
   */
  $.frame = function() {
    return new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
  }

  return $;

})();
