"use strict";

// Print all entries, across all of the sources, in chronological order.

module.exports = (logSources, printer) => {
  // get the current time and index within the sources list for each log
  const currentLogs = logSources.map((source, index) => ({
    log: source.pop(),
    index: index
  }))
  // ensure that all sources have an initial log
  .filter(logWithIndex => logWithIndex.log !== false);

  // sort by date
  currentLogs.sort((a, b) => a.log.date - b.log.date);

  // while there are logs in any sources
  while (currentLogs.length > 0)
  {
    // get the first log in the list
    const headLog = currentLogs.shift();
    printer.print(headLog.log);

    // get the next log from the source
    const nextLog = {
      log: logSources[headLog.index].pop(),
      index: headLog.index
    }

    // if there are no more logs in this source, move on
    if (!nextLog.log)
      continue;

    // insert the next log at the correct point to be read in cronological order
    let index = currentLogs.findIndex(e => e.log.date >= nextLog.log.date);

    // use push/unshift mutating methods to avoid array allocations
    if (index === -1) // -1 means it is larger then all other log entries
      currentLogs.push(nextLog);
    else
      currentLogs.splice(index, 0, nextLog);
  }

  printer.done();
  return console.log("Sync sort complete.");
};
