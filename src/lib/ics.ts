import { createEvents } from "ics"
import type { ScheduleEvent } from "../types/event"

type IcsDateArray =
  | [number, number, number]
  | [number, number, number, number, number]

export function generateICS(events: ScheduleEvent[]): string {
  for (const event of events) {
    if (event.end < event.start) {
      throw new Error(
        "終了時刻が開始時刻より前の予定があります。"
      )
    }
  }

  const icsEvents = events.map((event) => ({
    title: event.title,

    start: event.allDay
      ? toAllDayDateArray(event.start)
      : toDateTimeArray(event.start),

    end: event.allDay
      ? toAllDayDateArray(event.end)
      : toDateTimeArray(event.end),

    description: event.note || undefined,

    startOutputType: "local" as const,
  }))

  const result = createEvents(icsEvents)

  if (result.error || !result.value) {
    console.error("ics error", result.error)
    throw new Error("ICSファイルの生成に失敗しました")
  }

  return result.value
}

function toDateTimeArray(date: Date): IcsDateArray {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ]
}

function toAllDayDateArray(date: Date): IcsDateArray {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  ]
}