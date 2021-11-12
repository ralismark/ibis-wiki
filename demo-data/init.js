// vim: ft=javascript


import { today, shortdate, Calendar } from "./calendar.js";

openCard("index");
openCard(shortdate(today));

document.body.prepend(new Calendar());

document.body.appendChild($.e("style", {}, `
ibis-calendar td {
  min-width: 2ch;
  max-width: 2ch;
  text-align: right;
}

ibis-calendar td:not(.exists) { color: transparent; }

ibis-calendar td[month="1"]  { background: hsl(0,   100%, 90%); }
ibis-calendar td[month="2"]  { background: hsl(30,  100%, 90%); }
ibis-calendar td[month="3"]  { background: hsl(60,  100%, 90%); }
ibis-calendar td[month="4"]  { background: hsl(90,  100%, 90%); }
ibis-calendar td[month="5"]  { background: hsl(120, 100%, 90%); }
ibis-calendar td[month="6"]  { background: hsl(150, 100%, 90%); }
ibis-calendar td[month="7"]  { background: hsl(180, 100%, 90%); }
ibis-calendar td[month="8"]  { background: hsl(210, 100%, 90%); }
ibis-calendar td[month="9"]  { background: hsl(240, 100%, 90%); }
ibis-calendar td[month="10"] { background: hsl(270, 100%, 90%); }
ibis-calendar td[month="11"] { background: hsl(300, 100%, 90%); }
ibis-calendar td[month="12"] { background: hsl(330, 100%, 90%); }
ibis-calendar td.today { filter: saturate(5); }

ibis-calendar > table {
  font: .9em monospace;
  border-collapse: collapse;
  margin: 0 auto;
}

ibis-calendar {
  max-width: 100%;
  overflow-x: auto;
  margin: 1em;
  padding: 1em 0;
}
  `));

const Listing = $.define("ibis-listing", B => class Listing extends B {
  constructor(props) {
    super(props);
    this.style.display = "block";
    DP.addEventListener("listchanged", () => this.render());
  }

  async doRender() {
    const index = await DP.list();

    // clear node
    this.replaceChildren();

    for(let slug of index) {
      this.appendChild($.e("span", {
        role: "button",
        onclick: () => openCard(slug),
        style: {
          margin: "0 1ch",
        },
      }, slug));
      this.appendChild(document.createTextNode(" "));
    }
  }
});

document.body.appendChild(new Listing());
