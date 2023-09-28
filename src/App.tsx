import { useEffect, useMemo, useState } from "react";
import { IbisSearch, IbisCard, IbisCalendar } from "./components"
import { Config, IbisConfig, loadConfig } from "./config";
import { Facade, FacadeExtern } from "./backend";
import { ExternState, useExtern, useExternOr } from "./extern";
import { dateWeek, dateWeekYear, shortdate, today } from "./util/calendar";
import { LsWal } from "./globals";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css"
import { NumSyncing } from "./backend/file";

export type IbisController = {
  // ui bits
  open(path: string): void
}

const DummyIbisController: IbisController = {
  open(_path: string) {},
}

// This needs to be a global since we need to access it from CodeMirror
// widgets, which aren't managed within react.
export const IbisController = new ExternState<IbisController>(DummyIbisController);

function Navbar() {
  // TODO aria for syncing icon

  const syncing = useExtern(NumSyncing)

  return <nav className="navbar">
    <div className="left">
    </div>
    <div className="mid">
      <IbisSearch />
    </div>
    <div className="right">
      <div
        className="dirty"
        title={syncing ? syncing + " dirty" : "all synced!"}
        aria-label="Dirty"
        aria-checked={syncing > 0}
      />
    </div>
  </nav>
}

function Listing() {
  const controller = useExtern(IbisController)
  const facade = useExtern(FacadeExtern)
  const listing = useExternOr(facade?.listing, new Set());

  const pat = /^\d{1,2}[A-Z][a-z][a-z]\d\d/

  return <details className="all-cards">
    <summary>All Cards</summary>
    <ul>
      {Array.from(listing)
        .filter(path => !path.match(pat))
        .map(path => <li key={path}>
          <a
            href=""
            onClick={e => { e.preventDefault(); controller.open(path) }}
          >
            {path}
          </a>
        </li>)}
    </ul>
  </details>
}

export function App() {
  const [config, setConfig] = useState<IbisConfig>(loadConfig);
  const [openPages, setOpenPages] = useState<Array<string>>(() => {
    const init = [
      "index",
      shortdate(today),
      `y${dateWeekYear(today) % 100}w${dateWeek(today)}`,
    ];
    const wals = LsWal.keys().filter(f => !init.includes(f));
    return [...init, ...wals]
  });

  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => {
    const card = document.querySelector(`.ibis-card[data-path="${focus}"]`);
    if (card) {
      card.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      (document.activeElement as HTMLElement | undefined)?.blur();
    }
  }, [focus]);

  // TODO React's strict mode causes us to create a duplicate backend, which
  // might cause bad behaviour when dealing with unsaved changes

  const facade: Facade = useMemo(() => {
    return Facade.fromConfig(config);
  }, [config]);

  useEffect(() => {
    FacadeExtern.set(facade)
    return () => FacadeExtern.set(null)
  }, [facade]);

  const controller: IbisController = useMemo(() => ({
    open(path: string) {
      setOpenPages(openPages => {
        if (openPages.includes(path)) {
          return openPages;
        } else {
          return [...openPages, path];
        }
      });

      setFocus(path);
    },
  }), []);

  useEffect(() => {
    IbisController.set(controller)
    return () => IbisController.set(DummyIbisController)
  }, [controller]);

  return <>
    <Navbar />

    <IbisCalendar
      startDate={new Date(today.getFullYear(), today.getMonth() - 4)}
      endDate={new Date(today.getFullYear(), today.getMonth() + 2)}
    />

    <div className="ibis-cards" data-layout-row={config.layoutRow || undefined}>
      {openPages.map((path, i) => <IbisCard
        key={path}
        path={path}
        onRemove={() => {
          const copy = [...openPages];
          copy.splice(i, 1);
          setOpenPages(copy);
        }}
      />)}
    </div>

    <Listing />

    <Config onChange={setConfig} />

    <ToastContainer />
  </>
}
