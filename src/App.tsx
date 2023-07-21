import { useEffect, useMemo, useState } from "react";
import IbisSearch from "./components/IbisSearch";
import IbisCard from "./components/IbisCard";
import "./App.css"
import { Config, IbisConfig, LoadConfig, StoreType } from "./config";
import { Backend, BackendContext } from "./backend";
import { LoggingStore, LocalStorageStore, Store, InMemoryStore } from "./backend/store";
import { S3Store } from "./backend/s3";
import { ExternState } from "./extern";
import { dateWeek, dateWeekYear, shortdate, today } from "./calendar";
import { IbisListing } from "./components/IbisListing";
import { IbisCalendar } from "./components/IbisCalendar";

export type IbisController = {
  open(path: string): void,
}

export const IbisController = new ExternState<IbisController>({
  open() { throw new Error("No Ibis Context") }
});

export function App() {
  const [config, setConfig] = useState<IbisConfig>(LoadConfig);
  const [openPages, setOpenPages] = useState<Array<string>>([
    "index",
    shortdate(today),
    `y${dateWeekYear(today)}w${dateWeek(today)}`,
  ]);

  const backend = useMemo(() => {
    const store: Store = (() => {
      switch (config.storeType) {
        case StoreType.None:
          return new InMemoryStore();
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
          // TODO jump to it or sth
          return openPages;
        } else {
          return [...openPages, path];
        }
      });
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

      {openPages.map((slug, i) => <IbisCard
        key={slug}
        slug={slug}
        onRemove={() => {
          const copy = [...openPages];
          copy.splice(i, 1);
          setOpenPages(copy);
        }}
      />)}
      <IbisListing
        filter={k => !k.match(/^\d{1,2}[A-Z][a-z][a-z]\d\d/)}
      />
    </BackendContext.Provider>
    <Config onChange={setConfig} />
  </>
}
