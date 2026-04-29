import { useState } from "react"
import "./App.css"

import { EventEditor } from "./components/EventEditor"
import { generateICS } from "./lib/ics"
import { parseScheduleText } from "./lib/parser"
import type { ScheduleEvent } from "./types/event"

function App() {
  const [text, setText] = useState("")
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [message, setMessage] = useState("")

  const handleParse = () => {
    const parsed = parseScheduleText(text)
    setEvents(parsed)
    setMessage(`${parsed.length}件の予定を解析しました。`)
  }

  const handleDownload = () => {
    if (events.length === 0) {
      setMessage("ダウンロードできる予定がありません。")
      return
    }

    try {
      const icsText = generateICS(events)
      downloadTextFile(icsText, "schedule.ics")
      setMessage("ICSファイルを生成しました。")
    } catch (error) {
      console.error(error)
      setMessage("ICSファイルの生成に失敗しました。")
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1>JP Schedule to ICS</h1>
        <p>
          LINEなどで届く日本語スケジュール文を、カレンダー登録用のICSファイルに変換します。
        </p>
      </header>

      <section className="section">
        <h2>1. スケジュール文を貼り付け</h2>

        <textarea
          className="textarea"
          rows={14}
          placeholder="ここにLINEのスケジュール文を貼り付け"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button type="button" className="primary-button" onClick={handleParse}>
          解析する
        </button>
      </section>

      <section className="section">
        <h2>2. 解析結果を確認・修正</h2>
        <EventEditor events={events} onChange={setEvents} />
      </section>

      <section className="section">
        <h2>3. ICSファイルをダウンロード</h2>

        <button type="button" className="primary-button" onClick={handleDownload}>
          ICSをダウンロード
        </button>

        {message && <p className="message">{message}</p>}
      </section>

      <footer className="footer">
        <p>
          生成結果は必ず確認してください。本ツールによる予定の誤登録や損害について責任は負いません。
        </p>
      </footer>
    </main>
  )
}

function downloadTextFile(text: string, filename: string) {
  const blob = new Blob([text], {
    type: "text/calendar;charset=utf-8",
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export default App