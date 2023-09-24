// day starts at 05:00:00+0
export const today: Date = (() => {
  const ref = new Date((new Date()).getTime() - 5*60*60*1000);
  ref.setHours(0, 0, 0, 0);
  return ref;
})();

export function shortdate(date: Date) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return date.getDate() + monthNames[date.getMonth()] + (date.getFullYear() % 100);
}

// Returns the ISO week of the date.
//
// Source: https://weeknumber.com/how-to/javascript
export function dateWeek(date: Date): number {
  date = new Date(date.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  const week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                        - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Returns the four-digit year corresponding to the ISO week of the date.
//
// Source: https://weeknumber.com/how-to/javascript
export function dateWeekYear(date: Date): number {
  date = new Date(date.getTime());
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  return date.getFullYear();
}

export function* dateRange(start: Date, end: Date, step: number = 1): Generator<Date, void, unknown> {
  const d = start;
  while (d < end) {
    yield new Date(d);
    d.setDate(d.getDate() + step);
  }
}
