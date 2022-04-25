// vim: ft=javascript

import "./weeknumber.js";
import { today, shortdate, Calendar } from "./calendar.js";

openCard("index");
openCard(shortdate(today));
openCard("y" + (today.getWeekYear() % 100) + "w" + today.getWeek());

document.body.prepend(new Calendar());

document.body.appendChild($.e("style", {}, `
ibis-calendar td[month="1"]  { --bg: hsl(0,   100%, 90%); }
ibis-calendar td[month="2"]  { --bg: hsl(30,  100%, 90%); }
ibis-calendar td[month="3"]  { --bg: hsl(60,  100%, 90%); }
ibis-calendar td[month="4"]  { --bg: hsl(90,  100%, 90%); }
ibis-calendar td[month="5"]  { --bg: hsl(120, 100%, 90%); }
ibis-calendar td[month="6"]  { --bg: hsl(150, 100%, 90%); }
ibis-calendar td[month="7"]  { --bg: hsl(180, 100%, 90%); }
ibis-calendar td[month="8"]  { --bg: hsl(210, 100%, 90%); }
ibis-calendar td[month="9"]  { --bg: hsl(240, 100%, 90%); }
ibis-calendar td[month="10"] { --bg: hsl(270, 100%, 90%); }
ibis-calendar td[month="11"] { --bg: hsl(300, 100%, 90%); }
ibis-calendar td[month="12"] { --bg: hsl(330, 100%, 90%); }

ibis-calendar td {
  min-width: 2ch;
  max-width: calc(2ch + 2px);
  text-align: right;
  border: 1px solid var(--bg);
  background: var(--bg);
}

ibis-calendar td:not(.exists) { color: transparent; }
ibis-calendar td.exists { border: 1px solid grey; filter: saturate(3); }


ibis-calendar td.today { filter: saturate(5); }

ibis-calendar > table {
  font: 1em monospace;
  margin: 0 auto;
  border-collapse: separate;
  border-spacing: 0;
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
      if(slug.match(/^\d{1,2}[A-Z][a-z][a-z]\d\d/)) continue;

      this.appendChild($.e("span", {
        role: "button",
        onclick: () => openCard(slug),
      }, slug));
      this.appendChild(document.createTextNode(" "));
    }
  }
});

document.body.appendChild(new Listing());
