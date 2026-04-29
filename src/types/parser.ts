import type { ScheduleEvent } from "./event"

export type ParseResult = {
  events: ScheduleEvent[]
  unparsedLines: string[]
  warnings: string[]
}