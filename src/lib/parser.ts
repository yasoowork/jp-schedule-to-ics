import type { ScheduleEvent } from "../types/event"
import type { ParseResult } from "../types/parser"

const DEFAULT_TITLE = "予定"

type ParseOptions = {
  defaultYear?: number
  rolloverYear?: boolean
}

type DateInfo = {
  year: number
  month: number
  day: number
  notes: string[]
  hasExplicitYear: boolean
}

type DateRangeInfo = {
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
}

type TimeRange = {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  notes: string[]
}

type StartTimeOnly = {
  hour: number
  minute: number
  title: string | null
  notes: string[]
}

type StartTime = {
  hour: number
  minute: number
}

type DateTimeInfo = {
  year: number
  month: number
  day: number
  timeRange: TimeRange
  hasExplicitYear: boolean
}

type TitleResult = {
  title: string
  index: number
}

export function parseScheduleText(
  text: string,
  options: ParseOptions = {}
): ParseResult {
  const defaultYear = options.defaultYear ?? new Date().getFullYear()
  const rolloverYear = options.rolloverYear ?? true
  const lines = normalizeText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const events: ScheduleEvent[] = []
  const unparsedLines: string[] = []
  const warnings: string[] = []

  let currentYear = defaultYear
  let previousMonth: number | null = null
  let currentMonth: number | null = null
  let currentDay: number | null = null
  let currentDayNotes: string[] = []
  let pendingEventNotes: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (isHeaderLine(line) || isSeparatorLine(line)) {
      continue
    }

    const singleLineEvent = parseSingleLineEvent(line, currentYear, defaultYear)

    if (singleLineEvent) {
      const eventMonth = singleLineEvent.start.getMonth() + 1

      if (
        rolloverYear &&
        previousMonth !== null &&
        eventMonth < previousMonth
      ) {
        singleLineEvent.start.setFullYear(singleLineEvent.start.getFullYear() + 1)
        singleLineEvent.end.setFullYear(singleLineEvent.end.getFullYear() + 1)
        currentYear += 1
      }

      previousMonth = eventMonth
      events.push(singleLineEvent)
      continue
    }

    const dateRange = parseDateRange(line)
    if (dateRange) {
      const start = new Date(
        currentYear,
        dateRange.startMonth - 1,
        dateRange.startDay
      )

      const end = new Date(
        currentYear,
        dateRange.endMonth - 1,
        dateRange.endDay + 1
      )

      events.push({
        title: cleanTitleLine(line),
        start,
        end,
        allDay: true,
      })

      continue
    }

    const dateTime = parseDateTimeLine(line, currentYear, defaultYear)

    if (dateTime) {
      if (dateTime.hasExplicitYear) {
        currentYear = dateTime.year
      } else if (
        rolloverYear &&
        previousMonth !== null &&
        dateTime.month < previousMonth
      ) {
        currentYear += 1
      }

      previousMonth = dateTime.month

      const titleResult = findNextTitle(lines, i + 1, defaultYear)

      const start = new Date(
        currentYear,
        dateTime.month - 1,
        dateTime.day,
        dateTime.timeRange.startHour,
        dateTime.timeRange.startMinute
      )

      const end = new Date(
        currentYear,
        dateTime.month - 1,
        dateTime.day,
        dateTime.timeRange.endHour,
        dateTime.timeRange.endMinute
      )

      events.push({
        title: titleResult.title,
        start,
        end,
        note:
          dateTime.timeRange.notes.length > 0
            ? dateTime.timeRange.notes.join("\n")
            : undefined,
        allDay: false,
      })

      pendingEventNotes = []
      i = titleResult.index
      continue
    }

    const date = parseDateLine(line, defaultYear)
    if (date) {
      if (date.hasExplicitYear) {
        currentYear = date.year
      } else if (
        rolloverYear &&
        previousMonth !== null &&
        date.month < previousMonth
      ) {
        currentYear += 1
      }

      previousMonth = date.month
      currentMonth = date.month
      currentDay = date.day
      currentDayNotes = date.notes
      pendingEventNotes = []
      continue
    }

    const timeRange = parseTimeRange(line)
    if (timeRange && currentMonth !== null && currentDay !== null) {
      const inlineTitle = parseInlineTitle(line)

      const titleResult: TitleResult = inlineTitle
        ? {
            title: inlineTitle,
            index: i,
          }
        : findNextTitle(lines, i + 1, defaultYear)

      const start = new Date(
        currentYear,
        currentMonth - 1,
        currentDay,
        timeRange.startHour,
        timeRange.startMinute
      )

      const end = new Date(
        currentYear,
        currentMonth - 1,
        currentDay,
        timeRange.endHour,
        timeRange.endMinute
      )

      const notes = unique([
        ...currentDayNotes,
        ...pendingEventNotes,
        ...(inlineTitle ? [] : timeRange.notes),
      ])

      events.push({
        title: titleResult.title,
        start,
        end,
        note: notes.length > 0 ? notes.join("\n") : undefined,
        allDay: false,
      })

      pendingEventNotes = []
      i = titleResult.index
      continue
    }

    const startTimeOnly = parseStartTimeOnly(line)

    if (startTimeOnly && currentMonth !== null && currentDay !== null) {
      const nextStartTime = findNextStartTime(lines, i + 1)

      const titleResult: TitleResult = startTimeOnly.title
        ? {
            title: startTimeOnly.title,
            index: i,
          }
        : findNextTitle(lines, i + 1, defaultYear)

      const start = new Date(
        currentYear,
        currentMonth - 1,
        currentDay,
        startTimeOnly.hour,
        startTimeOnly.minute
      )

      const end = nextStartTime
        ? new Date(
            currentYear,
            currentMonth - 1,
            currentDay,
            nextStartTime.hour,
            nextStartTime.minute
          )
        : new Date(start)

      if (!nextStartTime) {
        end.setHours(end.getHours() + 1)
      }

      const notes = unique([
        ...currentDayNotes,
        ...pendingEventNotes,
        ...startTimeOnly.notes,
      ])

      events.push({
        title: titleResult.title,
        start,
        end,
        note: notes.length > 0 ? notes.join("\n") : undefined,
        allDay: false,
      })

      pendingEventNotes = []
      i = titleResult.index
      continue
    }

    if (currentMonth !== null && currentDay !== null && isMemoLine(line)) {
      const memo = cleanMemoLine(line)

      if (isDayScopedMemoLine(line)) {
        currentDayNotes = unique([...currentDayNotes, memo])
      } else {
        pendingEventNotes.push(memo)
      }

      continue
    }

    if (currentMonth !== null && currentDay !== null && !isMemoLine(line)) {
      const start = new Date(currentYear, currentMonth - 1, currentDay)
      const end = new Date(currentYear, currentMonth - 1, currentDay + 1)

      events.push({
        title: cleanTitleLine(line),
        start,
        end,
        note:
          pendingEventNotes.length > 0
            ? unique([...currentDayNotes, ...pendingEventNotes]).join("\n")
            : currentDayNotes.length > 0
              ? currentDayNotes.join("\n")
              : undefined,
        allDay: true,
      })

      pendingEventNotes = []
      continue
    }

    unparsedLines.push(line)
  }

  for (const event of events) {
    if (event.title === DEFAULT_TITLE) {
      warnings.push("予定名を取得できない予定があります。")
      break
    }
  }

  return {
    events,
    unparsedLines: unique(unparsedLines),
    warnings: unique(warnings),
  }
}

