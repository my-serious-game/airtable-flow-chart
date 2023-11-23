import workerize from "workerize";

import { LinkStyle, ChartOrientation, RecordShape } from "./settings";

const DEBUG_OUTPUT = false; // Set to true to log layout source string to console
let worker;

const workerString = `
    // Run viz.js in a worker to avoid blocking the main thread.
    self.importScripts('https://unpkg.com/viz.js@2.1.2/viz.js', 'https://unpkg.com/viz.js@2.1.2/full.render.js');

    let viz;

    function restart() {
        viz = new Viz();
        viz.renderString('digraph {}', {
            format: 'svg',
            engine: 'dot',
        }).catch(() => {});
    }

    restart();

    export function layout(source) {
        return new Promise((resolve, reject) => {
            let timeoutTimer = setTimeout(() => {
                restart();
                reject(new Error('timeout'));
            }, 10000);

            return viz.renderString(source, {
                format: 'svg',
                engine: 'dot',
            }).then(resolve).catch(err => {
                clearTimeout(timeoutTimer);
                restart();
                reject(err);
            });
        });
    }
`;

/**
 * Creates a string representation of the graph based on the passed in settings
 * Uses the viz worker to convert this string to an svg
 * See https://www.graphviz.org/documentation/ for more details.
 * @param settings
 * @returns {Promise<string>} The returned promise should resolve to an svg
 */
