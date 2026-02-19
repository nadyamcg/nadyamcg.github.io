// project loader for /web-projects/index.html
async function loadProjects() {
  try {
    const res = await fetch('./projects.json', { cache: 'no-cache' });
    const data = await res.json();
    const list = document.createElement('ul');
    list.className = 'list';
    (data.projects || []).sort((a, b) => (a.date < b.date ? 1 : -1)).forEach(p => {
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
    const target = document.getElementById('projects');
    target.innerHTML = '';
    target.appendChild(list);
  } catch (e) {
    document.getElementById('projects').textContent = 'could not load projects.';
  }
}
loadProjects();
