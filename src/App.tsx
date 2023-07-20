import { createContext, useMemo, useState } from "react";
import IbisSearch from "./components/IbisSearch";
import { LocalStorageBackend, MemoryBackend } from "./fs";
import IbisCard from "./components/IbisCard";
import "./App.css"
import { DocumentProvider, DocumentProviderContext } from "./DocumentProvider";
import { Config, IbisConfig, LoadConfig, StorageType } from "./config";

export type IbisController = {
  open(path: string): void,
}

export const IbisController = createContext<IbisController>({
  open() { throw new Error("No Ibis Context") }
});

export function App() {
  const [config, setConfig] = useState<IbisConfig>(LoadConfig);
  const [openPages, setOpenPages] = useState<Array<string>>([]);

  const docs = useMemo(() => {
    switch (config.storageType) {
      case StorageType.None:
        return new DocumentProvider(new MemoryBackend());
      case StorageType.LocalStorage:
        return new DocumentProvider(new LocalStorageBackend());
    }
  }, [config])!;

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

  return <>
    <DocumentProviderContext.Provider value={docs}>
      <IbisController.Provider value={controller}>
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
      </IbisController.Provider>
    </DocumentProviderContext.Provider>
    <Config onChange={setConfig} />
  </>
}
