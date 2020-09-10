const moment = require('moment-timezone');
const { extendMoment } = require('moment-range');

const momentRange = extendMoment(moment);

const getDateTimeObject = (dateTime, format) => {
  let formattedDateTime;
  let formattedDate;
  let formattedTime;
  let timezone;
  if (format === 'UNIX') {
    formattedDateTime = moment
      .unix(dateTime)
      .tz(process.env.EVENT_TIME_ZONE)
      .format();
    formattedDate = moment
      .unix(dateTime)
      .tz(process.env.EVENT_TIME_ZONE)
      .format('DD MMM YYYY');
    formattedTime = moment
      .unix(dateTime)
      .tz(process.env.EVENT_TIME_ZONE)
      .format('hh:mm A');
    timezone = moment
      .unix(dateTime)
      .tz(process.env.EVENT_TIME_ZONE)
      .format('z');
  } else {
    formattedDateTime = moment(dateTime)
      .tz(process.env.EVENT_TIME_ZONE)
      .format();
    formattedDate = moment(dateTime)
      .tz(process.env.EVENT_TIME_ZONE)
      .format('DD MMM YYYY');
    formattedTime = moment(dateTime)
      .tz(process.env.EVENT_TIME_ZONE)
      .format('hh:mm A');
    timezone = moment(dateTime).tz(process.env.EVENT_TIME_ZONE).format('z');
  }
  return {
    timestamp: formattedDateTime,
    formatted_date: formattedDate,
    formatted_time: formattedTime,
    timezone,
  };
};

const checkDateInRange = (dateTime, startDateTime, endDateTime) => {
  const timeInterval = `${startDateTime}/${endDateTime}`;
  const range = momentRange.range(timeInterval);
  let response;
  if (range.contains(dateTime)) {
    response = 'LIVE';
  } else if (dateTime.isAfter(endDateTime)) {
    response = 'FINISHED';
  } else if (dateTime.isBefore(startDateTime)) {
    response = 'NOT_STARTED';
  }
  return response;
};

module.exports = {
  getDateTimeObject,
  checkDateInRange,
};
