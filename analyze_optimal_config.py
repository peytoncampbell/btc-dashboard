"""
Comprehensive BTC Scalper Bot Configuration Analysis
Tests all dimensions to find optimal configuration for maximizing dollar profit
"""

import json
from datetime import datetime
from collections import defaultdict
from itertools import product
import sys

# Load trade data
def load_data():
    with open('data/trades.json', 'r') as f:
        data = json.load(f)
    return data['trades']

def group_trades_by_window(trades):
    """Group trades by window_start and sort by entry_minute"""
    windows = defaultdict(list)
    for trade in trades:
        windows[trade['window_start']].append(trade)
    
    # Sort trades within each window by entry_minute
    for window in windows.values():
        window.sort(key=lambda t: t['entry_minute'])
    
    return windows

def detect_direction_flip(window_trades):
    """Detect if there's a direction flip within a window"""
    if len(window_trades) <= 1:
        return False, None
    
    directions = [t['direction'] for t in window_trades]
    for i in range(1, len(directions)):
        if directions[i] != directions[i-1]:
            return True, i  # Returns True and the index where flip occurred
    return False, None

def simulate_with_config(trades_by_window, config):
    """
    Simulate trading with given configuration
    
    Config parameters:
    - min_minute: earliest minute to trade (1-13)
    - max_minute: latest minute to trade (1-13)
    - portfolio_pct: % of portfolio to bet per trade (0.005, 0.01, 0.02)
    - max_buy_price: max buy price in cents (skip if higher) or None
    - stop_on_flip: stop trading after direction flip in window
    - stop_after_n_losses: stop after N losses in a window (or None)
    - max_trades_per_window: max trades per window (or None)
    - first_direction_only: only trade the first direction seen in window
    """
    
    balance = 100.0
    min_balance = balance
    total_trades = 0
    winning_trades = 0
    gross_wins = 0.0
    gross_losses = 0.0
    
    trades_executed = []
    
    for window_start in sorted(trades_by_window.keys()):
        window_trades = trades_by_window[window_start]
        
        # Filter by minute range
        valid_trades = [t for t in window_trades 
                       if config['min_minute'] <= t['entry_minute'] <= config['max_minute']]
        
        if not valid_trades:
            continue
        
        # Track state within this window
        window_loss_count = 0
        window_trade_count = 0
        first_direction = valid_trades[0]['direction']
        previous_direction = None
        
        for trade in valid_trades:
            # Check if we should stop trading this window
            should_skip = False
            
            # Max trades per window check
            if config['max_trades_per_window'] and window_trade_count >= config['max_trades_per_window']:
                should_skip = True
            
            # First direction only check
            if config['first_direction_only'] and trade['direction'] != first_direction:
                should_skip = True
            
            # Stop on flip check
            if config['stop_on_flip'] and previous_direction and trade['direction'] != previous_direction:
                should_skip = True
            
            # Buy price filter
            if config['max_buy_price'] and trade['buy_price_cents'] > config['max_buy_price']:
                should_skip = True
            
            # Stop after N losses check (only counts losses that have already occurred)
            # NOTE: In reality, losses aren't known until window end, but we check here for simulation
            if config['stop_after_n_losses'] and window_loss_count >= config['stop_after_n_losses']:
                should_skip = True
            
            if should_skip:
                continue
            
            # Execute trade
            bet_amount = balance * config['portfolio_pct']
            
            if trade['result'] == 'WIN':
                # WIN profit = bet_amount * (1/buy_price - 1)
                buy_price = trade['buy_price_cents'] / 100.0
                profit = bet_amount * (1.0 / buy_price - 1.0)
                balance += profit
                winning_trades += 1
                gross_wins += profit
            else:
                # LOSS = -bet_amount
                profit = -bet_amount
                balance += profit
                gross_losses += abs(profit)
                window_loss_count += 1
            
            total_trades += 1
            window_trade_count += 1
            previous_direction = trade['direction']
            
            if balance < min_balance:
                min_balance = balance
            
            trades_executed.append({
                'window_start': window_start,
                'entry_minute': trade['entry_minute'],
                'direction': trade['direction'],
                'result': trade['result'],
                'bet_amount': bet_amount,
                'profit': profit,
                'balance': balance
            })
    
    win_rate = winning_trades / total_trades if total_trades > 0 else 0
    profit_factor = gross_wins / gross_losses if gross_losses > 0 else float('inf')
    max_drawdown = min_balance
    
    return {
        'final_balance': balance,
        'total_trades': total_trades,
        'win_rate': win_rate,
        'max_drawdown': max_drawdown,
        'profit_factor': profit_factor,
        'gross_wins': gross_wins,
        'gross_losses': gross_losses,
        'trades_executed': trades_executed
    }

