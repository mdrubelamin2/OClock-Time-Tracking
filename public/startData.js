/* eslint-disable max-len */
/* eslint-disable no-undef */
/* eslint-disable no-use-before-define */
const startData = document.querySelector('#startData')
const startButton = document.querySelector('#start-button')
const startBtn = document.querySelector('#start-btn')
const endBtn = document.querySelector('#end-btn');

let intervalId;

(async () => {
  const response = await fetch('/get-start-data')
  const data = await response.json()
  startRuntTime = data
  if (startRuntTime != 0) {
    const startNow = startRuntTime
    startCounting(startNow)
    startBtn.style.display = 'none'
    endBtn.style.display = 'inline'
    console.log(startRuntTime)
    const todayStart = document.getElementById('todayStart')
    if (todayStart.innerText == '00 : 00') {
      const startRunTime = new Date(data)
      todayStart.innerText = startRunTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
    }
  }
})()

startData.addEventListener('submit', async (e) => {
  e.preventDefault()
  const projectName = document.querySelector('#projectName')
  const projectDetails = document.querySelector('#projectDetails')
  const modal = document.querySelector('#myModal')
  const object = { projectId: projectName.value, workDetails: projectDetails.value }
  await fetch('/attendance-start', {
    method: 'POST',
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(object),
  })
  modal.style.display = 'none';
  startBtn.style.display = 'none'
  endBtn.style.display = 'inline'
  const response = await fetch('/get-start-data')
  const data = await response.json()
  startCounting(data)
  const todayStart = document.getElementById('todayStart')
  if (todayStart.innerText == '00 : 00') {
    todayStart.innerText = currentTime()
  }
})

// End button click event function
endBtn.addEventListener('click', async (event) => {
  event.preventDefault()
  // Stop counting
  clearInterval(intervalId)
  document.getElementById('elapsedTime').textContent = '00:00:00'
  // End button to Api call
  const response = await fetch('/attendance-end', {
    method: 'POST',
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  })
  const data = await response.json()
  startBtn.style.display = 'inline'
  endBtn.style.display = 'none'
  // // Destructuring data
  const {
    getTodayData, start, end, breakTime, todayTotalData,
  } = data
  const { todayTotal } = todayTotalData
  const totalWorkTime = timeToHour(todayTotal)
  // Last index data
  lastData = getTodayData[getTodayData.length - 1]
  console.log(start)
  // Update today history table
  setTodayReport(lastData.project_name, lastData.work_details, lastData.start, lastData.end, lastData.total)
  setTodayDetails(start, end, totalWorkTime, breakTime)
})
function setTodayDetails(start, end, total, breaktime) {
  const todayStart = document.getElementById('todayStart')
  const todayEnd = document.getElementById('todayEnd')
  const todayTotal = document.getElementById('todayTotal')
  const breakTime = document.getElementById('breakTime')
  todayStart.innerText = start
  todayEnd.innerText = end
  todayTotal.innerText = total
  breakTime.innerText = breaktime
}

function setTodayReport(project, details, start, end, total) {
  const todayReport = document.getElementById('todayReport')
  const data = `<tr>
  <td class="project-name">${project}</td>
  <td class="project-work">${details}</td>
  <td>${start}</td>
  <td>${end}</td>
  <td>${total}</td>
  <td class="user-more">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="15"></rect>
            <circle cx="10" cy="20" r="2" fill="#4A4A4A"></circle>
            <circle cx="20" cy="20" r="2" fill="#4A4A4A"></circle>
            <circle cx="30" cy="20" r="2" fill="#4A4A4A"></circle>
          </svg>        </td> 
  </tr>`
  todayReport.insertAdjacentHTML('afterend', data)
}

// Current time to start time difference function
function startCounting(data) {
  function seconds_to_days_hours_mins_secs_str(seconds) {
    const hours = Math.floor(seconds / (60 * 60));
    seconds -= hours * (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    return `${hours < 10 ? `0${hours}` : hours}:${minutes < 10 ? `0${minutes}` : minutes
    }:${seconds < 10 ? `0${seconds}` : seconds}`;
  }
  function increment() {
    const elapsedTime = new Date() - new Date(data);
    document.getElementById('elapsedTime').textContent = seconds_to_days_hours_mins_secs_str(
      Math.round(elapsedTime / 1000).toString(),
    );
  }
  // get Set interval ID
  const ID = setInterval(increment, 1000)
  // interval ID
  intervalId = ID
}
function timeToHour(time) {
  if (time == null) {
    return '00hr 00m'
  }
  const s = time.split(':')
  const hour = `${s[0]}hr`
  const minutes = `${s[1]}m`
  const result = `${hour} ${minutes}`
  return result
}

function currentTime() {
  const time = new Date();
  const startTime = time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
  return startTime
}