function normalizeText(text: string): string {
  return text
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )
    .replace(/[Ａ-Ｚａ-ｚ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )
    .replace(/[－]/g, "-")
    .replace(/[／]/g, "/")
    .replace(/[．]/g, ".")
    .replace(/[　]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[～~−―–—]/g, "〜")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[【】]/g, "")

    // 1700 → 17:00
    .replace(
      /\b(\d{1,2})(\d{2})\b/g,
      (_, hour, minute) => `${hour}:${minute}`
    )

    // PM5:00 / pm5:00 → 17:00
    .replace(
      /\b([AaPp][Mm])\s*(\d{1,2})(?::(\d{2}))?\b/g,
      (_, ampm, hour, minute) => {
        let h = Number(hour)

        if (/pm/i.test(ampm) && h < 12) {
          h += 12
        }

        if (/am/i.test(ampm) && h === 12) {
          h = 0
        }

        return `${String(h).padStart(2, "0")}:${minute ?? "00"}`
      }
    )

    // 5pm / 6am → 17:00 / 06:00
    .replace(
      /(^|[^\d:])(\d{1,2})\s*([AaPp][Mm])(?=\s|$|[、。,.])/g,
      (_, prefix, hour, ampm) => {
        let h = Number(hour)

        if (/pm/i.test(ampm) && h < 12) {
          h += 12
        }

        if (/am/i.test(ampm) && h === 12) {
          h = 0
        }

        return `${prefix}${String(h).padStart(2, "0")}:00`
      }
    )
}

function isValidMonthDay(month: number, day: number): boolean {
  return (
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  )
}

function isValidHourMinute(hour: number, minute: number): boolean {
  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 47 &&
    minute >= 0 &&
    minute <= 59
  )
}

