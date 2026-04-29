import { useState } from "react"
import type { ScheduleEvent } from "../types/event"

type EventEditorProps = {
  events: ScheduleEvent[]
  onChange: (events: ScheduleEvent[]) => void
}

export function EventEditor({ events, onChange }: EventEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const updateEvent = (
    index: number,
    field: keyof ScheduleEvent,
    value: string
  ) => {
    const updated = events.map((event, eventIndex) => {
      if (eventIndex !== index) return event

      if (field === "start" || field === "end") {
        return {
          ...event,
          [field]: new Date(value),
        }
      }

      return {
        ...event,
        [field]: value,
      }
    })

    onChange(updated)
  }

  const removeEvent = (index: number) => {
    onChange(events.filter((_, eventIndex) => eventIndex !== index))

    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  if (events.length === 0) {
    return <p className="empty">解析された予定はありません。</p>
  }

  return (
    <div className="compact-events">
      <div className="event-summary">
        <strong>{events.length}</strong> 件の予定
      </div>

      {events.map((event, index) => {
        const isEditing = editingIndex === index

        return (
          <div className="compact-event" key={index}>
            <div className="compact-event-main">
              <div className="compact-event-text">
                <div className="compact-event-title">{event.title}</div>

                <div className="compact-event-meta">
                  <span>
                    {formatDateTime(event.start)} - {formatTime(event.end)}
                  </span>

                  {event.note && <span>{event.note}</span>}
                </div>
              </div>

              <div className="compact-event-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingIndex(isEditing ? null : index)}
                >
                  {isEditing ? "閉じる" : "編集"}
                </button>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => removeEvent(index)}
                >
                  削除
                </button>
              </div>
            </div>

            {isEditing && (
              <div className="event-detail-editor">
                <label>
                  タイトル
                  <input
                    type="text"
                    value={event.title}
                    onChange={(e) =>
                      updateEvent(index, "title", e.target.value)
                    }
                  />
                </label>

                <label>
                  開始
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(event.start)}
                    onChange={(e) =>
                      updateEvent(index, "start", e.target.value)
                    }
                  />
                </label>

                <label>
                  終了
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(event.end)}
                    onChange={(e) =>
                      updateEvent(index, "end", e.target.value)
                    }
                  />
                </label>

                <label>
                  メモ
                  <input
                    type="text"
                    value={event.note ?? ""}
                    onChange={(e) =>
                      updateEvent(index, "note", e.target.value)
                    }
                  />
                </label>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function toDateTimeLocalValue(date: Date): string {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())

  return `${year}-${month}-${day}T${hour}:${minute}`
}

function formatDateTime(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}