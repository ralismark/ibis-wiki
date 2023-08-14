import { useEffect, useMemo, useState } from "react";
import IbisSearch from "./components/IbisSearch";
import IbisCard from "./components/IbisCard";
import "./App.css"
import { Config, IbisConfig, loadConfig, StoreType } from "./config";
import { Backend, BackendContext } from "./backend";
import { LoggingStore, LocalStorageStore, Store, InMemoryStore } from "./backend/store";
import { S3Store } from "./backend/s3";
import { ExternState } from "./extern";
import { dateWeek, dateWeekYear, shortdate, today } from "./calendar";
import { IbisListing } from "./components/IbisListing";
import { IbisCalendar } from "./components/IbisCalendar";
import demoData from "./demoData";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export type IbisController = {
  open(path: string): void,
}

export const IbisController = new ExternState<IbisController>({
  open() { throw new Error("No Ibis Context") }
});

export function App() {
  const [config, setConfig] = useState<IbisConfig>(loadConfig);
  const [openPages, setOpenPages] = useState<Array<string>>([
    "index",
    shortdate(today),
    `y${dateWeekYear(today) % 100}w${dateWeek(today)}`,
  ]);
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

  const backend = useMemo(() => {
    const store: Store = (() => {
      switch (config.storeType) {
        case StoreType.None:
          return new InMemoryStore(demoData);
        case StoreType.LocalStorage:
          return new LocalStorageStore();
        case StoreType.S3:
          return new S3Store(config);
        default:
          throw Error("Invalid store type");
      }
    })();

    return new Backend(
      new LoggingStore(
        store,
      ),
    );
  }, [config]);

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

  useEffect(() => IbisController.set(controller), [controller]);

  return <>
    <BackendContext.Provider value={backend}>
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
    </BackendContext.Provider>
    <Config onChange={setConfig} />

    <ToastContainer />
  </>
}