export function createLayout(settings) {
  if (!worker) {
    worker = workerize(workerString);
  }
  const {
    chartOrientation,
    linkStyle,
    recordShape,
    queryResult,
    queryResult1,
    queryResult2,
    field,
    field1,
    field11,
    field2,
    field22,
    fieldType,
  } = settings;
  let totalTime = 0;
  let source = "digraph {\n\t";
  source += "bgcolor=transparent\n\t";
  source += 'ratio="0.56"\n\t';
  // source += "viewport=\"1000,500,0.7,'recz5PoMUP73m2OHy'\"\n\t";
  source += "pad=0.25\n\t";
  source += "nodesep=0.25\n\t";

  if (chartOrientation === ChartOrientation.HORIZONTAL) {
    source += "rankdir=LR\n\t";
  }

  switch (linkStyle) {
    case LinkStyle.STRAIGHT_LINES:
      source += "splines=line\n\n\t";
      break;
    case LinkStyle.CURVED_LINES:
      source += "splines=curved\n\n\t";
      break;
    case LinkStyle.RIGHT_ANGLES:
    default:
      source += "splines=ortho\n\n\t";
      break;
  }

  source += "node [\n\t\t";
  switch (recordShape) {
    case RecordShape.ELLIPSE:
      source += "shape=ellipse\n\t\t";
      break;
    case RecordShape.CIRCLE:
      source += "shape=circle\n\t\t";
      break;
    case RecordShape.DIAMOND:
      source += "shape=diamond\n\t\t";
      break;
    case RecordShape.ROUNDED:
    case RecordShape.RECTANGLE:
    default:
      source += "shape=rect\n\t\t";
      break;
  }
  source += `style="filled${
    recordShape === RecordShape.ROUNDED ? ",rounded" : ""
  }"\n\t\t`;
  source += "fontname=Helvetica\n\t";
  source += "]\n\n\t";

  const nodes = [];
  const edges = [];
  let i = 0;
  if (queryResult.records && queryResult.records.length > 0) {
    for (const record of queryResult.records) {
      const color = i === 0 ? "#CFA895" : "#63524A";
      if (record.isDeleted) {
        continue;
      }
      let displayText = record.name
        .substring(0, 50)
        .trim()
        .replace(/"/g, '\\"');
      if (record.name.length > 50) {
        displayText += "...";
      }

      nodes.push(
        `${record.id} [id="${record.id}" label="${displayText}"
            tooltip="${displayText}"
            fontcolor="white"
            color="#B35047"
            fillcolor="#D65F55"]`
      );

      const recordLinked = queryResult1
        ? queryResult1.filter(
            (cell) =>
              cell._data.cellValuesByFieldId &&
              cell._data.cellValuesByFieldId[field1.id] &&
              cell._data.cellValuesByFieldId[field1.id].find(
                (l) => l.id === record.id
              )
          )
        : null;

      if (recordLinked && recordLinked.length > 0) {
        for (const record1 of recordLinked) {
          if (record1.isDeleted) {
            continue;
          }

          let displayText = record1.name
            .substring(0, 50)
            .trim()
            .replace(/"/g, '\\"');
          if (record1.name.length > 50) {
            displayText += "...";
          }
          nodes.push(
            `${record1.id} [id="${record1.id}" label="${displayText}"
                          tooltip="Au clique - ${displayText}"
                          fontcolor="black"
                          color="#C2A291"
                          shape=diamond
                          fillcolor="#E5BFAB"]`
          );
          edges.push(
            `${record.id} -> ${record1.id} [id="${record.id}->${record1.id}" color="#63524A"]`
          );
        }
      }

      const recordLinked2 = queryResult1
        ? queryResult1.filter(
            (cell) =>
              cell._data.cellValuesByFieldId &&
              cell._data.cellValuesByFieldId[field11.id] &&
              cell._data.cellValuesByFieldId[field11.id].find(
                (l) => l.id === record.id
              )
          )
        : null;
      if (recordLinked2 && recordLinked2.length > 0 && recordLinked2[0]) {
        edges.push(
          `${recordLinked2[0].id} -> ${record.id} [id="${recordLinked2[0].id}->${record.id}" color="${color}"]`
        );
      }

      const recordLinked3 = queryResult2
        ? queryResult2.filter(
            (cell) =>
              cell._data.cellValuesByFieldId &&
              cell._data.cellValuesByFieldId[field2.id] &&
              cell._data.cellValuesByFieldId[field2.id]
                .valuesByLinkedRecordId &&
              cell._data.cellValuesByFieldId[field2.id].valuesByLinkedRecordId[
                cell._data.cellValuesByFieldId[field2.id].linkedRecordIds[0]
              ] &&
              cell._data.cellValuesByFieldId[field2.id].valuesByLinkedRecordId[
                cell._data.cellValuesByFieldId[field2.id].linkedRecordIds[0]
              ].filter((f) => f.id === record.id).length > 0
          )
        : null;

      if (recordLinked3 && recordLinked3.length > 0) {
        for (const record3 of recordLinked3) {
          let displayText = record3.name
            .substring(0, 50)
            .trim()
            .replace(/"/g, '\\"');
          if (record3.name.length > 50) {
            displayText += "...";
          }
          nodes.push(
            `${record3.id} [id="${record3.id}" label="${displayText}"
                            tooltip="Feedback - ${displayText}"
                            fontcolor="black"
                            color="#968881" 
                            shape=diamond
                            fillcolor="#C99B85"]`
          );
          edges.push(
            `${record.id} -> ${record3.id} [id="${record.id}->${record3.id}" color="#63524A"]`
          );
        }
      }

      const recordLinked4 = queryResult2
        ? queryResult2.filter(
            (cell) =>
              cell._data.cellValuesByFieldId &&
              cell._data.cellValuesByFieldId[field22.id] &&
              cell._data.cellValuesByFieldId[field22.id].find(
                (l) => l.id === record.id
              )
          )
        : null;
      if (recordLinked4 && recordLinked4.length > 0) {
        let color = i === 0 ? "#CFA895" : "#63524A";
        for (const r of recordLinked4) {
          edges.push(
            `${r.id} -> ${record.id} [id="${r.id}->${record.id}" color="${color}"]`
          );
        }
      }

      //linked inside same table
      const linkedRecordCellValues = record.getCellValue(field.id) || [];

      if (linkedRecordCellValues && linkedRecordCellValues.length > 0) {
        for (const linkedRecordCellValue of linkedRecordCellValues) {
          // The record might be in the cell value but not in the query result when it is deleted
          const linkedRecord = queryResult.getRecordByIdIfExists(
            linkedRecordCellValue.id
          );
          if (!linkedRecord || linkedRecord.isDeleted) {
            continue;
          }
          const linkedIndex = queryResult.records.findIndex(
            (r) => r.id === linkedRecord.id
          );
          let color2 = "#63524A";

          if (linkedIndex !== -1 && i > linkedIndex) {
            color2 = "#CFA895";
          }

          edges.push(
            `${record.id} -> ${linkedRecord.id} [id="${record.id}->${linkedRecord.id}" color="${color2}"]`
          );
        }
      }

      // ajout du temps total du scénario
      if (fieldType && record._data.cellValuesByFieldId[fieldType.id]) {
        const mechanic = record._data.cellValuesByFieldId[fieldType.id].name;
        switch (mechanic) {
          case "DIALOG": {
            totalTime += 15;
            break;
          }
          case "POSITIONNEMENT": {
            totalTime += 0;
            break;
          }
          case "QUIZ": {
            totalTime += 45;
            break;
          }
          case "CLIQUE_PIECE": {
            totalTime += 10;
            break;
          }
          case "TRANSITION": {
            totalTime += 5;
            break;
          }
          default: {
            totalTime += 0;
            break;
          }
        }
      }

      i++;
    }
  }
  source += `label="Temps Total: ${
    totalTime / 60
  } min \n Date du jour: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}" fontsize="50" labelloc="b" labeljust="l"\n\t`;
  source += nodes.join("\n\t");
  source += "\n\n\t";
  source += edges.join("\n\t");
  source += "\n}";

  if (DEBUG_OUTPUT) {
    console.log(source);
  }

  return worker.layout(source);
}
