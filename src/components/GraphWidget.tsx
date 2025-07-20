import "./GraphWidget.css"
import { useEffect, useRef } from "react"
import { WidgetControl, IWidget } from "./Widget"
import * as d3 from "d3"
import { useEffectAsync, useExtern } from "../extern"
import { FacadeExtern } from "../backend"
import { FileWidget } from "./FileWidget"

function group(path: string) {
  if (/^[0-9]{1,2}[A-Z][a-z]{2}[0-9]{2}$/.test(path)) return 1
  return 0
}

export class GraphWidget implements IWidget {
  className(): string { return "GraphWidget" }

  show(ctl: WidgetControl): [JSX.Element, JSX.Element] {
    const ref = useRef<SVGSVGElement>(null)
    const facade = useExtern(FacadeExtern)

    useEffectAsync(async (cleanup: Promise<void>) => {
      if (!facade) return

      // just get all the paths, so we can avoid creating invalid links
      const paths = new Set<string>()
      await facade.fts.all(row => paths.add(row.path))

      // load data
      type Node = d3.SimulationNodeDatum & {id: string, group: number}
      const nodes: Node[] = []
      const links: d3.SimulationLinkDatum<Node>[] = []
      await facade.fts.all(row => {
        nodes.push({id: row.path, group: group(row.path)})

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

      const zoom = d3.zoom()
        .scaleExtent([0.5, 32])
        .on("zoom", zoomed);

      const svg = d3.select(ref.current)

      const g = svg.append("g")

      const label = g.append("g")
          .attr("font-size", 8)
          .attr("fill", "white")
          .attr("text-anchor", "middle")
        .selectAll()
        .data(nodes)
        .join("text")
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


      label.call(
        d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      )

      // Set the position attributes of links and nodes each time the simulation ticks.
      function ticked() {
        link
          .attr("x1", d => (d.source as any).x)
          .attr("y1", d => (d.source as any).y)
          .attr("x2", d => (d.target as any).x)
          .attr("y2", d => (d.target as any).y)

        label
          .attr("x", d => d.x!)
          .attr("y", d => d.y!)
      }

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

      svg.call(zoom as any).call(zoom.transform as any, d3.zoomIdentity);

      function zoomed({transform}: {transform: d3.ZoomTransform}) {
        g.attr("transform", transform.toString())
      }

      await cleanup
      simulation.stop()
    }, [ref, facade])

    return [
      <>~ Graph ~</>,
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
    ]
  }
}
