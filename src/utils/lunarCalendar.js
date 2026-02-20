/**
 * Vietnamese Lunar Calendar Converter
 * Based on Hồ Ngọc Đức's algorithm
 * Reference: https://www.informatik.uni-leipzig.de/~duc/amlich/
 */

const PI = Math.PI

// Compute the (integral) Julian day number of day dd/mm/yyyy
function jdFromDate(dd, mm, yy) {
  const a = Math.floor((14 - mm) / 12)
  const y = yy + 4800 - a
  const m = mm + 12 * a - 3
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  if (jd < 2299161) {
    jd =
      dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083
  }
  return jd
}

// Compute the longitude of the sun at any time
function SunLongitude(jdn) {
  const T = (jdn - 2451545.0) / 36525 // Time in Julian centuries from 2000-01-01 12:00:00 GMT
  const T2 = T * T
  const dr = PI / 180 // degree to radian
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2 // mean anomaly, degree
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2 // mean longitude, degree
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
  DL =
    DL +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M)
  let L = L0 + DL // true longitude, degree
  L = L * dr
  L = L - PI * 2 * Math.floor(L / (PI * 2)) // Normalize to (0, 2*PI)
  return L
}

// Compute sun position at midnight of the day with the given Julian day number
function getSunLongitude(dayNumber, timeZone) {
  return Math.floor((SunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6)
}

// Compute the day of the k-th new moon in the given time zone
function getNewMoonDay(k, timeZone) {
  const T = k / 1236.85 // Time in Julian centuries from 1900 January 0.5
  const T2 = T * T
  const T3 = T2 * T
  const dr = PI / 180
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3
  Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr) // Mean new moon
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3 // Sun's mean anomaly
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3 // Moon's mean anomaly
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3 // Moon's argument of latitude
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M)
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr)
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr)
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr))
  C1 =
    C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M))
  C1 =
    C1 -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr))
  C1 =
    C1 +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M))
  let deltat
  if (T < -11) {
    deltat =
      0.001 +
      0.000839 * T +
      0.0002261 * T2 -
      0.00000845 * T3 -
      0.000000081 * T * T3
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2
  }
  const JdNew = Jd1 + C1 - deltat
  return Math.floor(JdNew + 0.5 + timeZone / 24)
}

// Find the day that starts the lunar month 11 of the given year for the given time zone
function getLunarMonth11(yy, timeZone) {
  const off = jdFromDate(31, 12, yy) - 2415021
  const k = Math.floor(off / 29.530588853)
  let nm = getNewMoonDay(k, timeZone)
  const sunLong = getSunLongitude(nm, timeZone) // sun longitude at local midnight
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone)
  }
  return nm
}

// Find the index of the leap month after the month starting on the day a11
function getLeapMonthOffset(a11, timeZone) {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5)
  let last = 0
  let i = 1 // We start with the month following lunar month 11
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
  do {
    last = arc
    i++
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
  } while (arc != last && i < 14)
  return i - 1
}

/**
 * Convert solar date to lunar date
 * @param {number} dd - Day (1-31)
 * @param {number} mm - Month (1-12)
 * @param {number} yy - Year
 * @param {number} timeZone - Time zone offset (7 for Vietnam)
 * @returns {Object} Lunar date object {day, month, year, leap}
 */
export function convertSolar2Lunar(dd, mm, yy, timeZone = 7) {
  const dayNumber = jdFromDate(dd, mm, yy)
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853)
  let monthStart = getNewMoonDay(k + 1, timeZone)
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone)
  }
  let a11 = getLunarMonth11(yy, timeZone)
  let b11 = a11
  let lunarYear
  if (a11 >= monthStart) {
    lunarYear = yy
    a11 = getLunarMonth11(yy - 1, timeZone)
  } else {
    lunarYear = yy + 1
    b11 = getLunarMonth11(yy + 1, timeZone)
  }
  const lunarDay = dayNumber - monthStart + 1
  const diff = Math.floor((monthStart - a11) / 29)
  let lunarLeap = 0
  let lunarMonth = diff + 11
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone)
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10
      if (diff == leapMonthDiff) {
        lunarLeap = 1
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1
  }
  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: lunarLeap,
  }
}

/**
 * Get lunar date string in Vietnamese format
 * @param {number} dd - Solar day
 * @param {number} mm - Solar month
 * @param {number} yy - Solar year
 * @returns {string} Lunar date string (e.g., "15/1")
 */
export function getLunarDateString(dd, mm, yy) {
  const lunar = convertSolar2Lunar(dd, mm, yy)
  return `${lunar.day}/${lunar.month}${lunar.leap ? " (nhuận)" : ""}`
}

/**
 * Check if a solar date is a Vietnamese holiday
 * @param {number} dd - Solar day
 * @param {number} mm - Solar month
 * @param {number} yy - Solar year
 * @returns {string|null} Holiday name or null
 */
export function getVietnameseHoliday(dd, mm, yy) {
  const lunar = convertSolar2Lunar(dd, mm, yy)

  // Lunar holidays
  if (lunar.month === 1 && lunar.day === 1) return "Tết Nguyên Đán"
  if (lunar.month === 1 && lunar.day === 15) return "Tết Nguyên Tiêu"
  if (lunar.month === 3 && lunar.day === 10) return "Giỗ Tổ Hùng Vương"
  if (lunar.month === 4 && lunar.day === 15) return "Phật Đản"
  if (lunar.month === 5 && lunar.day === 5) return "Tết Đoan Ngọ"
  if (lunar.month === 7 && lunar.day === 15) return "Vu Lan"
  if (lunar.month === 8 && lunar.day === 15) return "Tết Trung Thu"
  if (lunar.month === 12 && lunar.day === 23) return "Ông Táo chầu trời"

  // Solar holidays
  if (mm === 1 && dd === 1) return "Tết Dương lịch"
  if (mm === 2 && dd === 14) return "Valentine"
  if (mm === 3 && dd === 8) return "Quốc tế Phụ nữ"
  if (mm === 4 && dd === 30) return "Giải phóng miền Nam"
  if (mm === 5 && dd === 1) return "Quốc tế Lao động"
  if (mm === 6 && dd === 1) return "Quốc tế Thiếu nhi"
  if (mm === 9 && dd === 2) return "Quốc khánh"
  if (mm === 10 && dd === 20) return "Ngày Phụ nữ Việt Nam"
  if (mm === 11 && dd === 20) return "Ngày Nhà giáo Việt Nam"
  if (mm === 12 && dd === 24) return "Giáng sinh"
  if (mm === 12 && dd === 25) return "Giáng sinh"

  return null
}

/**
 * Get Zodiac animal for lunar year
 * @param {number} lunarYear - Lunar year
 * @returns {string} Zodiac name
 */
export function getZodiacAnimal(lunarYear) {
  const zodiac = [
    "Tý",
    "Sửu",
    "Dần",
    "Mão",
    "Thìn",
    "Tỵ",
    "Ngọ",
    "Mùi",
    "Thân",
    "Dậu",
    "Tuất",
    "Hợi",
  ]
  return zodiac[(lunarYear + 8) % 12]
}