def generate_all_configs():
    """Generate all configuration combinations to test"""
    configs = []
    
    # Minute ranges: all combinations from 1-13
    minute_ranges = []
    for start in range(1, 14):
        for end in range(start, 14):
            minute_ranges.append((start, end))
    
    # Portfolio sizing
    portfolio_pcts = [0.005, 0.01, 0.02]  # 0.5%, 1%, 2%
    
    # Buy price filters
    max_buy_prices = [None, 50, 55, 60, 65, 70, 75, 80]
    
    # Stop rules
    stop_on_flip_options = [True, False]
    stop_after_n_losses_options = [None, 1, 2, 3]
    max_trades_per_window_options = [None, 1, 2, 3, 4, 5]
    first_direction_only_options = [True, False]
    
    # Generate all combinations
    for (min_min, max_min), pct, max_price, flip, n_loss, max_trades, first_dir in product(
        minute_ranges,
        portfolio_pcts,
        max_buy_prices,
        stop_on_flip_options,
        stop_after_n_losses_options,
        max_trades_per_window_options,
        first_direction_only_options
    ):
        # Skip redundant combinations
        # If first_direction_only is True, stop_on_flip doesn't matter
        if first_dir and flip:
            continue
        
        config = {
            'min_minute': min_min,
            'max_minute': max_min,
            'portfolio_pct': pct,
            'max_buy_price': max_price,
            'stop_on_flip': flip,
            'stop_after_n_losses': n_loss,
            'max_trades_per_window': max_trades,
            'first_direction_only': first_dir
        }
        configs.append(config)
    
    return configs

def config_to_string(config):
    """Convert config dict to readable string"""
    parts = []
    parts.append(f"M{config['min_minute']}-{config['max_minute']}")
    parts.append(f"{config['portfolio_pct']*100:.1f}%")
    
    if config['max_buy_price']:
        parts.append(f"MaxPrice≤{config['max_buy_price']}¢")
    
    if config['first_direction_only']:
        parts.append("FirstDirOnly")
    elif config['stop_on_flip']:
        parts.append("StopOnFlip")
    
    if config['stop_after_n_losses']:
        parts.append(f"Stop@{config['stop_after_n_losses']}Loss")
    
    if config['max_trades_per_window']:
        parts.append(f"Max{config['max_trades_per_window']}Trades")
    
    return " | ".join(parts)

