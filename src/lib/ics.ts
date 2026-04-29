import { createEvents } from "ics"
import type { ScheduleEvent } from "../types/event"

type IcsDateArray = [number, number, number, number, number]

export function generateICS(events: ScheduleEvent[]): string {
  const result = createEvents(
    events.map((event) => ({
      title: event.title,
      start: toIcsDateArray(event.start),
      end: toIcsDateArray(event.end),
      description: event.note || undefined,
    }))
  )

  if (result.error || !result.value) {
    throw new Error("ICSファイルの生成に失敗しました")
  }

  return result.value
}

function toIcsDateArray(date: Date): IcsDateArray {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ]
}