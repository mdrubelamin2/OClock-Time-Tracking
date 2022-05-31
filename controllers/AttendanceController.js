/* eslint-disable max-len */
const AttendanceModel = require('../models/AttendanceModel');
const OptionsModel = require('../models/OptionsModel');
const { stringToNumber, time12HrTo24Hr } = require('../utilities/formater')

const UserModel = require('../models/UserModel');
// const { timeToHour } = require('../utilities/formater')

const convertTime = (timeStr) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') {
    hours = '00';
  }
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  return `${hours}:${minutes}`;
};

const AttendanceController = {
  // Current start time value store in database
  attendanceStart: async (req, res) => {
    const { projectId, workDetails } = req.body
    try {
      const [{ offDayValues }] = await OptionsModel.getOffDaysValue();
      const { id } = req.user
      const [{ inTime }] = await AttendanceModel.getInTime()
      const [{ outTime }] = await AttendanceModel.getOutTime()
      const isId = await AttendanceModel.getCurrentDateUserId(id);
      const isUserId = isId
      const insertedAttendanceStart = await AttendanceModel.setAttendanceStart(id, inTime, outTime, projectId, workDetails)
      //
      if (isUserId === undefined) {
        await AttendanceModel.insertLog(stringToNumber(offDayValues), id)
      }
      const [result] = await AttendanceModel.getRunStartData(id)
      const { start } = result
      if (!insertedAttendanceStart) {
        return res.send('Error')
      }
      return res.json(start)
    } catch (err) {
      console.log('====>Error form AttendanceController/userAttendance', err);
      return err;
    }
  },
  // Current end time value store in database
  attendanceEnd: async (req, res) => {
    try {
      const { id } = req.user
      const isId = await AttendanceModel.getCurrentDateUserId(id);
      const isUserId = isId
      const [{ start }] = await AttendanceModel.todayStartTime(id)

      await AttendanceModel.setAttendanceEnd(id)
      // count today total work time and store in database
      const isWorkTime = await AttendanceModel.getCurrentDateWorkTime(id)
      const { totalWorkTime } = JSON.parse(JSON.stringify(isWorkTime))
      if (isUserId) {
        await AttendanceModel.updateLog(id)
        await AttendanceModel.updateLogTotalWorkTime(id, totalWorkTime)
      }

      const getTodayData = await AttendanceModel.getToday(id)
      const [todayTotalData] = await AttendanceModel.todayTotal(id)
      const [weekTotalData] = await AttendanceModel.weekTotal(id)
      const getWeekData = await AttendanceModel.getWeekHistory(id)
      const [{ end }] = await AttendanceModel.currentEndTime()
      const breakTime = getTodayData.length
      console.log('sss', start)
      console.log('today total', todayTotalData)

      return res.json({
        start, end, breakTime, getTodayData, todayTotalData, weekTotalData, getWeekData,
      })
    } catch (err) {
      console.log('====>Error form AttendanceController/userAttendance', err);
      return err;
    }
  },
  updateEndTime: async (req, res) => {
    try {
      console.log('req.body', req.body);

      const { userId, date, endTime } = req.body

      const covertEndTime = convertTime(endTime)

      const timeStamp = JSON.parse(JSON.stringify(`${date} ${covertEndTime}`))
      await AttendanceModel.updateEndTime(userId, timeStamp)
      await AttendanceModel.updateEndTimeForLog(userId, timeStamp)

      const isWorkTime = await AttendanceModel.getUpdateEndTimeWorkTime(userId, date)
      const { totalWorkTime } = JSON.parse(JSON.stringify(isWorkTime))
      console.log('totalWorkTime', totalWorkTime)
      await AttendanceModel.setLogTotalWorkTimeAdmin(userId, totalWorkTime, date)
      res.redirect('/home')
    } catch (err) {
      console.log('====>Error form AttendanceController', err);
    }
  },

  updateStartTime: async (req, res) => {
    try {
      console.log('updateStartTime', req.body)
      const { userId, startTime, date } = req.body

      const { aId } = await AttendanceModel.getMinStartTime(userId)
      const { logUpdateId } = await AttendanceModel.getUpdateLogStartTimeId(userId)
      console.log({ logUpdateId });
      const covertStartTime = convertTime(startTime)
      // const [{ start }] = getMinStartTime
      console.log('getMinStartTime', aId);

      const timeStamp = JSON.parse(JSON.stringify(`${date} ${covertStartTime}`))
      await AttendanceModel.setStartTime(aId, timeStamp)
      await AttendanceModel.setStartTimeForLog(logUpdateId, timeStamp)

      res.status(200).json('success')
    } catch (err) {
      console.log('====>Error form AttendanceController', err);
    }
  },
  attendanceEntry: async (req, res) => {
    const { fingerId, time } = req.body
    console.log({ fingerId, time });

    const timeStamp = JSON.parse(JSON.stringify(` ${time}`))
    const user = await UserModel.userFindByFingerId(fingerId)
    const [{ offDayValues }] = await OptionsModel.getOffDaysValue();
    try {
      if (user.length > 0) {
        const fingeIdArray = []
        user.map((u) => {
          const { fingerID } = u
          const fingeId = fingerID.split(',')
          fingeIdArray.push(fingeId)
        })
        const index = fingeIdArray.findIndex((arr) => arr.includes(fingerId))
        const person = user[index]
        const userID = person.id

        const isId = await AttendanceModel.getCurrentDateUserIdInAttendance(userID);
        const [{ inTime }] = await AttendanceModel.getInTime()
        const [{ outTime }] = await AttendanceModel.getOutTime()

        // 1st condition for check user is present or not
        const currentDateTime = await AttendanceModel.getCurrentDateTime()
        console.log({ currentDateTime, timeStamp });
        if (isId === undefined || isId === null) {
          // const { endTimeIsNull } = await AttendanceModel.isAttendanceEndTimeNull(userID)
          // console.log({ endTimeIsNull });

          // if (endTimeIsNull === 0) {
          await AttendanceModel.setAttendanceStartForAPI(userID, inTime, outTime, 0, 'Entry', timeStamp || currentDateTime)
          // await AttendanceModel.setManualAttendanceStart(userID, timeStamp || currentDateTime)

          const isIdInLog = await AttendanceModel.getCurrentDateUserId(userID);
          if (isIdInLog === undefined) {
            await AttendanceModel.insertLog(stringToNumber(offDayValues), userID)
          }
          res.json('success')

          // }
        } else if (isId !== undefined || isId !== null) {
          const { endTimeIsNull } = await AttendanceModel.isAttendanceEndTimeNull(userID)
          console.log({ endTimeIsNull });

          if (endTimeIsNull === 1) {
            await AttendanceModel.setManualAttendanceEnd(userID, timeStamp || currentDateTime)

            const isWorkTime = await AttendanceModel.getCurrentDateWorkTime(userID)
            const { totalWorkTime } = JSON.parse(JSON.stringify(isWorkTime))

            await AttendanceModel.updateLogEndTimeOrCurTime(timeStamp || currentDateTime, userID)
            await AttendanceModel.updateLogTotalWorkTime(userID, totalWorkTime)
            res.json('success')
          } else if (endTimeIsNull === 0) {
            await AttendanceModel.setAttendanceStartForAPI(userID, inTime, outTime, 0, 'Entry', timeStamp || currentDateTime)

            // await AttendanceModel.setManualAttendanceNotStart(userID, maxId, timeStamp || currentDateTime)

            // const isWorkTime = await AttendanceModel.getCurrentDateWorkTime(userID)
            // const { totalWorkTime } = JSON.parse(JSON.stringify(isWorkTime))

            // await AttendanceModel.updateLogEndTimeOrCurTime(timeStamp || currentDateTime, userID)
            // await AttendanceModel.updateLogTotalWorkTime(userID, totalWorkTime)
            res.json('success')
          }
        }
      } else {
        res.json('User Not Found')
      }
    } catch (error) {
      console.log(error)
    }
  },

  // attendance for manual entry

  checkIsExistAttendance: async (req, res) => {
    try {
      const { userId, date } = req.query
      console.log({ userId, date });

      const isExist = await AttendanceModel.isExistCurrentDateUserId(date, userId)

      if (isExist !== null) {
        return res.json(isExist)
      }
    } catch (err) {
      console.log('====>Error form/ checkIsExistAttendance controllers', err);
    }
  },

  manualAttendance: async (req, res) => {
    try {
      // default values
      const [{ offDayValues }] = await OptionsModel.getOffDaysValue();
      const [{ inTime }] = await AttendanceModel.getInTime()
      const [{ outTime }] = await AttendanceModel.getOutTime()

      const {
        userId, date, startTime, endTime, getInTime, getOutTime,
      } = req.body

      const isExist = await AttendanceModel.isExistCurrentDateUserId(date, userId);
      if (isExist !== null) {
        return res.json('Already Exist')
      }

      const timeStampForStart = JSON.parse(JSON.stringify(`${date} ${time12HrTo24Hr(startTime)}`))
      const timeStampForEnd = JSON.parse(JSON.stringify(`${date} ${time12HrTo24Hr(endTime)}`))

      // for manual entry
      if (endTime === undefined || endTime === '') {
        await AttendanceModel.setAttendanceStart(userId, time12HrTo24Hr(getInTime) || inTime, time12HrTo24Hr(getOutTime) || outTime, 0, 'Manual Entry')

        await AttendanceModel.setManualAttendanceStart(userId, timeStampForStart)

        const isUserId = await AttendanceModel.getCurrentDateUserId(userId);

        if (isUserId === undefined) {
          await AttendanceModel.insertLog(stringToNumber(offDayValues), userId)
        }

        res.json('success')
      } else if (startTime === undefined || startTime === '') { // for manual exit
        await AttendanceModel.setAttendanceEnd(userId)
        await AttendanceModel.setManualAttendanceEnd(userId, timeStampForEnd)

        const isUserId = await AttendanceModel.getCurrentDateUserId(userId);

        const isWorkTime = await AttendanceModel.getCurrentDateWorkTime(userId)
        const { totalWorkTime } = JSON.parse(JSON.stringify(isWorkTime))
        if (isUserId) {
          await AttendanceModel.updateLog(userId)
          await AttendanceModel.updateLogTotalWorkTime(userId, totalWorkTime)
        }

        res.json('success')
      } else if (startTime !== undefined && endTime !== undefined) { // for manual start and end
        await AttendanceModel.setAttendanceStart(userId, time12HrTo24Hr(getInTime) || inTime, time12HrTo24Hr(getOutTime) || outTime, 0, 'Manual Entry')

        await AttendanceModel.setManualAttendanceStartAndEnd(userId, timeStampForStart, timeStampForEnd)

        const isUserId = await AttendanceModel.getCurrentDateUserId(userId);

        if (isUserId === undefined) {
          const isWorkTime = await AttendanceModel.getCurrentDateWorkTime(userId)
          const { totalWorkTime } = JSON.parse(JSON.stringify(isWorkTime))
          await AttendanceModel.insertLog(stringToNumber(offDayValues), userId)
          await AttendanceModel.updateLogForManualInput(userId, timeStampForEnd, totalWorkTime)
        }

        res.json('success')
      }
    } catch (err) {
      console.log('====>Error form manualAttendance/ controllers', err);
    }
  },

}

module.exports = AttendanceController