def main():
    print("Loading trade data...")
    trades = load_data()
    trades_by_window = group_trades_by_window(trades)
    
    print(f"Loaded {len(trades)} trades across {len(trades_by_window)} windows")
    
    # Analyze current data
    print("\n" + "="*80)
    print("CURRENT DATA ANALYSIS")
    print("="*80)
    
    total_flips = 0
    windows_with_flips = 0
    for window_start, window_trades in trades_by_window.items():
        has_flip, flip_idx = detect_direction_flip(window_trades)
        if has_flip:
            total_flips += 1
            windows_with_flips += 1
            print(f"Window {window_start}: FLIP at trade {flip_idx} ({len(window_trades)} trades)")
            for i, t in enumerate(window_trades):
                print(f"  {i}: Min {t['entry_minute']} {t['direction']} @ {t['buy_price_cents']}¢ → {t['result']}")
    
    print(f"\nWindows with direction flips: {windows_with_flips}/{len(trades_by_window)}")
    
    # Generate and test all configs
    print("\n" + "="*80)
    print("TESTING ALL CONFIGURATIONS")
    print("="*80)
    
    configs = generate_all_configs()
    print(f"Testing {len(configs)} configurations...\n")
    
    results = []
    for i, config in enumerate(configs):
        if i % 10000 == 0 and i > 0:
            print(f"Tested {i}/{len(configs)} configurations...")
        
        result = simulate_with_config(trades_by_window, config)
        result['config'] = config
        result['config_str'] = config_to_string(config)
        results.append(result)
    
    print(f"Completed testing {len(configs)} configurations!\n")
    
    # Sort by final balance
    results.sort(key=lambda r: r['final_balance'], reverse=True)
    
    # Print top 20
    print("\n" + "="*80)
    print("TOP 20 CONFIGURATIONS BY FINAL BALANCE")
    print("="*80)
    print(f"{'Rank':<6} {'Final $':<10} {'Trades':<8} {'Win%':<8} {'PF':<8} {'MinBal':<10} Config")
    print("-" * 120)
    
    for i, result in enumerate(results[:20], 1):
        pf_str = f"{result['profit_factor']:.2f}" if result['profit_factor'] != float('inf') else "inf"
        print(f"{i:<6} ${result['final_balance']:<9.2f} {result['total_trades']:<8} "
              f"{result['win_rate']*100:<7.1f}% {pf_str:<8} ${result['max_drawdown']:<9.2f} "
              f"{result['config_str']}")
    
    # Save detailed results
    print("\n" + "="*80)
    print("DETAILED ANALYSIS")
    print("="*80)
    
    # Analysis 1: Direction flipping
    print("\n1. IS DIRECTION FLIPPING PROFITABLE?")
    allow_flips = [r for r in results if not r['config']['stop_on_flip'] and not r['config']['first_direction_only']]
    stop_on_flip = [r for r in results if r['config']['stop_on_flip']]
    first_dir_only = [r for r in results if r['config']['first_direction_only']]
    
    if allow_flips:
        avg_bal_allow = sum(r['final_balance'] for r in allow_flips) / len(allow_flips)
        max_bal_allow = max(r['final_balance'] for r in allow_flips)
        print(f"   Allow flips: Avg balance ${avg_bal_allow:.2f}, Max ${max_bal_allow:.2f}")
    
    if stop_on_flip:
        avg_bal_stop = sum(r['final_balance'] for r in stop_on_flip) / len(stop_on_flip)
        max_bal_stop = max(r['final_balance'] for r in stop_on_flip)
        print(f"   Stop on flip: Avg balance ${avg_bal_stop:.2f}, Max ${max_bal_stop:.2f}")
    
    if first_dir_only:
        avg_bal_first = sum(r['final_balance'] for r in first_dir_only) / len(first_dir_only)
        max_bal_first = max(r['final_balance'] for r in first_dir_only)
        print(f"   First dir only: Avg balance ${avg_bal_first:.2f}, Max ${max_bal_first:.2f}")
    
    # Analysis 2: Optimal buy price
    print("\n2. OPTIMAL MAX BUY PRICE?")
    by_price = defaultdict(list)
    for r in results:
        price = r['config']['max_buy_price']
        by_price[price].append(r['final_balance'])
    
    for price in sorted(by_price.keys(), key=lambda x: (x is None, x)):
        avg = sum(by_price[price]) / len(by_price[price])
        max_val = max(by_price[price])
        price_str = "No limit" if price is None else f"{price}¢"
        print(f"   Max price {price_str:>12}: Avg ${avg:.2f}, Max ${max_val:.2f}")
    
    # Analysis 3: Portfolio sizing
    print("\n3. OPTIMAL PORTFOLIO SIZING?")
    by_pct = defaultdict(list)
    for r in results:
        pct = r['config']['portfolio_pct']
        by_pct[pct].append(r['final_balance'])
    
    for pct in sorted(by_pct.keys()):
        avg = sum(by_pct[pct]) / len(by_pct[pct])
        max_val = max(by_pct[pct])
        print(f"   {pct*100:.1f}%: Avg ${avg:.2f}, Max ${max_val:.2f}")
    
    # Analysis 4: Best minute range
    print("\n4. BEST MINUTE RANGES (Top 10)?")
    by_minute = defaultdict(list)
    for r in results:
        minute_key = (r['config']['min_minute'], r['config']['max_minute'])
        by_minute[minute_key].append(r['final_balance'])
    
    minute_avg = [(k, sum(v)/len(v), max(v)) for k, v in by_minute.items()]
    minute_avg.sort(key=lambda x: x[2], reverse=True)  # Sort by max
    
    for (min_m, max_m), avg, max_val in minute_avg[:10]:
        print(f"   Minutes {min_m}-{max_m}: Avg ${avg:.2f}, Max ${max_val:.2f}")
    
    # Analysis 5: Individual minute performance
    print("\n5. INDIVIDUAL MINUTE WIN RATES?")
    minute_stats = defaultdict(lambda: {'wins': 0, 'total': 0, 'profit': 0.0})
    for trade in trades:
        minute = trade['entry_minute']
        minute_stats[minute]['total'] += 1
        if trade['result'] == 'WIN':
            minute_stats[minute]['wins'] += 1
        minute_stats[minute]['profit'] += trade.get('profit', 0)
    
    for minute in sorted(minute_stats.keys()):
        stats = minute_stats[minute]
        wr = stats['wins'] / stats['total'] if stats['total'] > 0 else 0
        print(f"   Minute {minute:2d}: {stats['wins']}/{stats['total']} wins ({wr*100:.1f}%), "
              f"Total P/L: ${stats['profit']:.2f}")
    
    # Save top configs to file
    print("\n" + "="*80)
    print("FINAL RECOMMENDATION")
    print("="*80)
    
    best = results[0]
    print(f"\n*** OPTIMAL CONFIGURATION ***")
    print(f"   Config: {best['config_str']}")
    print(f"\n   Final Balance: ${best['final_balance']:.2f}")
    print(f"   Total Trades: {best['total_trades']}")
    print(f"   Win Rate: {best['win_rate']*100:.1f}%")
    print(f"   Profit Factor: {best['profit_factor']:.2f}")
    print(f"   Max Drawdown: ${best['max_drawdown']:.2f}")
    
    print(f"\n   Exact Parameters:")
    print(f"   - Minute Range: {best['config']['min_minute']} to {best['config']['max_minute']}")
    print(f"   - Portfolio Size: {best['config']['portfolio_pct']*100:.2f}%")
    print(f"   - Max Buy Price: {best['config']['max_buy_price']}¢" if best['config']['max_buy_price'] else "   - Max Buy Price: No limit")
    print(f"   - Stop on Flip: {best['config']['stop_on_flip']}")
    print(f"   - Stop After N Losses: {best['config']['stop_after_n_losses']}")
    print(f"   - Max Trades/Window: {best['config']['max_trades_per_window']}")
    print(f"   - First Direction Only: {best['config']['first_direction_only']}")
    
    # Save full results
    with open('data/optimization_results.json', 'w') as f:
        # Save top 100 results (without trade history to keep file size down)
        top_results = []
        for r in results[:100]:
            top_results.append({
                'config': r['config'],
                'config_str': r['config_str'],
                'final_balance': r['final_balance'],
                'total_trades': r['total_trades'],
                'win_rate': r['win_rate'],
                'max_drawdown': r['max_drawdown'],
                'profit_factor': r['profit_factor'] if r['profit_factor'] != float('inf') else None,
                'gross_wins': r['gross_wins'],
                'gross_losses': r['gross_losses']
            })
        json.dump(top_results, f, indent=2)
    
    print("\nFull results saved to data/optimization_results.json")
    
    # Compare to baseline (current config)
    print("\n" + "="*80)
    print("COMPARISON TO CURRENT CONFIGURATION")
    print("="*80)
    
    # Current config is minutes 2-9, 1% portfolio, no filters
    current_config = {
        'min_minute': 2,
        'max_minute': 9,
        'portfolio_pct': 0.01,
        'max_buy_price': None,
        'stop_on_flip': False,
        'stop_after_n_losses': None,
        'max_trades_per_window': None,
        'first_direction_only': False
    }
    
    current_result = simulate_with_config(trades_by_window, current_config)
    
    print(f"\nCurrent Config (M2-9, 1%, no filters):")
    print(f"   Final Balance: ${current_result['final_balance']:.2f}")
    print(f"   Total Trades: {current_result['total_trades']}")
    print(f"   Win Rate: {current_result['win_rate']*100:.1f}%")
    
    print(f"\nOptimal Config:")
    print(f"   Final Balance: ${best['final_balance']:.2f}")
    print(f"   Total Trades: {best['total_trades']}")
    print(f"   Win Rate: {best['win_rate']*100:.1f}%")
    
    improvement = ((best['final_balance'] - current_result['final_balance']) / 
                   current_result['final_balance'] * 100)
    print(f"\nImprovement: {improvement:+.1f}%")

if __name__ == '__main__':
    main()
