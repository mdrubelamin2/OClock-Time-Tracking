/* eslint-disable no-undef */
const AttendanceModel = require('../models/AttendanceModel');
const { timeToHour } = require('../utilities/formater');
// grobal variable  multiple date
const holidaysArray = [];
const leaveDaysArray = [];
global.holidayAndLeavedaysDateRange = []

//  function for date formater
function dateFormate(dateTime) {
  const today = new Date(dateTime)
  const month = today.getMonth() + 1
  const year = today.getFullYear()
  const day = today.getDate() < 10 ? `0${today.getDate()}` : today.getDate()
  const getDate = `${year}-${month}-${day}`;

  return getDate;
}
// holiday dates function
function multipleDate(numOfDay, date) {
  const myDate = new Date(date);
  const gotDate = new Date(myDate.setDate(myDate.getDate() - 1))

  for (let i = 1; i <= numOfDay; i += 1) {
    holidaysArray.push(dateFormate(gotDate.setDate(gotDate.getDate() + 1)))
  }
}
// leave dates funciton
function multipleLeaveDates(numOfDay, date) {
  const myDate = new Date(date);
  const gotDate = new Date(myDate.setDate(myDate.getDate() - 1))

  for (let i = 1; i <= numOfDay; i += 1) {
    leaveDaysArray.push(dateFormate(gotDate.setDate(gotDate.getDate() + 1)))
  }
}

const ReportController = {

  userReport: async (req, res) => {
    try {
      const userId = req.user.id;
      const lastSevenDaysReport = await AttendanceModel.anEmployeeReportLastSavenDays(userId);
      const [{ avgStartTime }] = await AttendanceModel.avgStartTime(userId)
      const [{ avgEndTime }] = await AttendanceModel.avgEndTime(userId)
      const [{ weekTotal }] = await AttendanceModel.weekTotal(userId)
      const [{ monthTotal }] = await AttendanceModel.thisMonthTotal(userId)
      const weekHr = timeToHour(weekTotal)
      const monthHr = timeToHour(monthTotal)
      // for holidays
      const holidaysDate = await AttendanceModel.holidaysDate();
      // multiple date

      holidaysDate.forEach((el) => {
        multipleDate(el.count_holiday, el.holiday_start)
      })
      const lastSevenDaysReportDates = []
      const reportStringify = JSON.parse(JSON.stringify(lastSevenDaysReport));

      reportStringify.forEach((el) => {
        lastSevenDaysReportDates.push(el.date_for_holiday)
      })
      // check employee work in holiday
      const employeeWorkInHoliday = holidaysArray.filter((el) => lastSevenDaysReportDates.includes(el))
      // console.log({ employeeWorkInHoliday })
      const holidayObject = [];
      employeeWorkInHoliday.forEach((el) => {
        holidayObject.push({ h_date: el, type: 'holiday', fixed_time: '0' })
      })

      // =========for employee leave date
      const employeeLeaveDates = await AttendanceModel.employeeLeaveDates(userId)

      employeeLeaveDates.forEach((el) => {
        multipleLeaveDates(el.count_leave_day, el.leave_start)
      })

      const employeeWorkInLeaveDay = leaveDaysArray.filter((el) => lastSevenDaysReportDates.includes(el))
      console.log({ employeeWorkInLeaveDay });

      const leaveDayObject = [];
      employeeWorkInLeaveDay.forEach((el) => {
        leaveDayObject.push({ l_date: el, type: 'leave', fixed_time: '0' })
      })
      // marge holiday and leave days array of object
      const margeHolidaysAndLeaveDays = [...holidayObject, ...leaveDayObject]
      // console.log({ margeHolidaysAndLeaveDays });
      // console.log({ leaveDayObject });

    
      holidayAndLeavedaysDateRange = margeHolidaysAndLeaveDays;

      // chek holiday and leave day then change type
      for (let i = 0; i < reportStringify.length; i += 1) {
        for (let j = 0; j < margeHolidaysAndLeaveDays.length; j += 1) {
          if (reportStringify[i].date_for_holiday === margeHolidaysAndLeaveDays[j].h_date) {
            reportStringify[i].type = margeHolidaysAndLeaveDays[j].type
            reportStringify[i].fixed_time = margeHolidaysAndLeaveDays[j].fixed_time

            break;
          } else if (reportStringify[i].date_for_holiday === margeHolidaysAndLeaveDays[j].l_date) {
            reportStringify[i].type = margeHolidaysAndLeaveDays[j].type
            reportStringify[i].fixed_time = margeHolidaysAndLeaveDays[j].fixed_time

            break;
          }
        }
      }

      // last seven days total report pore employee
      const employeeLastSevendaysReportTotal = await AttendanceModel.reportLastSevendaysTotalForEmployee(userId)
      // console.log({ reportStringify })
      //  console.log(holidaysArray, leaveDaysArray);

      const userReport = [...reportStringify]

      console.log({ userReport });

      res.render('pages/report', {
        userReport, avgStartTime, avgEndTime, weekHr, monthHr, employeeLastSevendaysReportTotal,
      });
    } catch (err) {
      console.log('====>Error form ReportController/ userReport', err);
      return err;
    }
  },
  // return data AJAX for date range input
  reportBetweenTwoDate: async (req, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      const getData = await AttendanceModel.anEmployeeReportBetweenTwoDate(
        userId, startDate, endDate,
      );
      const dataToJson = JSON.parse(JSON.stringify(getData))
      console.log({ dataToJson });
      console.log({ holidayAndLeavedaysDateRange });

      for (let i = 0; i < dataToJson.length; i += 1) {
        // eslint-disable-next-line no-undef
        for (let j = 0; j < holidayAndLeavedaysDateRange.length; j += 1) {
          if (dataToJson[i].date_for_holiday === holidayAndLeavedaysDateRange[j].h_date) {
            dataToJson[i].type = holidayAndLeavedaysDateRange[j].type
            dataToJson[i].fixed_time = holidayAndLeavedaysDateRange[j].fixed_time

            break;
          } else if (dataToJson[i].date_for_holiday === holidayAndLeavedaysDateRange[j].l_date) {
            dataToJson[i].type = holidayAndLeavedaysDateRange[j].type
            dataToJson[i].fixed_time = holidayAndLeavedaysDateRange[j].fixed_time

            break;
          }
        }
      }

      // console.log({ dataToJson });

      return res.json(dataToJson);
    } catch (err) {
      console.log('====>Error form ReportController/reportBetweenTwoDate', err);
      return err;
    }
  },

}

module.exports = ReportController;