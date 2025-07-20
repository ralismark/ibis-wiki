import "./App.css"
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { IbisConfig, loadConfig } from "./config";
import { Facade, FacadeExtern } from "./backend";
import { ExternState, useExtern } from "./extern";
import { LsWal, QUERY_PARAM_WIDGETS } from "./globals";
import { ToastContainer, toast } from "react-toastify";
import { NumDirty, NumSyncing } from "./backend/file";
import { SiteControl, DummySiteControl, Widget, WidgetControl, widgetToRepr, reprToWidget } from "./components/Widget";
import { FileWidget, TodayWidget } from "./components/FileWidget";
import { ConfigWidget } from "./components/ConfigWidget";
import { CalendarWidget } from "./components/CalendarWidget";
import { IbisSearch } from "./components/IbisSearch";

// This needs to be a global since we need to access it from CodeMirror
// widgets, which aren't managed within react.
export const IbisController = new ExternState<SiteControl>(DummySiteControl)

function SyncIndicator() {
  // TODO aria for syncing icon
  const dirty = useExtern(NumDirty)
  const syncing = useExtern(NumSyncing)
  return <div
    className="dirty"
    data-dirty={dirty}
    data-syncing={syncing}
    title={`${dirty} dirty ${syncing} syncing`}
    aria-label="Dirty"
    aria-checked={dirty > 0}
  />
}

function initialWidgets() {
  const widgets: Widget[] = (() => {
    // try load from query parameter
    const params = new URLSearchParams(location.search)
    const prevWidgets = params.get(QUERY_PARAM_WIDGETS)
    if (prevWidgets !== null) {
      try {
        return JSON.parse(prevWidgets).map(reprToWidget)
      } catch(e) {
        toast.error(`Couldn't restore open widgets: ${e}`)
      }
    }

    // defaults
    return [
      new CalendarWidget(),
      new FileWidget("index"),
      new TodayWidget(),
    ]
  })()

  // but also open all dirty pages, so they sync
  for (const dirtyPath of LsWal.keys()) {
    if (!widgets.some(w => w instanceof FileWidget && w.path === dirtyPath)) {
      widgets.push(new FileWidget(dirtyPath))
    }
  }
  return widgets
}

function WidgetCard(props: { widget: Widget, ctl: WidgetControl, focusHook: any }) {
  // TODO widgets might only need SiteControl and not WidgetControl, if all the
  // widget controls are only used here
  const [title, body] = props.widget.show(props.ctl)
  const elem = useRef<HTMLElement | null>(null)

  useEffect(() => {
    elem.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "center",
    });
    (document.activeElement as HTMLElement | undefined)?.blur()
  }, [elem, props.focusHook])

  return <article
    className={"WidgetCard " + props.widget.className()}
    ref={elem}
  >
    <h1>
      {//this first so it floats right of title floats
      }
      <button onClick={e => { props.ctl.closeSelf() }}>×</button>
      {title}
    </h1>

    {body}
  </article>
}

function CardsRow(props: { cards: JSX.Element[] }) {
  return <div
    className="Cards CardsRow"
  >
    {props.cards.map(e => <div key={e.key} role="none">{e}</div>)}
  </div>
}

export function App() {
  const [config, setConfig] = useState<IbisConfig>(loadConfig)

  // keyboard shortcuts
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      let shortcut = event.key
      // order is ctrl alt shift
      if (event.shiftKey) shortcut = "Shift+" + shortcut
      if (event.altKey) shortcut = "Alt+" + shortcut
      if (event.ctrlKey) shortcut = "Control+" + shortcut
      if (event.ctrlKey || event.shiftKey) {
        const target = document.querySelector(`[aria-keyshortcuts~="${shortcut}"]`)
        if (target instanceof HTMLElement) {
          target.focus()
          event.preventDefault()
        }
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  })

  // TODO React's strict mode causes us to create a duplicate backend, which
  // might cause bad behaviour when dealing with unsaved changes
  const facade: Facade = useMemo(() => new Facade(config), [config]);
  useEffect(() => {
    FacadeExtern.set(facade)
    return () => FacadeExtern.set(null)
  }, [facade]);

  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets())
  useEffect(() => {
    // set query param so we can reopen
    const serialised = JSON.stringify(widgets.map(widgetToRepr))

    const url = new URL(location.href)
    url.searchParams.set(QUERY_PARAM_WIDGETS, serialised)

    history.replaceState(null, "", url)
  }, [widgets])

  // TODO this is a bit of a hack to force re-render
  const focuses = useRef(new WeakMap<Widget, Symbol>())
  const [, forceUpdate] = useReducer(x => x + 1, 0)
  const focusOf = (w: Widget) => {
    let focus = focuses.current.get(w)
    if (focus === undefined) {
      focus = Symbol()
      focuses.current.set(w, focus)
    }
    return focus
  }

  function openWidget(newWidget: Widget, atStart: boolean) {
    const existing = widgets.find(w => widgetToRepr(w) === widgetToRepr(newWidget))
    if (existing) {
      focuses.current.set(existing, Symbol())
      forceUpdate()
    } else {
      setWidgets(atStart ? [newWidget, ...widgets] : [...widgets, newWidget])
    }
  }

  const ctl: SiteControl = {
    open: w => openWidget(w, false),
    updateConfig: setConfig,
  }
  useEffect(() => {
    IbisController.set(ctl)
    return () => IbisController.set(DummySiteControl)
  }, [ctl]);

  return <>
    <header>
      <div className="left">
      </div>
      <div className="mid">
        <IbisSearch ctl={ctl} facade={facade} />
      </div>
      <div className="right">
        <SyncIndicator />
      </div>
    </header>

    <CardsRow
      cards={widgets.map((widget, i) => <WidgetCard
        key={widgetToRepr(widget)}
        widget={widget}
        focusHook={focusOf(widget)}
        ctl={{
          ...ctl,
          closeSelf() {
            const copy = [...widgets];
            copy.splice(i, 1);
            setWidgets(copy);
          }
        }}
      />)}
    />

    <ToastContainer
      theme={window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"}
    />
  </>
}
