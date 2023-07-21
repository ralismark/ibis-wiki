import { useContext } from "react";
import { BackendContext } from "../backend";
import { dateRange, shortdate, today } from "../calendar";
import { useAsync, useExtern } from "../extern";
import { IbisController } from "../App";
import "./IbisCalendar.css"

export function IbisCalendar(props: {
  startDate: Date,
  endDate: Date,
}) {
  const backend = useContext(BackendContext);
  const controller = useExtern(IbisController);

  const list = backend ? useAsync(useExtern(backend.listing), {}) : {};

  // round down to start of day
  const startDate = new Date(props.startDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(props.endDate);
  endDate.setHours(0, 0, 0, 0);

  // round down to start of week
  const alignedStart = new Date(startDate);
  alignedStart.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));

  return <table className="ibis-calendar">
    {[0, 1, 2, 3, 4, 5, 6].map(offset => {
      const rowStart = new Date(alignedStart);
      rowStart.setDate(rowStart.getDate() + offset);
      return <tr>
        {Array.from(dateRange(rowStart, endDate, 7)).map(d => {
          if (d < startDate) return <td/>;
          const name = shortdate(d);
          return <td
            title={name}
            data-today={d.getTime() === today.getTime() || undefined}
            data-exists={name in list || undefined}
            data-month={d.getMonth()}
            data-date={d.getDate()}
            onClick={() => controller.open(name)}
          >
            {d.getDate()}
          </td>
        })}
      </tr>;
    })}
  </table>
}