function parseDateLine(line: string, defaultYear: number): DateInfo | null {
  const cleaned = cleanLinePrefix(line)
  const withoutWeekday = removeWeekdayParentheses(cleaned)

  const slashDate = withoutWeekday.match(
    /^(?:(\d{4})[\/.-])?(\d{1,2})[\/.-](\d{1,2})(.*)$/
  )

  if (slashDate) {
    const month = Number(slashDate[2])
    const day = Number(slashDate[3])

    if (!isValidMonthDay(month, day)) {
      return null
    }

    return {
      year: slashDate[1] ? Number(slashDate[1]) : defaultYear,
      month,
      day,
      notes: extractNotes(slashDate[4]),
      hasExplicitYear: Boolean(slashDate[1]),
    }
  }

  const jpDate = withoutWeekday.match(
    /^(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(.*)$/
  )

  if (jpDate) {
    const month = Number(jpDate[2])
    const day = Number(jpDate[3])

    if (!isValidMonthDay(month, day)) {
      return null
    }

    return {
      year: jpDate[1] ? Number(jpDate[1]) : defaultYear,
      month,
      day,
      notes: extractNotes(jpDate[4]),
      hasExplicitYear: Boolean(jpDate[1]),
    }
  }

  return null
}

function parseDateRange(line: string): DateRangeInfo | null {
  const cleaned = removeWeekdayParentheses(cleanLinePrefix(line))

  const match = cleaned.match(
    /(\d{1,2})\/(\d{1,2}).*?〜.*?(\d{1,2})\/(\d{1,2})/
  )

  if (!match) return null

  const startMonth = Number(match[1])
  const startDay = Number(match[2])
  const endMonth = Number(match[3])
  const endDay = Number(match[4])

  if (
    !isValidMonthDay(startMonth, startDay) ||
    !isValidMonthDay(endMonth, endDay)
  ) {
    return null
  }

  return {
    startMonth,
    startDay,
    endMonth,
    endDay,
  }
}

function parseSingleLineEvent(
  line: string,
  currentYear: number,
  defaultYear: number
): ScheduleEvent | null {
  const cleaned = removeWeekdayParentheses(cleanLinePrefix(line))

  const datePattern =
    /(?:(\d{4})[\/.-])?(\d{1,2})[\/.-](\d{1,2})|(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/

  const timeRangePattern =
    /(\d{1,2}):(\d{2})\s*(?:〜|-)\s*(\d{1,2}):(\d{2})/

  const startTimeOnlyPattern = /(\d{1,2}):(\d{2})/

  const dateMatch = cleaned.match(datePattern)
  if (!dateMatch) return null

  const beforeDate = cleaned.slice(0, dateMatch.index).trim()
  const afterDate = cleaned
    .slice((dateMatch.index ?? 0) + dateMatch[0].length)
    .trim()

  const year = Number(dateMatch[1] ?? dateMatch[4] ?? currentYear ?? defaultYear)
  const month = Number(dateMatch[2] ?? dateMatch[5])
  const day = Number(dateMatch[3] ?? dateMatch[6])

  if (!isValidMonthDay(month, day)) {
    return null
  }

  const timeRangeMatch = afterDate.match(timeRangePattern)

  if (timeRangeMatch) {
    const startHour = Number(timeRangeMatch[1])
    const startMinute = Number(timeRangeMatch[2])
    const endHour = Number(timeRangeMatch[3])
    const endMinute = Number(timeRangeMatch[4])

    if (
      !isValidHourMinute(startHour, startMinute) ||
      !isValidHourMinute(endHour, endMinute)
    ) {
      return null
    }

    const beforeTime = afterDate.slice(0, timeRangeMatch.index).trim()
    const afterTime = afterDate
      .slice((timeRangeMatch.index ?? 0) + timeRangeMatch[0].length)
      .trim()

    const title = cleanTitleLine(
      [beforeDate, beforeTime, afterTime].filter(Boolean).join(" ")
    )

    if (title.length === 0) return null

    return {
      title,
      start: new Date(year, month - 1, day, startHour, startMinute),
      end: new Date(year, month - 1, day, endHour, endMinute),
      allDay: false,
    }
  }

  const startTimeOnlyMatch = afterDate.match(startTimeOnlyPattern)

  if (startTimeOnlyMatch) {
    const startHour = Number(startTimeOnlyMatch[1])
    const startMinute = Number(startTimeOnlyMatch[2])

    if (!isValidHourMinute(startHour, startMinute)) {
      return null
    }

    const beforeTime = afterDate.slice(0, startTimeOnlyMatch.index).trim()
    const afterTime = afterDate
      .slice((startTimeOnlyMatch.index ?? 0) + startTimeOnlyMatch[0].length)
      .trim()

    const title = cleanTitleLine(
      [beforeDate, beforeTime, afterTime].filter(Boolean).join(" ")
    )

    if (title.length === 0) return null

    const start = new Date(year, month - 1, day, startHour, startMinute)
    const end = new Date(start)
    end.setHours(end.getHours() + 1)

    return {
      title,
      start,
      end,
      allDay: false,
    }
  }

  return null
}

function parseDateTimeLine(
  line: string,
  currentYear: number,
  defaultYear: number
): DateTimeInfo | null {
  const cleaned = removeWeekdayParentheses(cleanLinePrefix(line))

  const dateMatch = cleaned.match(
    /^(?:(\d{4})[\/.-])?(\d{1,2})[\/.-](\d{1,2})\s+(.+)$|^(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日\s+(.+)$/
  )

  if (!dateMatch) return null

  const year = Number(dateMatch[1] ?? dateMatch[5] ?? currentYear ?? defaultYear)
  const month = Number(dateMatch[2] ?? dateMatch[6])
  const day = Number(dateMatch[3] ?? dateMatch[7])
  if (!isValidMonthDay(month, day)) {
    return null
  }
  const timeText = dateMatch[4] ?? dateMatch[8]

  const timeRange = parseTimeRange(timeText)

  if (!timeRange) return null

  return {
    year,
    month,
    day,
    timeRange,
    hasExplicitYear: Boolean(dateMatch[1] ?? dateMatch[5]),
  }
}

function parseTimeRange(line: string): TimeRange | null {
  const cleaned = cleanLinePrefix(line)

  const patterns = [
    /^(\d{1,2}):(\d{2})\s*(?:〜|-)\s*(\d{1,2}):(\d{2})(.*)$/,
    /^(\d{1,2})時(\d{2})分?\s*(?:〜|-)\s*(\d{1,2})時(\d{2})分?(.*)$/,
    /^(\d{1,2})時\s*(?:〜|-)\s*(\d{1,2})時(.*)$/,
    /^(\d{1,2}):(\d{2})\s*から\s*(\d{1,2}):(\d{2})(.*)$/,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (!match) continue

    if (match.length === 6) {
      const startHour = Number(match[1])
      const startMinute = Number(match[2])
      const endHour = Number(match[3])
      const endMinute = Number(match[4])

      if (
        !isValidHourMinute(startHour, startMinute) ||
        !isValidHourMinute(endHour, endMinute)
      ) {
        return null
      }

      return {
        startHour,
        startMinute,
        endHour,
        endMinute,
        notes: extractNotes(match[5]),
      }
    }

    if (match.length === 4) {
      const startHour = Number(match[1])
      const endHour = Number(match[2])

      if (
        !isValidHourMinute(startHour, 0) ||
        !isValidHourMinute(endHour, 0)
      ) {
        return null
      }

      return {
        startHour,
        startMinute: 0,
        endHour,
        endMinute: 0,
        notes: extractNotes(match[3]),
      }
    }
  }

  return null
}

function parseStartTimeOnly(line: string): StartTimeOnly | null {
  const cleaned = cleanLinePrefix(line)
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(.*)$/)

  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (!isValidHourMinute(hour, minute)) {
    return null
  }

  const rest = match[3].trim()
  const title = rest.length > 0 ? cleanTitleLine(rest) : null

  return {
    hour,
    minute,
    title: title && title.length > 0 ? title : null,
    notes: title ? [] : extractNotes(rest),
  }
}

function parseInlineTitle(line: string): string | null {
  const cleaned = cleanLinePrefix(line)

  const patterns = [
    /^\d{1,2}:\d{2}\s*(?:〜|-)\s*\d{1,2}:\d{2}\s*(.+)$/,
    /^\d{1,2}時\d{0,2}分?\s*(?:〜|-)\s*\d{1,2}時\d{0,2}分?\s*(.+)$/,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (!match?.[1]) continue

    const title = removeInlineNote(match[1])
    if (title.length > 0) return title
  }

  return null
}

function findNextTitle(
  lines: string[],
  startIndex: number,
  defaultYear: number
): TitleResult {
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]

    if (isHeaderLine(line) || isSeparatorLine(line)) {
      continue
    }

    if (parseDateLine(line, defaultYear)) break
    if (parseTimeRange(line)) break
    if (isMemoLine(line)) continue

    return {
      title: cleanTitleLine(line),
      index: i,
    }
  }

  return {
    title: DEFAULT_TITLE,
    index: startIndex,
  }
}

