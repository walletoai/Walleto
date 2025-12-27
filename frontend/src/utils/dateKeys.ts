export function getDayKey(ts: number) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  
  export function getMonthKey(ts: number) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  
  export function getYearKey(ts: number) {
    return String(new Date(ts).getFullYear());
  }
  
  // ISO week
  export function getWeekKey(ts: number) {
    const d = new Date(ts);
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayNum = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dayNum + 3);
    const firstThursday = new Date(date.getFullYear(), 0, 4);
    const diff = date.getTime() - firstThursday.getTime();
    const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
    return `${date.getFullYear()}-W${String(week).padStart(2,"0")}`;
  }
  