const Database = require('better-sqlite3');
const db = new Database('C:\\Users\\campb\\.openclaw\\workspace\\skills\\polymarket-trader\\data\\trades.db', { readonly: true });

// Get trades table schema
console.log('=== TRADES TABLE SCHEMA ===');
const tradesInfo = db.prepare("PRAGMA table_info(trades)").all();
console.log(tradesInfo.map(c => `${c.name} (${c.type})`).join('\n'));

console.log('\n=== NEAR_MISSES TABLE SCHEMA ===');
const nmInfo = db.prepare("PRAGMA table_info(near_misses)").all();
console.log(nmInfo.map(c => `${c.name} (${c.type})`).join('\n'));

// Get sample data
console.log('\n=== SAMPLE TRADE (most recent) ===');
const sampleTrade = db.prepare("SELECT * FROM trades ORDER BY timestamp DESC LIMIT 1").get();
if (sampleTrade) {
  console.log(JSON.stringify(sampleTrade, null, 2));
}

console.log('\n=== SAMPLE NEAR_MISS (most recent) ===');
const sampleNM = db.prepare("SELECT * FROM near_misses ORDER BY timestamp DESC LIMIT 1").get();
if (sampleNM) {
  console.log(JSON.stringify(sampleNM, null, 2));
}

db.close();
