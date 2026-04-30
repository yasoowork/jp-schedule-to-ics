import { useRef, useState } from "react"
import "./App.css"

import { EventEditor } from "./components/EventEditor"
import { generateICS } from "./lib/ics"
import { parseScheduleText } from "./lib/parser"
import type { ScheduleEvent } from "./types/event"

function App() {
  const MAX_TEXT_LENGTH = 10000
  const [text, setText] = useState("")
  const [rolloverYear, setRolloverYear] = useState(true)
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [message, setMessage] = useState("")
  const [unparsedLines, setUnparsedLines] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const resultSectionRef = useRef<HTMLElement | null>(null)

  const handleParse = () => {
    const result = parseScheduleText(text, { rolloverYear })

    setEvents(result.events)
    setUnparsedLines(result.unparsedLines)
    setWarnings(result.warnings)

    let nextMessage = `${result.events.length}件の予定を解析しました。`

    if (result.unparsedLines.length > 0) {
      nextMessage += ` 未解析: ${result.unparsedLines.length}件`
    }

    if (result.warnings.length > 0) {
      nextMessage += " 警告あり"
    }

    setMessage(nextMessage)
    requestAnimationFrame(() => {
      resultSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }

  const handleDownload = () => {
    if (events.length === 0) {
      setMessage("ダウンロードできる予定がありません。")
      return
    }

    try {
      const icsText = generateICS(events)
      const now = new Date()
      const filename =
        `jp-schedule-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.ics`

      downloadTextFile(icsText, filename)
      setMessage("ICSファイルを生成しました。")
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setMessage(
          `ICSファイルの生成に失敗しました。\n${error.message}`
        )
      } else {
        setMessage("ICSファイルの生成に失敗しました。")
      }
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
          maxLength={MAX_TEXT_LENGTH}
          placeholder={`例：

5/2 18:00〜19:00 キックボクシング

5/3（月）
20:00~21:00
柔術

5/4 20:00 ボクシング`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="input-help">
          <span>
            全角数字やAM/PM表記にも対応しています。
          </span>

          <span className="input-counter">
            {text.length} / {MAX_TEXT_LENGTH}文字
          </span>
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={rolloverYear}
            onChange={(e) => setRolloverYear(e.target.checked)}
          />
          年またぎを自動補正
        </label>

        <button type="button" className="primary-button" onClick={handleParse}>
          解析する
        </button>
      </section>

      <section className="section" ref={resultSectionRef}>
        <h2>2. 解析結果を確認・修正</h2>
        <EventEditor events={events} onChange={setEvents} />
      </section>

      <section className="section">
        <h2>3. ICSファイルをダウンロード</h2>

        <button type="button" className="primary-button" onClick={handleDownload}>
          ICSをダウンロード
        </button>

        {message && <p className="message">{message}</p>}

        {warnings.length > 0 && (
          <div className="warning-box">
            <h3>警告</h3>

            <ul>
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {unparsedLines.length > 0 && (
          <div className="warning-box">
            <h3>解析できなかった行</h3>

            <ul>
              {unparsedLines.map((line, index) => (
                <li key={index}>{truncateText(line, 40)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <footer className="footer">
        <div className="footer-section">
          <h3>プライバシー</h3>

          <p>
            入力内容はサーバーに送信されず、ブラウザ内で処理されます。
          </p>
        </div>

        <div className="footer-section">
          <h3>広告・アクセス解析</h3>

          <p>
            Google Analytics、Google AdSense、Amazonアソシエイトを利用しています。
          </p>
        </div>

        <div className="footer-section">
          <h3>免責</h3>

          <p>
            生成結果は必ず確認してください。本ツールによる予定の誤登録、通知漏れ、損害等について責任は負いません。
          </p>
        </div>

        <div className="footer-section">
          <h3>対応入力形式</h3>

          <p>
            対応しているスケジュール文の形式は{" "}
            <a
              href="https://github.com/yasoowork/jp-schedule-to-ics"
              target="_blank"
              rel="noreferrer"
            >
              README
            </a>{" "}
            をご確認ください。
          </p>
        </div>

        <div className="footer-section">
          <h3>不具合報告</h3>

          <p>
            対応できない形式や不具合があれば、
            <a
              href="https://github.com/yasoowork/jp-schedule-to-ics/issues"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Issues
            </a>
            までご連絡ください。
          </p>
        </div>

        <div className="footer-section">
          <h3>Related</h3>

          <p className="footer-inline-links">
            <a
              href="https://amzn.to/4ujjP6S"
              target="_blank"
              rel="noreferrer sponsored"
            >
              Martial Arts
            </a>

            <span>/</span>

            <a
              href="https://amzn.to/4ubZgJI"
              target="_blank"
              rel="noreferrer sponsored"
            >
              Supplements
            </a>

            <span>/</span>

            <a
              href="https://amzn.to/42FIAhO"
              target="_blank"
              rel="noreferrer sponsored"
            >
              PC & Accessories
            </a>
          </p>
        </div>

        <div className="footer-bottom">
          Created by{" "}
          <a href="https://yasoo.work" target="_blank" rel="noreferrer">
            yasoo.work
          </a>
        </div>
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

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

export default App