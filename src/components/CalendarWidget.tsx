import "./CalendarWidget.css"
import { useState } from "react"
import { FacadeExtern } from "../backend"
import { useExtern, useExternOr } from "../extern"
import { WidgetControl, IWidget } from "./Widget"
import { dateRange, shortdate, today } from "../util/calendar"
import { FileWidget } from "./FileWidget"

export class CalendarWidget implements IWidget {
  className(): string { return "CalendarWidget" }

  show(ctl: WidgetControl): [JSX.Element, JSX.Element] {
    const facade = useExtern(FacadeExtern)
    const listing = useExternOr(facade?.listing, new Set())

    const [startDate, setStartDate] = useState(() => new Date(today.getFullYear(), today.getMonth() - 4))
    const [endDate, setEndDate] = useState(() => new Date(today.getFullYear(), today.getMonth() + 2))

    // round down to start of week
    const alignedStart = new Date(startDate);
    alignedStart.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));

    const adjustMonth = (m: number) => (d: Date) => {
      d = new Date(d);
      d.setMonth(d.getMonth() + m);
      return d;
    }

    return [
      <>
        <button
          onClick={() => {
            setStartDate(adjustMonth(1));
            setEndDate(adjustMonth(1));
          }}
        >
          &gt;
        </button>
        <button
          onClick={() => {
            setStartDate(adjustMonth(-1));
            setEndDate(adjustMonth(-1));
          }}
        >
          &lt;
        </button>
      </>,
      <>
        <table role="grid">
          <tbody>

            {[0, 1, 2, 3, 4, 5, 6].map(offset => {
              const rowStart = new Date(alignedStart);
              rowStart.setDate(rowStart.getDate() + offset);
              return <tr key={offset}>
                {Array.from(dateRange(rowStart, endDate, 7)).map(d => {
                  if (d < startDate) return <td key={d.getTime()}/>;
                  const name = shortdate(d);
                  return <td
                    key={d.getTime()}
                    title={name}
                    data-today={d.getTime() === today.getTime() || undefined}
                    data-exists={listing.has(name) || undefined}
                    data-month={d.getMonth() + 1}
                    data-year={d.getFullYear() % 100}
                    data-date={d.getDate()}
                    onClick={() => ctl.open(new FileWidget(name))}
                  >
                    {d.getDate()}
                  </td>
                })}
              </tr>;
            })}

          </tbody>
        </table>

      </>
    ]
  }
}
