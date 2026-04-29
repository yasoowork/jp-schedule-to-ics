# JP Schedule to ICS

Convert Japanese schedule text into iCalendar (.ics) files.

## Features

* Parse Japanese schedule text
* Generate ICS calendar files
* Mobile friendly
* Works entirely in browser
* No server required
* Year rollover support (Dec → Jan)

## Demo

https://schedule.yasoo.work

## Example Input

```text
■5/2（土）
担当者：田中
17:00〜18:00
キックボクシング
```

## Supported Formats

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
17時〜18時
17:00〜18:00 キックボクシング
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