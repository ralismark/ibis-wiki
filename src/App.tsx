import { useEffect, useMemo, useState } from "react";
import IbisSearch from "./components/IbisSearch";
import IbisCard from "./components/IbisCard";
import "./App.css"
import { Config, IbisConfig, loadConfig } from "./config";
import { Facade, FacadeExtern } from "./backend";
import { ExternState } from "./extern";
import { dateWeek, dateWeekYear, shortdate, today } from "./util/calendar";
import { IbisListing } from "./components/IbisListing";
import { IbisCalendar } from "./components/IbisCalendar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LsWal } from "./globals";

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
    <IbisCalendar
      startDate={new Date(today.getFullYear(), today.getMonth() - 4)}
      endDate={new Date(today.getFullYear(), today.getMonth() + 2)}
    />

    <IbisSearch
      onSubmit={path => controller.open(path)}
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

    <IbisListing
      filter={k => !k.match(/^\d{1,2}[A-Z][a-z][a-z]\d\d/)}
    />
    <Config onChange={setConfig} />

    <ToastContainer />
  </>
}
