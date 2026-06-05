import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm'];

// Simulated engagement score per day+hour (0–100)
// Higher = better engagement. Posted = true means you published here.
const buildHeatmapData = (platform) => {
  const weights = {
    linkedin: { peakDays: [1, 2, 3], peakHours: [8, 9, 10, 12] },
    twitter:  { peakDays: [0, 2, 4], peakHours: [9, 12, 17, 20] },
    threads:  { peakDays: [2, 4, 6], peakHours: [19, 20, 21, 22] },
    all:      { peakDays: [1, 2, 3], peakHours: [8, 9, 12, 17] },
  };
  const { peakDays, peakHours } = weights[platform] || weights.all;

  return DAYS.map((day, di) =>
    HOURS.map((hour, hi) => {
      const isPeakDay = peakDays.includes(di);
      const isPeakHour = peakHours.includes(hi + 6); // offset since hours start at 6
      let score = 10;
      if (isPeakDay) score += 30;
      if (isPeakHour) score += 35;
      if (isPeakDay && isPeakHour) score += 20;
      score += Math.round((Math.sin(di * 1.3 + hi * 0.7) + 1) * 5);
      score = Math.min(100, score);
      return { day, hour, score };
    })
  );
};

const scoreToColor = (score) => {
  if (score >= 80) return 'bg-primary/25';
  if (score >= 60) return 'bg-primary/15';
  if (score >= 40) return 'bg-primary/8';
  return 'bg-muted/40';
};

export default function PostingHeatmap({ platform = 'all' }) {
  const data = buildHeatmapData(platform);
  const [hovered, setHovered] = useState(null); // { di, hi, cell }

  return (
    <div>
      <div className="flex items-start gap-3 overflow-x-auto pb-2">
        {/* Hour labels */}
        <div className="flex flex-col gap-[3px] pt-6 flex-shrink-0">
          {HOURS.map((h, i) => (
            i % 2 === 0
              ? <div key={h} className="h-[14px] text-[9px] text-muted-foreground/40 leading-none flex items-center">{h}</div>
              : <div key={h} className="h-[14px]" />
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px] flex-shrink-0">
          {data.map((dayCol, di) => (
            <div key={di} className="flex flex-col gap-[3px]">
              <div className="h-5 text-[9px] text-muted-foreground/50 flex items-center justify-center font-medium">
                {DAYS[di]}
              </div>
              {dayCol.map((cell, hi) => (
                <div
                  key={hi}
                  onMouseEnter={() => setHovered({ di, hi, cell })}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-[34px] h-[14px] rounded-[2px] cursor-default transition-all duration-150
                    ${scoreToColor(cell.score)}
                    ${hovered?.di === di && hovered?.hi === hi ? 'ring-1 ring-foreground/30' : ''}
                  `}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-col justify-end gap-1 pb-0.5 pl-2 flex-shrink-0 self-end">
          <div className="text-[9px] text-muted-foreground/40 mb-1">Engagement</div>
          <div className="flex items-center gap-1">
            {[8, 15, 25, 50, 70, 100].map(s => (
              <div key={s} className={`w-3 h-3 rounded-[2px] ${scoreToColor(s)}`} />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground/30 w-[72px] mt-0.5">
            <span>Low</span><span>High</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="mt-3 border border-border rounded-lg px-4 py-3 bg-card/80 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-8">
              <div>
                <p className="text-[11px] font-medium text-foreground">
                  {DAYS[hovered.di]} · {HOURS[hovered.hi]}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Predicted engagement score: <span className={`font-semibold ${hovered.cell.score >= 70 ? 'text-primary' : 'text-foreground'}`}>{hovered.cell.score}/100</span>
                </p>
              </div>
              {hovered.cell.score >= 70 ? (
                <p className="text-[10px] text-primary/80">Peak window — schedule here</p>
              ) : null}
            </div>
          </motion.div>
        )}
        {!hovered && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-[10px] text-muted-foreground/30 text-center"
          >
            Hover any cell to see predicted engagement score
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}