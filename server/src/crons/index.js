const dbQuery = require('../utils/dbHelper');
const { advance } = require('../utils/flowEngine');

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

async function tickFlows() {
  try {
    const rows = await dbQuery('SELECT * FROM FlowRuns WHERE status = "running" AND (next_run_at IS NULL OR next_run_at <= NOW())');
    for (const r of rows) {
      try { await advance(r.flow_id, r.id); } catch(e){ console.error('advance err', e.message) }
      await sleep(200);
    }
  } catch(e){ console.error('tickFlows error', e.message) }
}

function initCronJobs(){
  setInterval(tickFlows, 3000);
}

module.exports = { initCronJobs };


