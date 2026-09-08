import { describe, expect, it } from "vitest"
import { localCalendarDate, rescheduledInstant, withLocalCalendarDate } from "@/lib/calendar-date"

describe("calendar dates in the browser timezone", () => {
  it("keeps the local clock time and sends an explicit UTC instant", () => {
    const previous = new Date(2026, 8, 7, 0, 30)
    const next = rescheduledInstant("2026-09-12", previous.toISOString())
    expect(next.endsWith("Z")).toBe(true)
    const local = new Date(next)
    expect([local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes()]).toEqual([2026, 8, 12, 0, 30])
    expect(localCalendarDate(next)).toBe("2026-09-12")
  })
  it("defaults a new draft to 9am local time", () => {
    expect(new Date(rescheduledInstant("2026-09-12", null)).getHours()).toBe(9)
  })
  it("does not manufacture a date for invalid timestamps", () => {
    expect(localCalendarDate("invalid")).toBe("")
  })
  it("uses the browser day for a saved response as well as a refreshed post", () => {
    const scheduledTime = new Date(2026, 8, 12, 0, 30).toISOString()
    expect(withLocalCalendarDate({ id: "post", scheduledTime, date: "stale-server-day" })).toEqual({ id: "post", scheduledTime, date: "2026-09-12" })
    expect(withLocalCalendarDate({ date: "2026-09-12", scheduledTime: null }).date).toBe("2026-09-12")
  })
})
