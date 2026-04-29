import type { ScheduleEvent } from "../types/event"

type EventEditorProps = {
  events: ScheduleEvent[]
  onChange: (events: ScheduleEvent[]) => void
}

export function EventEditor({ events, onChange }: EventEditorProps) {
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
  }

  if (events.length === 0) {
    return <p className="empty">解析された予定はありません。</p>
  }

  return (
    <div className="table-wrapper">
      <table className="event-table">
        <thead>
          <tr>
            <th>タイトル</th>
            <th>開始</th>
            <th>終了</th>
            <th>メモ</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {events.map((event, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={event.title}
                  onChange={(e) =>
                    updateEvent(index, "title", e.target.value)
                  }
                />
              </td>

              <td>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(event.start)}
                  onChange={(e) =>
                    updateEvent(index, "start", e.target.value)
                  }
                />
              </td>

              <td>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(event.end)}
                  onChange={(e) =>
                    updateEvent(index, "end", e.target.value)
                  }
                />
              </td>

              <td>
                <input
                  type="text"
                  value={event.note ?? ""}
                  onChange={(e) =>
                    updateEvent(index, "note", e.target.value)
                  }
                />
              </td>

              <td>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => removeEvent(index)}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

function pad(value: number): string {
  return String(value).padStart(2, "0")
}