// canary checker for /canary/index.html
function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const dd = d ? d + 'd ' : '';
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return dd + hh + ':' + mm + ':' + ss;
}

async function check() {
  try {
    const res = await fetch('./canary.json', { cache: 'no-cache' });
    const data = await res.json();
    const last = new Date(data.last_update);
    const windowDays = Number(data.window_days || 14);
    const nextDue = new Date(last.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const alive = now <= nextDue;
    const daysLeft = Math.ceil((nextDue - now) / (24 * 60 * 60 * 1000));

    const el = document.getElementById('status');
    el.innerHTML =
      '<p><b>last update (utc):</b> ' + last.toISOString() + '</p>' +
      '<p><b>token:</b> <code>' + (data.token || '(missing)') + '</code></p>' +
      '<p><b>window:</b> ' + windowDays + ' days</p>' +
      '<p><b>next due by (utc):</b> ' + nextDue.toISOString() + '</p>' +
      '<p><b>status:</b> ' + (alive ? '\u2705 ok ' + daysLeft + ' day(s) remaining' : '\u274c overdue - please check on me') + '</p>';

    // overlay behavior
    const overlay = document.getElementById('expired-overlay');
    const msg = document.getElementById('expired-message');
    const timerEl = document.getElementById('expired-timer');

    if (data.expired_message_html) { msg.innerHTML = data.expired_message_html; }

    if (!alive) {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');

      const tick = function () {
        const elapsed = new Date() - nextDue;
        timerEl.textContent = 'expired ' + fmtDuration(elapsed) + ' ago';
      };
      tick();
      const interval = setInterval(tick, 1000);

      var close = document.getElementById('dismiss-overlay');
      if (close) {
        close.addEventListener('click', function () {
          overlay.classList.remove('show');
          overlay.setAttribute('aria-hidden', 'true');
          clearInterval(interval);
        }, { once: true });
      }

      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          overlay.classList.remove('show');
          overlay.setAttribute('aria-hidden', 'true');
          clearInterval(interval);
        }
      }, { once: true });
    }
  } catch (e) {
    document.getElementById('status').textContent = 'could not read canary.json';
  }
}
check();
