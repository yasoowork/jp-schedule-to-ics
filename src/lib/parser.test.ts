import { describe, expect, it } from "vitest"

import { parseScheduleText } from "./parser"

describe("parseScheduleText", () => {
  it("日付・時間・予定名を解析できる", () => {
    const result = parseScheduleText(
      `■5/2（土）
17:00〜18:00
キックボクシング`,
      { defaultYear: 2026 }
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].title).toBe("キックボクシング")
    expect(result.events[0].start).toEqual(new Date(2026, 4, 2, 17, 0))
    expect(result.events[0].end).toEqual(new Date(2026, 4, 2, 18, 0))
    expect(result.events[0].allDay).toBe(false)
  })

  it("月が戻った場合、翌年として扱う", () => {
    const result = parseScheduleText(
      `12/30
17:00〜18:00
年末練習

1/3
17:00〜18:00
初練習`,
      { defaultYear: 2026, rolloverYear: true }
    )

    expect(result.events).toHaveLength(2)
    expect(result.events[0].start).toEqual(new Date(2026, 11, 30, 17, 0))
    expect(result.events[1].start).toEqual(new Date(2027, 0, 3, 17, 0))
  })

  it("月が戻っても rolloverYear=false なら同じ年として扱う", () => {
    const result = parseScheduleText(
      `12/30
17:00〜18:00
年末練習

1/3
17:00〜18:00
初練習`,
      { defaultYear: 2026, rolloverYear: false }
    )

    expect(result.events).toHaveLength(2)
    expect(result.events[0].start).toEqual(new Date(2026, 11, 30, 17, 0))
    expect(result.events[1].start).toEqual(new Date(2026, 0, 3, 17, 0))
  })

  it("時間がない予定は終日予定として扱う", () => {
    const result = parseScheduleText(
    `5/2
キックボクシング特別練習`,
    { defaultYear: 2026 }
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].title).toBe("キックボクシング特別練習")
    expect(result.events[0].start).toEqual(new Date(2026, 4, 2))
    expect(result.events[0].end).toEqual(new Date(2026, 4, 3))
    expect(result.events[0].allDay).toBe(true)
  })

  it("時間行に予定名がある場合、インライン予定名として解析できる", () => {
    const result = parseScheduleText(
      `5/2
17:00〜18:00 キックボクシング`,
      { defaultYear: 2026 }
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].title).toBe("キックボクシング")
  })

  it("予定名を取得できない場合、警告を出す", () => {
    const result = parseScheduleText(
      `5/2
17:00〜18:00`,
      { defaultYear: 2026 }
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].title).toBe("予定")
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("担当者などのメモを note に入れる", () => {
    const result = parseScheduleText(
      `5/2
担当者：タナカ
17:00〜18:00
キックボクシング`,
      { defaultYear: 2026 }
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].note).toContain("担当")
    expect(result.events[0].note).toContain("タナカ")
  })

    it("日付範囲を終日予定として解析できる", () => {
        const result = parseScheduleText(
        `5/2〜5/4 GW休館`,
        { defaultYear: 2026 }
        )

        expect(result.events).toHaveLength(1)
        expect(result.events[0].title).toBe("5/2〜5/4 GW休館")
        expect(result.events[0].start).toEqual(new Date(2026, 4, 2))
        expect(result.events[0].end).toEqual(new Date(2026, 4, 5))
        expect(result.events[0].allDay).toBe(true)
    })

    it("ハイフン区切りの一行予定を解析できる", () => {
        const result = parseScheduleText(
            `2/3 18:00-19:00 仕事`,
            { defaultYear: 2026 }
        )

        expect(result.events).toHaveLength(1)
        expect(result.events[0].title).toBe("仕事")
        expect(result.events[0].start).toEqual(new Date(2026, 1, 3, 18, 0))
        expect(result.events[0].end).toEqual(new Date(2026, 1, 3, 19, 0))
    })

    it("コロン無し時間を解析できる", () => {
        const result = parseScheduleText(
            `3/4 1700〜1800 仕事`,
            { defaultYear: 2026 }
        )

        expect(result.events).toHaveLength(1)
        expect(result.events[0].title).toBe("仕事")
        expect(result.events[0].start).toEqual(new Date(2026, 2, 4, 17, 0))
        expect(result.events[0].end).toEqual(new Date(2026, 2, 4, 18, 0))
    })

    it("PM表記を解析できる", () => {
        const result = parseScheduleText(
            `3/4 PM5:00〜PM6:00 仕事`,
            { defaultYear: 2026 }
        )

        expect(result.events).toHaveLength(1)
        expect(result.events[0].title).toBe("仕事")
        expect(result.events[0].start).toEqual(new Date(2026, 2, 4, 17, 0))
        expect(result.events[0].end).toEqual(new Date(2026, 2, 4, 18, 0))
    })

    it("pm短縮表記を解析できる", () => {
        const result = parseScheduleText(
            `3/4 5pm-6pm 仕事`,
            { defaultYear: 2026 }
        )

        expect(result.events).toHaveLength(1)
        expect(result.events[0].title).toBe("仕事")
        expect(result.events[0].start).toEqual(new Date(2026, 2, 4, 17, 0))
        expect(result.events[0].end).toEqual(new Date(2026, 2, 4, 18, 0))
    })

    it("日付と時間が同じ行で、予定名が次行にある形式を解析できる", () => {
        const result = parseScheduleText(
            `2/3 15:00〜16:00
        仕事`,
            { defaultYear: 2026 }
        )

        expect(result.events).toHaveLength(1)
        expect(result.events[0].title).toBe("仕事")
        expect(result.events[0].start).toEqual(new Date(2026, 1, 3, 15, 0))
        expect(result.events[0].end).toEqual(new Date(2026, 1, 3, 16, 0))
    })

    it("日付直下の担当メモを同じ日付ブロック内の複数予定に引き継ぐ", () => {
    const result = parseScheduleText(
        `5/4
    担当：タナカ

    13:00〜13:50
    キックボクシング（初心者）

    14:00〜15:20
    キックボクシング（対人練習）`,
        { defaultYear: 2026 }
    )

    expect(result.events).toHaveLength(2)
    expect(result.events[0].note).toContain("担当:タナカ")
    expect(result.events[1].note).toContain("担当:タナカ")
    })

})