import type { ScheduleEvent } from "../types/event"

const DEFAULT_TITLE = "予定"

type TimeRange = {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

type TitleResult = {
  title: string
  index: number
}

export function parseScheduleText(text: string): ScheduleEvent[] {
  const defaultYear = new Date().getFullYear()

  const lines = normalizeText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const events: ScheduleEvent[] = []

  let currentYear = defaultYear
  let currentMonth: number | null = null
  let currentDay: number | null = null
  let currentStaff: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const date = parseDateLine(line, defaultYear)
    if (date) {
      currentYear = date.year
      currentMonth = date.month
      currentDay = date.day
      currentStaff = null
      continue
    }

    const staff = parseStaffLine(line)
    if (staff) {
      currentStaff = staff
      continue
    }

    if (isClosedLine(line)) {
      continue
    }

    const timeRange = parseTimeRange(line)
    if (!timeRange || currentMonth === null || currentDay === null) {
      continue
    }

    const titleResult = findNextTitle(lines, i + 1)

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

    events.push({
      title: titleResult.title,
      start,
      end,
      note: currentStaff ? `担当：${currentStaff}` : undefined,
    })

    i = titleResult.index
  }

  return events
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[　]/g, " ")
    .replace(/[～~−ー―–—]/g, "〜")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[【】]/g, "")
}

function parseDateLine(
  line: string,
  defaultYear: number
): { year: number; month: number; day: number } | null {
  const cleaned = line
  .replace(/^[■・●◆◇★☆]+/, "")
  .trim()

  const slashDate = cleaned.match(
    /^(?:(\d{4})[\/.-])?(\d{1,2})[\/.-](\d{1,2})/
  )

  if (slashDate) {
    return {
      year: slashDate[1] ? Number(slashDate[1]) : defaultYear,
      month: Number(slashDate[2]),
      day: Number(slashDate[3]),
    }
  }

  const jpDate = cleaned.match(/^(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/)

  if (jpDate) {
    return {
      year: jpDate[1] ? Number(jpDate[1]) : defaultYear,
      month: Number(jpDate[2]),
      day: Number(jpDate[3]),
    }
  }

  return null
}

function parseStaffLine(line: string): string | null {
  const match = line.match(/^(担当|インストラクター|講師|先生)\s*:\s*(.+)$/)
  return match ? match[2].trim() : null
}

function isClosedLine(line: string): boolean {
  return (
    line.includes("休み") ||
    line.includes("休講") ||
    line.includes("休館") ||
    line.includes("中止") ||
    line.includes("お休み")
  )
}

function parseTimeRange(line: string): TimeRange | null {
  const patterns = [
    /^(\d{1,2}):(\d{2})\s*〜\s*(\d{1,2}):(\d{2})$/,
    /^(\d{1,2})時(\d{2})分?\s*〜\s*(\d{1,2})時(\d{2})分?$/,
    /^(\d{1,2})時\s*〜\s*(\d{1,2})時$/,
    /^(\d{1,2}):(\d{2})\s*から\s*(\d{1,2}):(\d{2})$/,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (!match) continue

    if (match.length === 5) {
      return {
        startHour: Number(match[1]),
        startMinute: Number(match[2]),
        endHour: Number(match[3]),
        endMinute: Number(match[4]),
      }
    }

    if (match.length === 3) {
      return {
        startHour: Number(match[1]),
        startMinute: 0,
        endHour: Number(match[2]),
        endMinute: 0,
      }
    }
  }

  return null
}

function findNextTitle(lines: string[], startIndex: number): TitleResult {
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]

    if (parseDateLine(line, new Date().getFullYear())) break
    if (parseTimeRange(line)) break
    if (parseStaffLine(line)) continue
    if (isClosedLine(line)) continue

    return {
      title: line,
      index: i,
    }
  }

  return {
    title: DEFAULT_TITLE,
    index: startIndex,
  }
}