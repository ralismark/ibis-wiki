// vim: ft=javascript

// day starts at 05:00:00+0
export const today = new Date((new Date()).getTime() - 5*60*60*1000);

export function shortdate(date) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return date.getDate() + monthNames[date.getMonth()] + (date.getFullYear() % 100);
}

export const Calendar = $.define("ibis-calendar", B => class Calendar extends B {
  constructor(props) {
    super(props);
    this.style.display = "block";
    DP.addEventListener("listchanged", () => this.render());
  }

  async doRender() {
    const index = await DP.list();

    const rows = [1,2,3,4,5,6,7].map(() => $.e("tr"));
    const startDate = new Date(today.getFullYear(), today.getMonth() - 4);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2);

    // fill in gaps
    for(let row of rows.slice(0, (startDate.getDay() + 6) % 7)) {
      row.append($.e("td"));
    }

    for(let date = startDate;
        date.getFullYear() != endDate.getFullYear() || date.getMonth() != endDate.getMonth();
        date.setDate(date.getDate() + 1)) {
      const name = shortdate(date);

      const tile = $.e("td", {
          onclick: openCard.bind(null, name),
          title: name,
          style: {
            cursor: "pointer",
          },
          month: date.getMonth() + 1,
          date: date.getDate(),
        },
        "" + date.getDate()
      );

      rows[(date.getDay() + 6) % 7].appendChild(tile);

      if(index.includes(name)) {
        tile.classList.add("exists");
      }
      if(today.getDate() == date.getDate() && today.getMonth() == date.getMonth())
        tile.classList.add("today");
    }

    this.replaceChildren(
      $.e("table", {}, ...rows)
    );
  }
});