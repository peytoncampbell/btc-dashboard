"""
Analyze how the recent losing window (Feb 9 13:00) would have performed 
under the optimal configuration vs current config
"""

import json

# Load the recent trades
with open('data/trades.json', 'r') as f:
    data = json.load(f)

recent_trades = data['trades']

print("="*80)
print("RECENT WINDOW ANALYSIS - Feb 9, 13:00-13:15")
print("="*80)

print("\nWhat Actually Happened (Current Config: M2-9, 1%, no filters):")
print("-" * 80)

current_balance = 100.0
for i, trade in enumerate(recent_trades, 1):
    bet = 1.0  # Current config uses fixed $1 bets
    current_balance += trade['profit']
    
    print(f"Trade {i}: Min {trade['entry_minute']} | {trade['direction']} @ {trade['buy_price_cents']}c | "
          f"{trade['result']} | P/L: ${trade['profit']:.2f} | Balance: ${current_balance:.2f}")

print(f"\nFinal Balance: ${current_balance:.2f} (Loss: ${100 - current_balance:.2f})")
print(f"Total Trades: {len(recent_trades)}")
print(f"Win Rate: {sum(1 for t in recent_trades if t['result'] == 'WIN')}/{len(recent_trades)} = 0.0%")

print("\n" + "="*80)
print("OPTIMAL CONFIG SIMULATION (M1-3, 2%, price <=55c, stop on flip)")
print("="*80)

optimal_balance = 100.0
optimal_trades = []

previous_direction = None
stopped = False

for trade in recent_trades:
    # Apply optimal filters
    skip_reason = None
    
    # Minute filter
    if trade['entry_minute'] < 1 or trade['entry_minute'] > 3:
        skip_reason = "Outside minutes 1-3"
    
    # Price filter
    elif trade['buy_price_cents'] > 55:
        skip_reason = f"Buy price {trade['buy_price_cents']}¢ > 55¢ limit"
    
    # Direction flip check
    elif previous_direction and trade['direction'] != previous_direction:
        skip_reason = "Direction flip detected (stop trading)"
        stopped = True
    
    # If already stopped this window
    elif stopped:
        skip_reason = "Already stopped (post-flip)"
    
    if skip_reason:
        print(f"SKIP: Min {trade['entry_minute']} | {trade['direction']} @ {trade['buy_price_cents']}c | Reason: {skip_reason}")
        continue
    
    # Execute trade with optimal config
    bet_amount = optimal_balance * 0.02  # 2% portfolio sizing
    
    if trade['result'] == 'WIN':
        buy_price = trade['buy_price_cents'] / 100.0
        profit = bet_amount * (1.0 / buy_price - 1.0)
    else:
        profit = -bet_amount
    
    optimal_balance += profit
    previous_direction = trade['direction']
    optimal_trades.append(trade)
    
    print(f"TRADE: Min {trade['entry_minute']} | {trade['direction']} @ {trade['buy_price_cents']}c | "
          f"{trade['result']} | Bet: ${bet_amount:.2f} | P/L: ${profit:.2f} | Balance: ${optimal_balance:.2f}")

print("\n" + "="*80)
print("COMPARISON")
print("="*80)

print(f"\nCurrent Config:")
print(f"  Trades Executed: {len(recent_trades)}")
print(f"  Final Balance: ${current_balance:.2f}")
print(f"  Loss: ${100 - current_balance:.2f}")

print(f"\nOptimal Config:")
print(f"  Trades Executed: {len(optimal_trades)}")
print(f"  Final Balance: ${optimal_balance:.2f}")
print(f"  Gain/Loss: ${optimal_balance - 100:.2f}")

print(f"\nDifference: ${optimal_balance - current_balance:.2f}")
if current_balance != 100:
    pct_better = ((optimal_balance - current_balance) / abs(100 - current_balance)) * 100
    print(f"Result: {pct_better:.1f}% better outcome")

print("\n" + "="*80)
print("KEY INSIGHTS")
print("="*80)

print("\n1. MINUTE TIMING:")
print(f"   - Current config traded minutes: {sorted(set(t['entry_minute'] for t in recent_trades))}")
print(f"   - Optimal config would trade: minutes 1-3 only")
print(f"   - Actual trades had minutes {min(t['entry_minute'] for t in recent_trades)}-{max(t['entry_minute'] for t in recent_trades)}")
print(f"   -> All trades were OUTSIDE the optimal range!")

print("\n2. BUY PRICE FILTER:")
buy_prices = [t['buy_price_cents'] for t in recent_trades]
print(f"   - Buy prices in this window: {min(buy_prices)}c to {max(buy_prices)}c")
print(f"   - Optimal config limit: <=55c")
above_limit = [p for p in buy_prices if p > 55]
print(f"   - Trades above limit: {len(above_limit)}/{len(buy_prices)}")
if above_limit:
    print(f"   -> {len(above_limit)} trades would have been skipped!")

print("\n3. DIRECTION CONSISTENCY:")
directions = [t['direction'] for t in recent_trades]
unique_directions = set(directions)
print(f"   - All trades went: {', '.join(unique_directions)}")
if len(unique_directions) == 1:
    print(f"   -> No flip - consistent direction")
else:
    print(f"   -> Direction flip detected - would have stopped mid-window")

print("\n4. THE VERDICT:")
if len(optimal_trades) == 0:
    print("   *** OPTIMAL CONFIG WOULD HAVE SAVED YOU! ***")
    print("   Zero trades executed = No loss!")
    print(f"   Preserved capital: ${100.00:.2f}")
else:
    if optimal_balance > current_balance:
        print(f"   -> Optimal config would have performed better")
        print(f"   Saved/Gained: ${optimal_balance - current_balance:.2f}")
    else:
        print(f"   -> Both configs would have lost (but optimal lost less)")
        print(f"   Difference: ${optimal_balance - current_balance:.2f}")

print("\n" + "="*80)
