# JP Schedule to ICS

Convert Japanese schedule text into iCalendar (.ics) files.

## Features

* Parse Japanese schedule text
* Generate ICS calendar files
* Mobile friendly
* Works entirely in browser
* No server required
* Year rollover support (Dec → Jan)
* Supports one-line and multi-line formats
* Supports all-day and date-range events
* Supports Japanese full-width characters
* Supports AM/PM and late-night times (e.g. 25:00)

## Demo

https://schedule.yasoo.work

## Example Input

```text
5/2 18:00〜19:00 キックボクシング

5/3
20:00~21:00
柔術

5/4 20:00 ボクシング

5/5
18:00 作業
20:00 帰宅

５／６ ＰＭ5:00〜ＰＭ6:00 イベント

5/7（日）
担当：タナカ
16:00〜16:50
キックボクシング（初心者）
17:00〜18:30
キックボクシング（対人練習）
```


## Supported Formats

Supports Japanese schedule messages from LINE, gyms, clubs, schools, and events.

### Date

```text
5/2
2026/5/2
5月2日
2026年5月2日
```

### Time

```text
17:00〜18:00
17:00-18:00
17時〜18時
1700〜1800
23:00〜25:00
PM5:00〜PM6:00
5pm-6pm
17:00〜18:00 キックボクシング
18:00 キックボクシング (defaults to 1 hour)
```

### Date Range

```text
5/2〜5/4
```

## Privacy

All processing is done locally in the browser.

No schedule data is sent to any server.

## Development

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

## Build

```bash
npm run build
```

## Tech Stack

* React
* TypeScript
* Vite
* Vitest
* ics

## Known Limitations

* Some schedule formats may not parse correctly
* Complex natural language is not fully supported
* Please verify generated calendar events before importing

## Issues

Bug reports and format samples are welcome.

https://github.com/yasoowork/jp-schedule-to-ics/issues

## License

MIT