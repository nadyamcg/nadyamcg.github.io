// blog post loader for /blog/index.html
async function loadPosts() {
  try {
    const res = await fetch('./posts.json', { cache: 'no-cache' });
    const data = await res.json();
    const list = document.createElement('ul');
    list.className = 'list';
    (data.posts || []).sort((a, b) => (a.date < b.date ? 1 : -1)).forEach(p => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = './' + p.slug + '.html';
      a.textContent = p.title + ' - ' + p.date;
      li.appendChild(a);
      if (p.summary) {
        const s = document.createElement('div');
        s.className = 'small';
        s.textContent = p.summary;
        li.appendChild(s);
      }
      list.appendChild(li);
    });
    const target = document.getElementById('posts');
    target.innerHTML = '';
    target.appendChild(list);
  } catch (e) {
    document.getElementById('posts').textContent = 'could not load posts.';
  }
}
loadPosts();
