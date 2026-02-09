import json

with open('data/trades_backup_v1.json', 'r') as f:
    data = json.load(f)

print(f"Total trades: {len(data['trades'])}")
print(f"First trade keys: {list(data['trades'][0].keys())}")
print(f"Has entry_minute: {'entry_minute' in data['trades'][0]}")
print(f"Has bet_amount: {'bet_amount' in data['trades'][0]}")

# Check if any trades have entry_minute
has_entry_minute = any('entry_minute' in t for t in data['trades'])
print(f"Any trades with entry_minute: {has_entry_minute}")

# Show sample trade
print("\nSample trade:")
print(json.dumps(data['trades'][0], indent=2))
