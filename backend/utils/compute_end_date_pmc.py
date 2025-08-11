#!/usr/bin/env python3
import argparse, sys
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import pandas as pd
import pandas_market_calendars as mcal

def add_timeframe(start: datetime, tf: str) -> datetime:
    tf = tf.lower()
    if tf == "1d":
        return start + timedelta(days=1)
    if tf == "2w":
        return start + timedelta(weeks=2)
    if tf == "2m":
        return start + relativedelta(months=2)
    raise ValueError(f"Unknown timeframe: {tf}")

def next_open_trading_day(calendar_code: str, start_dt: datetime) -> tuple[str, pd.Timestamp]:
    """
    Returns (YYYY-MM-DD, market_open_timestamp_utc) for the first session
    whose session date >= start_dt.date().
    """
    cal = mcal.get_calendar(calendar_code)  # 'XNYS' for NYSE
    start_date = start_dt.date()
    # Look ahead up to ~3 months for safety
    sched = cal.schedule(start_date=start_date, end_date=start_date + timedelta(days=90))
    if sched.empty:
        print("ERROR: empty trading schedule from calendar", file=sys.stderr)
        sys.exit(2)

    idx_dates = list(sched.index.date)
    # find the first session date >= candidate date
    for i, d in enumerate(idx_dates):
      if d >= start_date:
        row = sched.iloc[i]
        return d.isoformat(), row["market_open"]  # market_open is UTC tz-aware

    # Fallback (shouldn't happen with 90-day window)
    row = sched.iloc[-1]
    return idx_dates[-1].isoformat(), row["market_open"]

def main():
    p = argparse.ArgumentParser(description="Compute end date using pandas-market-calendars.")
    p.add_argument("timeframe", choices=["1d", "2w", "2m"])
    p.add_argument("--start", help="Start date YYYY-MM-DD (default: today UTC)", default=None)
    p.add_argument("--calendar", default="XNYS", help="Market calendar code (default XNYS)")
    p.add_argument("--format", choices=["date", "iso"], default="date",
                   help="'date' -> YYYY-MM-DD; 'iso' -> market open timestamp ISO-8601 (UTC)")
    args = p.parse_args()

    start = datetime.strptime(args.start, "%Y-%m-%d") if args.start else datetime.utcnow()
    candidate = add_timeframe(start, args.timeframe)
    ymd, open_ts = next_open_trading_day(args.calendar, candidate)

    if args.format == "date":
        print(ymd)
    else:
        print(pd.Timestamp(open_ts).isoformat())  # e.g. 2025-08-12T13:30:00+00:00

if __name__ == "__main__":
    main()
