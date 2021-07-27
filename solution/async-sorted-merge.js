"use strict";

// Print all entries, across all of the *async* sources, in chronological order.

/* Performance Considerations:
  Each log can take up to 8ms to get.
  This means our throughput is about 60 logs a second which is 💩
  Sadly as a source can have in theory an unlimited number of next entries we must pull the next entry from every source before printing the next one.
  Perhaps we could pull the top X per source in parallel and replemish that x as needed.
  However the API only allows us to pull 1 log at a time with popAsync()
  What we can do is pull the head of all the logs in parallel while ensuring data integrity.
  But this only helps on startup :(

  Another option would be to spin up a set of worker threads to populate a buffer
  but that is sadly beyond the scope of 1-3 hours to implement safely
  as it would require refactoring how logs are pulled (one cannot pass functions or objects to worker threads)
*/

// use async/await syntax sugar :)
module.exports = async (logSources, printer) => {

  // get all the heads in parallel,
  // sadly we can't do this for further logs :()
  let currentLogs = await Promise.all(logSources.map(async (source, index) => {
    var log = await source.popAsync();
    return { log, index }
  }));
  
  // ensure that all sources have at least one log
  currentLogs = currentLogs.filter(logWithIndex => logWithIndex.log !== false);

  // mutating initial sort in decending order of date
  currentLogs.sort((a, b) => a.log.date - b.log.date);

  // while there are logs in any sources
  while (currentLogs.length > 0)
  {
    // get the first log in the list
    const headLog = currentLogs.shift();
    printer.print(headLog.log);

    // get the next log from the source
    const nextLog = {
      // we cannot pull more then one at a time while processing
      // as we don't know its sort order (it could be the next log to print)
      log: await logSources[headLog.index].popAsync(),
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
  console.log("Async sort complete.");
};
