// Converts <time datetime="..." data-f="FORMAT"> elements to the visitor's local timezone.
// Format codes mirror Discord's timestamp syntax:
//   t = short time        (9:01 AM)
//   T = long time         (9:01:00 AM)
//   d = short date        (11/28/2018)
//   D = long date         (November 28, 2018)
//   f = short date/time   (November 28, 2018 9:01 AM)  [default]
//   F = long date/time    (Wednesday, November 28, 2018 9:01 AM)
//   R = relative          (3 days ago)

(function () {
  var FORMAT_OPTIONS = {
    t: { hour: 'numeric', minute: '2-digit' },
    T: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
    d: { year: 'numeric', month: '2-digit', day: '2-digit' },
    D: { year: 'numeric', month: 'long', day: 'numeric' },
    f: { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' },
    F: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  };

  var RELATIVE_UNITS = [
    { unit: 'year',   ms: 365.25 * 24 * 60 * 60 * 1000 },
    { unit: 'month',  ms: 30.44  * 24 * 60 * 60 * 1000 },
    { unit: 'week',   ms: 7      * 24 * 60 * 60 * 1000 },
    { unit: 'day',    ms:          24 * 60 * 60 * 1000 },
    { unit: 'hour',   ms:               60 * 60 * 1000 },
    { unit: 'minute', ms:                    60 * 1000 },
    { unit: 'second', ms:                         1000 }
  ];

  function formatRelative(date) {
    var diff = date.getTime() - Date.now();
    var rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    for (var i = 0; i < RELATIVE_UNITS.length; i++) {
      var u = RELATIVE_UNITS[i];
      if (Math.abs(diff) >= u.ms || u.unit === 'second') {
        return rtf.format(Math.round(diff / u.ms), u.unit);
      }
    }
  }

  function convert(el) {
    var dt = el.getAttribute('datetime');
    if (!dt) return;
    // Support both ISO strings and bare Unix timestamps
    var date = /^\d+$/.test(dt) ? new Date(+dt * 1000) : new Date(dt);
    if (isNaN(date)) return;

    var fmt = el.getAttribute('data-f') || 'f';

    if (fmt === 'R') {
      el.textContent = formatRelative(date);
      return;
    }

    var opts = FORMAT_OPTIONS[fmt];
    if (!opts) return;
    el.textContent = new Intl.DateTimeFormat(undefined, opts).format(date);
  }

  document.querySelectorAll('time[data-f]').forEach(convert);
})();
