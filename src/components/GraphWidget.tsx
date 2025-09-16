import "./GraphWidget.css"
import { useEffect, useRef, useState } from "react"
import { WidgetControl, IWidget } from "./Widget"
import * as d3 from "d3"
import { useEffectAsync, useExtern } from "../extern"
import { FacadeExtern } from "../backend"
import { FileWidget } from "./FileWidget"

const RE_DIARY = /^[0-9]{1,2}[A-Z][a-z]{2}[0-9]{2}$/

function group(path: string) {
  if (RE_DIARY.test(path)) return 1
  return 0
}

export class GraphWidget implements IWidget {
  className(): string { return "GraphWidget" }

  show(ctl: WidgetControl): [JSX.Element, JSX.Element] {
    const ref = useRef<SVGSVGElement>(null)
    const facade = useExtern(FacadeExtern)

    const [hideDiaryDays, setHideDiaryDays] = useState(false)
    console.log(hideDiaryDays)

    useEffectAsync(async (cleanup: Promise<void>) => {
      if (!facade) return

      type Node = d3.SimulationNodeDatum & {id: string, group: number}

      // load nodes, so we can avoid creating invalid links
      const nodes: Node[] = []
      const paths = new Set<string>()
      await facade.fts.all(row => {
        if (hideDiaryDays && RE_DIARY.test(row.path)) {
          console.log("skipping", row.path)
          return
        }

        paths.add(row.path)
        nodes.push({id: row.path, group: group(row.path)})
      })

      // load data
      const links: d3.SimulationLinkDatum<Node>[] = []
      await facade.fts.all(row => {
        if (!paths.has(row.path)) return

        // links
        for (const linked of row.refs)
          if (paths.has(linked))
            links.push({source: row.path, target: linked})

        // super
        let path = row.path
        while (path.includes(":")) {
          path = path.replace(/:[^:]*$/, "")
          if (paths.has(path))
            links.push({source: row.path, target: path})
        }
      })

      const svg = d3.select(ref.current)

      const g = svg.append("g")

      const label = g.append("g")
          .attr("font-size", 8)
          .attr("fill", "white")
          .attr("text-anchor", "middle")
        .selectAll()
        .data(nodes)
        .join("g")

      label
        .append("text")
          .text(d => d.id)
          .attr("filter", "url(#textbg)")
          .on("click", (event: MouseEvent, d) => {
            event.preventDefault()
            ctl.open(new FileWidget(d.id))
          })

      const link = g.append("g")
          .attr("stroke", "#808080")
          .attr("stroke-opacity", 0.6)
        .selectAll()
        .data(links)
        .join("line")

      // ----------------------------------------------------------------------

      const simulation = d3.forceSimulation(nodes)
        .force("link",
          d3.forceLink(links)
            .id((d => (d as Node).id))
            .distance(0)
            .strength(0.1)
        )
        .force("charge",
          d3.forceManyBody()
            .strength(d => (d as Node).id.length * -10)
        )
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .on("tick", ticked)


      // Set the position attributes of links and nodes each time the simulation ticks.
      function ticked() {
        link
          .attr("x1", d => (d.source as any).x)
          .attr("y1", d => (d.source as any).y)
          .attr("x2", d => (d.target as any).x)
          .attr("y2", d => (d.target as any).y)

        label.attr("transform", d => `translate(${d.x} ${d.y})`)
      }

      // ----------------------------------------------------------------------

      label.call(
        d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      )

      // Reheat the simulation when drag starts, and fix the subject position.
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      // Update the subject (dragged node) position during drag.
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      // Restore the target alpha so the simulation cools after dragging ends.
      // Unfix the subject position now that it’s no longer being dragged.
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      // ----------------------------------------------------------------------

      const zoom = d3.zoom()
        .scaleExtent([0.5, 32])
        .on("zoom", zoomed);

      svg.call(zoom as any).call(zoom.transform as any, d3.zoomIdentity);

      function zoomed({transform}: {transform: d3.ZoomTransform}) {
        g.attr("transform", transform.toString())
      }

      // ----------------------------------------------------------------------

      await cleanup

      simulation.stop()
      svg.selectAll("*").remove()
    }, [ref, facade, hideDiaryDays])

    return [
      <>~ Graph ~</>,
      <>
        <label>
          <input
            type="checkbox"
            checked={hideDiaryDays}
            onChange={e => setHideDiaryDays(e.target.checked)}
          />

          Hide diary entries
        </label>

        <div className={`${this.className()}__wrapper`}>
          <svg ref={ref}>
            <defs>
              <filter x="0" y="0" width="1" height="1" id="textbg">
                <feFlood floodColor="#00000088" result="bg" />
                <feMerge>
                  <feMergeNode in="bg"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>
        </div>
      </>
    ]
  }
}
