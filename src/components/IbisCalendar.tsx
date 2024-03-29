import { useState } from "react";
import { dateRange, shortdate, today } from "../util/calendar";
import { useExtern, useExternOr } from "../extern";
import { IbisController } from "../App";
import "./IbisCalendar.css"
import { FacadeExtern } from "../backend";

export function IbisCalendar(props: {
  startDate: Date,
  endDate: Date,
}) {
  const controller = useExtern(IbisController);
  const facade = useExtern(FacadeExtern);
  const listing = useExternOr(facade?.listing, new Set());

  const [startDate, setStartDate] = useState(() => {
    const date = new Date(props.startDate);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date(props.endDate);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  // round down to start of week
  const alignedStart = new Date(startDate);
  alignedStart.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));

  const adjustMonth = (m: number) => (d: Date) => {
    d = new Date(d);
    d.setMonth(d.getMonth() + m);
    return d;
  };

  return <div className="ibis-calendar">
    <div
      role="button"
      onClick={() => {
        setStartDate(adjustMonth(-1));
        setEndDate(adjustMonth(-1));
      }}
    >
      <span>&lt;</span>
    </div>
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
                onClick={() => controller.open(name)}
              >
                {d.getDate()}
              </td>
            })}
          </tr>;
        })}
      </tbody>
    </table>
    <div
      role="button"
      onClick={() => {
        setStartDate(adjustMonth(1));
        setEndDate(adjustMonth(1));
      }}
    >
      <span>&gt;</span>
    </div>
  </div>
}