function findNextStartTime(
  lines: string[],
  startIndex: number
): StartTime | null {
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]

    if (isHeaderLine(line) || isSeparatorLine(line)) {
      continue
    }

    if (parseDateLine(line, new Date().getFullYear())) return null

    if (
      parseDateTimeLine(
        line,
        new Date().getFullYear(),
        new Date().getFullYear()
      )
    ) {
      return null
    }

    const timeRange = parseTimeRange(line)
    if (timeRange) {
      return {
        hour: timeRange.startHour,
        minute: timeRange.startMinute,
      }
    }

    const startTimeOnly = parseStartTimeOnly(line)
    if (startTimeOnly) {
      return {
        hour: startTimeOnly.hour,
        minute: startTimeOnly.minute,
      }
    }

    if (isMemoLine(line)) continue

    return null
  }

  return null
}

function extractNotes(text: string | undefined): string[] {
  if (!text) return []

  const normalized = text
    .replace(/(《担当\s*:?\s*([^》]+)》)/g, "\n担当: $2")
    .replace(/(《([^》]+)》)/g, "\n担当: $2")
    .replace(/(担当者?\s*:?\s*)/g, "\n担当: ")
    .replace(/(講師\s*:?\s*)/g, "\n講師: ")
    .replace(/(インストラクター\s*:?\s*)/g, "\nインストラクター: ")
    .replace(/(場所\s*:?\s*)/g, "\n場所: ")
    .replace(/(会場\s*:?\s*)/g, "\n会場: ")
    .replace(/(持ち物\s*:?\s*)/g, "\n持ち物: ")
    .replace(/(注意\s*:?\s*)/g, "\n注意: ")
    .replace(/(※)/g, "\n※")
    .trim()

  return unique(
    normalized
      .split("\n")
      .map((line) => cleanMemoLine(line))
      .filter((line) => line.length > 0)
      .filter((line) => !/^担当[:：]?$/.test(line))
  )
}

