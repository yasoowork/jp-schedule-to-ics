import { useState } from "react"
import "./App.css"

import { parseScheduleText } from "./lib/parser"
import type { ScheduleEvent } from "./types/event"

function App() {
  const [text, setText] = useState("")
  const [events, setEvents] = useState<ScheduleEvent[]>([])

  const handleParse = () => {
    const parsed = parseScheduleText(text)
    setEvents(parsed)
  }

  return (
    <main className="container">
      <h1>JP Schedule to ICS</h1>

      <p className="description">
        Convert Japanese schedule text into iCalendar events.
      </p>

      <textarea
        className="textarea"
        rows={10}
        placeholder="Paste LINE schedule text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button className="button" onClick={handleParse}>
        Parse
      </button>

      <section className="result">
        <h2>Parsed Events</h2>

        {events.length === 0 ? (
          <p>No events parsed.</p>
        ) : (
          <ul>
            {events.map((event, index) => (
              <li key={index}>
                <strong>{event.title}</strong>
                <br />
                {event.start.toString()}
                <br />
                {event.end.toString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App