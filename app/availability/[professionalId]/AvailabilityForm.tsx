"use client";

import { useMemo, useState } from "react";

type WindowValue = {
  weekday: 1 | 2 | 3 | 4 | 5;
  startMinutes: number;
  endMinutes: number;
};

const DAYS = [
  { weekday: 1 as const, label: "Monday" },
  { weekday: 2 as const, label: "Tuesday" },
  { weekday: 3 as const, label: "Wednesday" },
  { weekday: 4 as const, label: "Thursday" },
  { weekday: 5 as const, label: "Friday" },
];

const TIMES = Array.from({ length: 21 }, (_, index) => 8 * 60 + index * 30);

function timeLabel(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour = hour24 % 12 || 12;
  const suffix = hour24 < 12 ? "AM" : "PM";
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export default function CleanerAvailabilityForm({
  professionalId,
  token,
  cleanerName,
  initialWeekStart,
  initialWindows,
}: {
  professionalId: string;
  token: string;
  cleanerName: string;
  initialWeekStart: string;
  initialWindows: WindowValue[];
}) {
  const initialMap = useMemo(
    () =>
      new Map(
        initialWindows.map((window) => [window.weekday, window] as const)
      ),
    [initialWindows]
  );

  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [days, setDays] = useState(() =>
    DAYS.map(({ weekday }) => {
      const value = initialMap.get(weekday);
      return {
        weekday,
        enabled: Boolean(value),
        startMinutes: value?.startMinutes ?? 8 * 60,
        endMinutes: value?.endMinutes ?? 18 * 60,
      };
    })
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const updateDay = (
    weekday: number,
    patch: Partial<(typeof days)[number]>
  ) => {
    setDays((current) =>
      current.map((day) =>
        day.weekday === weekday ? { ...day, ...patch } : day
      )
    );
  };

  const submit = async () => {
    setStatus("saving");
    setMessage("");

    const windows = days
      .filter((day) => day.enabled)
      .map(({ weekday, startMinutes, endMinutes }) => ({
        weekday,
        startMinutes,
        endMinutes,
      }));

    if (windows.some((window) => window.endMinutes <= window.startMinutes)) {
      setStatus("error");
      setMessage("Each end time must be later than its start time.");
      return;
    }

    const response = await fetch("/api/professional/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId,
        token,
        weekStart,
        windows,
      }),
    });

    const result = await response.json();
    setStatus(response.ok ? "saved" : "error");
    setMessage(result.message || (response.ok ? "Saved." : "Please try again."));
  };

  return (
    <main className="min-h-screen bg-[#060606] px-4 py-10 text-white">
      <section className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#b7924c]">
          SoHo Cleaning Group
        </p>
        <h1 className="mt-3 font-serif text-4xl">Weekly Availability</h1>
        <p className="mt-3 text-sm leading-7 text-[#cfc7b7]">
          Hi {cleanerName}. Choose the days and hours you can work. The customer
          booking calendar will only offer jobs that fit inside the availability
          you submit.
        </p>

        <div className="mt-8 rounded-[28px] border border-[#2a2419] bg-[#0a0a0a] p-6">
          <label className="block">
            <span className="mb-2 block text-sm text-[#d8d0c1]">Week of</span>
            <input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
              className="w-full rounded-xl border border-[#2f291d] bg-[#111] px-4 py-3 text-white"
            />
            <span className="mt-2 block text-xs text-[#8f8778]">
              Choose a Monday.
            </span>
          </label>

          <div className="mt-6 grid gap-4">
            {days.map((day) => (
              <div
                key={day.weekday}
                className="rounded-2xl border border-[#2f291d] bg-[#111] p-4"
              >
                <label className="flex items-center gap-3 font-medium">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(event) =>
                      updateDay(day.weekday, { enabled: event.target.checked })
                    }
                  />
                  {DAYS.find((item) => item.weekday === day.weekday)?.label}
                </label>

                {day.enabled && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label>
                      <span className="mb-1 block text-xs text-[#8f8778]">
                        Start
                      </span>
                      <select
                        value={day.startMinutes}
                        onChange={(event) =>
                          updateDay(day.weekday, {
                            startMinutes: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-[#2f291d] bg-[#090909] px-3 py-3"
                      >
                        {TIMES.slice(0, -1).map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {timeLabel(minutes)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-1 block text-xs text-[#8f8778]">
                        End
                      </span>
                      <select
                        value={day.endMinutes}
                        onChange={(event) =>
                          updateDay(day.weekday, {
                            endMinutes: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-[#2f291d] bg-[#090909] px-3 py-3"
                      >
                        {TIMES.slice(1).map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {timeLabel(minutes)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          {message && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                status === "saved"
                  ? "border-emerald-900/60 bg-emerald-950/20 text-emerald-200"
                  : "border-red-900/60 bg-red-950/20 text-red-200"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={status === "saving"}
            className="mt-6 w-full rounded-xl bg-[#d6ab5f] px-5 py-4 font-semibold text-black disabled:opacity-60"
          >
            {status === "saving" ? "Saving..." : "Submit availability"}
          </button>
        </div>
      </section>
    </main>
  );
}
