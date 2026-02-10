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

// recent post loader
(async function () {
  try {
    var res = await fetch('/blog/posts.json', { cache: 'no-cache' });
    var data = await res.json();
    var posts = (data.posts || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var p = posts[0];
    var el = document.getElementById('recent');
    if (!p) {
      el.innerHTML = '<p class="small"><b>latest:</b> nothing posted yet.</p>';
      return;
    }
    el.innerHTML =
      '<p class="small" style="margin:0;">' +
        '<b>latest:</b> <a href="/blog/' + p.slug + '.html">' + p.title + '</a> - ' + p.date +
      '</p>' +
      (p.summary ? '<p class="small" style="margin-top:8px;">' + p.summary + '</p>' : '');
  } catch (e) {
    document.getElementById('recent').innerHTML = '<p class="small"><b>latest:</b> could not load posts.</p>';
  }
})();
