import type { ScheduleEvent } from "../types/event"

const DEFAULT_TITLE = "予定"

type DateInfo = {
  year: number
  month: number
  day: number
  notes: string[]
}

type TimeRange = {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  notes: string[]
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
  let currentDayNotes: string[] = []
  let pendingEventNotes: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (isHeaderLine(line) || isSeparatorLine(line)) {
      continue
    }

    const date = parseDateLine(line, defaultYear)
    if (date) {
      currentYear = date.year
      currentMonth = date.month
      currentDay = date.day
      currentDayNotes = date.notes
      pendingEventNotes = []
      continue
    }

    const timeRange = parseTimeRange(line)
    if (timeRange && currentMonth !== null && currentDay !== null) {
      const titleResult = findNextTitle(lines, i + 1, defaultYear)

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
        ...timeRange.notes,
      ])

      events.push({
        title: titleResult.title,
        start,
        end,
        note: notes.length > 0 ? notes.join("\n") : undefined,
      })

      pendingEventNotes = []
      i = titleResult.index
      continue
    }

    if (currentMonth !== null && currentDay !== null && isMemoLine(line)) {
      pendingEventNotes.push(cleanMemoLine(line))
    }
  }

  return events
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[　]/g, " ")
    .replace(/[～~−―–—]/g, "〜")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[【】]/g, "")
}

function parseDateLine(line: string, defaultYear: number): DateInfo | null {
  const cleaned = cleanLinePrefix(line)
    .replace(/\([^)]*\)/g, "")
    .trim()

  const slashDate = cleaned.match(
    /^(?:(\d{4})[\/.-])?(\d{1,2})[\/.-](\d{1,2})(.*)$/
  )

  if (slashDate) {
    return {
      year: slashDate[1] ? Number(slashDate[1]) : defaultYear,
      month: Number(slashDate[2]),
      day: Number(slashDate[3]),
      notes: extractNotes(slashDate[4]),
    }
  }

  const jpDate = cleaned.match(
    /^(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(.*)$/
  )

  if (jpDate) {
    return {
      year: jpDate[1] ? Number(jpDate[1]) : defaultYear,
      month: Number(jpDate[2]),
      day: Number(jpDate[3]),
      notes: extractNotes(jpDate[4]),
    }
  }

  return null
}

function parseTimeRange(line: string): TimeRange | null {
  const cleaned = cleanLinePrefix(line)

  const patterns = [
    /^(\d{1,2}):(\d{2})\s*〜\s*(\d{1,2}):(\d{2})(.*)$/,
    /^(\d{1,2})時(\d{2})分?\s*〜\s*(\d{1,2})時(\d{2})分?(.*)$/,
    /^(\d{1,2})時\s*〜\s*(\d{1,2})時(.*)$/,
    /^(\d{1,2}):(\d{2})\s*から\s*(\d{1,2}):(\d{2})(.*)$/,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (!match) continue

    if (match.length === 6) {
      return {
        startHour: Number(match[1]),
        startMinute: Number(match[2]),
        endHour: Number(match[3]),
        endMinute: Number(match[4]),
        notes: extractNotes(match[5]),
      }
    }

    if (match.length === 4) {
      return {
        startHour: Number(match[1]),
        startMinute: 0,
        endHour: Number(match[2]),
        endMinute: 0,
        notes: extractNotes(match[3]),
      }
    }
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

function extractNotes(text: string | undefined): string[] {
  if (!text) return []

  const normalized = text
    .replace(/(担当者?\s*:?\s*)/g, "\n担当: ")
    .replace(/(講師\s*:?\s*)/g, "\n講師: ")
    .replace(/(インストラクター\s*:?\s*)/g, "\nインストラクター: ")
    .replace(/(場所\s*:?\s*)/g, "\n場所: ")
    .replace(/(会場\s*:?\s*)/g, "\n会場: ")
    .replace(/(持ち物\s*:?\s*)/g, "\n持ち物: ")
    .replace(/(注意\s*:?\s*)/g, "\n注意: ")
    .replace(/(※)/g, "\n※")
    .trim()

  return normalized
    .split("\n")
    .map((line) => cleanMemoLine(line))
    .filter((line) => line.length > 0)
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

function isHeaderLine(line: string): boolean {
  return (
    line.includes("会員の皆様") ||
    line.includes("お知らせ") ||
    line.includes("スケジュールです") ||
    line.includes("ご確認") ||
    line.includes("お願いいたします") ||
    line.includes("時間変更")
  )
}

function isSeparatorLine(line: string): boolean {
  return /^[-━─ー=]+$/.test(line)
}

function cleanLinePrefix(line: string): string {
  return line.replace(/^[■・●◆◇★☆▼▽▶▷\-]+/, "").trim()
}

function cleanTitleLine(line: string): string {
  return cleanLinePrefix(line)
}

function cleanMemoLine(line: string): string {
  return cleanLinePrefix(line)
    .replace(/^※+/, "")
    .trim()
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)))
}