function isMemoLine(line: string): boolean {
  const cleaned = cleanLinePrefix(line)

  if (cleaned.length === 0) return false
  if (isHeaderLine(cleaned) || isSeparatorLine(cleaned)) return false
  if (parseTimeRange(cleaned)) return false

  return (
    cleaned.startsWith("※") ||
    cleaned.includes("担当") ||
    cleaned.includes("担当者") ||
    cleaned.includes("講師") ||
    cleaned.includes("インストラクター") ||
    cleaned.includes("先生") ||
    cleaned.includes("場所") ||
    cleaned.includes("会場") ||
    cleaned.includes("持ち物") ||
    cleaned.includes("注意") ||
    cleaned.includes("休み") ||
    cleaned.includes("休講") ||
    cleaned.includes("休館") ||
    cleaned.includes("中止") ||
    cleaned.includes("変更") ||
    cleaned.includes("代行") ||
    cleaned.includes("フリーミット")
  )
}

function isDayScopedMemoLine(line: string): boolean {
  const cleaned = cleanLinePrefix(line)

  return (
    /^担当者?\s*:/.test(cleaned) ||
    /^講師\s*:/.test(cleaned) ||
    /^インストラクター\s*:/.test(cleaned)
  )
}

function isHeaderLine(line: string): boolean {
  return (
    line.includes("会員の皆様") ||
    line.includes("お知らせ") ||
    line.includes("スケジュールです") ||
    line.includes("予定変更続き") ||
    line.includes("ご確認") ||
    line.includes("お願いいたします") ||
    line.includes("時間変更") ||
    line.includes("スケジュール変更") ||
    line.includes("その他の予定")
  )
}

function isSeparatorLine(line: string): boolean {
  return /^[-━─ー=―]+$/.test(line)
}

function cleanLinePrefix(line: string): string {
  return line.replace(/^[■・●◆◇★☆▼▽▶▷\-]+/, "").trim()
}

function cleanTitleLine(line: string): string {
  return removeInlineNote(cleanLinePrefix(line))
}

function cleanMemoLine(line: string): string {
  return cleanLinePrefix(line).replace(/^※+/, "").trim()
}

function removeInlineNote(text: string): string {
  return text
    .replace(/《[^》]+》/g, "")
    .replace(/担当者?\s*:?\s*.+$/g, "")
    .replace(/※.+$/g, "")
    .trim()
}

function removeWeekdayParentheses(line: string): string {
  return line
    .replace(
      /\((月|火|水|木|金|土|日|月・祝|火・祝|水・祝|木・祝|金・祝|土・祝|日・祝|祝|月祝|火祝|水祝|木祝|金祝|土祝|日祝)\)/g,
      ""
    )
    .trim()
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)))
}