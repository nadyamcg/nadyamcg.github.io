// homepage scripts for /index.html

// ssh key copy
function copySshKey() {
  var keyElement = document.getElementById('ssh-key');
  var keyText = keyElement.textContent.trim();
  var btn = document.querySelector('.copy-btn .btn-text');

  navigator.clipboard.writeText(keyText).then(function () {
    var originalText = btn.textContent;
    btn.textContent = 'copied';
    setTimeout(function () {
      btn.textContent = originalText;
    }, 2000);
  }).catch(function (err) {
    console.error('failed to copy: ', err);
    btn.textContent = 'failed';
    setTimeout(function () {
      btn.textContent = 'copy key';
    }, 2000);
  });
}

// select entire key on click
document.getElementById('ssh-key').addEventListener('click', function (e) {
  if (window.getSelection().toString() === '') {
    var range = document.createRange();
    range.selectNodeContents(this);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
});

// copy button listener
document.querySelector('.copy-btn').addEventListener('click', copySshKey);

// recent post + project loader
(async function () {
  try {
    var blogRes = await fetch('/blog/posts.json', { cache: 'no-cache' });
    var blogData = await blogRes.json();
    var posts = (blogData.posts || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var latestPost = posts[0];

    var projectRes = await fetch('/web-projects/projects.json', { cache: 'no-cache' });
    var projectData = await projectRes.json();
    var projects = (projectData.projects || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var latestProject = projects[0];

    var el = document.getElementById('recent');

    if (!latestPost && !latestProject) {
      el.innerHTML = '<p class="latest-header">latest</p><p class="small">nothing here yet.</p>';
      return;
    }

    var html = '<p class="latest-header">latest</p>';

    if (latestPost) {
      html += '<div class="latest-entry-wrapper">';
      html += '<span class="latest-entry-label">blog</span>';
      html += '<a href="/blog/' + latestPost.slug + '.html" class="latest-entry">';
      html += '<div class="latest-entry-header">';
      html += '<span class="latest-entry-title">' + latestPost.title + '</span>';
      html += '<span class="latest-entry-date">' + latestPost.date + '</span>';
      html += '</div>';
      if (latestPost.summary) {
        html += '<p class="latest-entry-summary">' + latestPost.summary + '</p>';
      }
      html += '</a>';
      html += '</div>';
    }

    if (latestProject) {
      html += '<div class="latest-entry-wrapper">';
      html += '<span class="latest-entry-label">project</span>';
      html += '<a href="/web-projects/' + latestProject.slug + '.html" class="latest-entry">';
      html += '<div class="latest-entry-header">';
      html += '<span class="latest-entry-title">' + latestProject.title + '</span>';
      html += '<span class="latest-entry-date">' + latestProject.date + '</span>';
      html += '</div>';
      if (latestProject.summary) {
        html += '<p class="latest-entry-summary">' + latestProject.summary + '</p>';
      }
      html += '</a>';
      html += '</div>';
    }

    el.innerHTML = html;
  } catch (e) {
    document.getElementById('recent').innerHTML = '<p class="latest-header">latest</p><p class="small">could not load.</p>';
  }
})();

// canary status checker
(async function () {
  try {
    var res = await fetch('/canary/canary.json', { cache: 'no-cache' });
    var data = await res.json();
    var last = new Date(data.last_update);
    var windowDays = Number(data.window_days || 14);
    var nextDue = new Date(last.getTime() + windowDays * 24 * 60 * 60 * 1000);
    var now = new Date();
    var alive = now <= nextDue;

    var statusEl = document.getElementById('canary-status');
    var textEl = document.getElementById('canary-status-text');

    if (alive) {
      statusEl.classList.add('status-pass');
      textEl.textContent = 'pass ✓';
    } else {
      statusEl.classList.add('status-overdue');
      textEl.textContent = 'overdue ✗';
    }
  } catch (e) {
    document.getElementById('canary-status-text').textContent = 'error';
  }
})();
