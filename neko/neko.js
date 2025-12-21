/*
  oneko/neko
*/
(function () {
  var el = document.createElement("div");
  var scrollY = window.scrollY || 0;

  // Position will be computed at init time
  var posX = 0;
  var posY = 0;

  // Helpers to choose anchor points
  function isBlogPostPage() {
    if (document.querySelector('.blog-title') || document.querySelector('.blog-content')) return true;
    var p = (location.pathname || '').toLowerCase();
    return p.indexOf('/blog/') === 0 && !/\/(index\.html?)?$/.test(p);
  }

  // Generic pages: place to the left of the top main header (h1), or near navbar/header fallback
  function getGenericAnchor() {
    var h = document.querySelector('main h1, h1');
    if (h) {
      var hr = h.getBoundingClientRect();
      var leftX = hr.left - 24;
      var x = leftX >= 16 ? leftX : (hr.right + 18);
      var y = hr.top + (hr.height / 2);
      x = Math.min(Math.max(16, x), window.innerWidth - 16);
      y = Math.min(Math.max(16, y), window.innerHeight - 16);
      return { x: x, y: y };
    }
    // Fallback near navbar/header or centered top
    var nav = document.querySelector('#navbar, .navbar, header, [role="banner"], #header');
    if (nav) {
      var nr = nav.getBoundingClientRect();
      var x2 = nr.left - 24;
      if (x2 < 16) x2 = (nr.right + 18);
      var y2 = nr.top + (nr.height / 2);
      x2 = Math.min(Math.max(16, x2), window.innerWidth - 16);
      y2 = Math.min(Math.max(16, y2), window.innerHeight - 16);
      return { x: x2, y: y2 };
    }
    return { x: Math.floor(window.innerWidth / 2), y: 24 };
  }

  // Blog post pages: sleep to the side of the content, out of the body paragraph area
  function getPostAnchor() {
    var target = document.querySelector('.blog-content, .blog-title, main');
    var r = target ? target.getBoundingClientRect() : { left: 0, right: window.innerWidth, top: 0, bottom: 0, width: window.innerWidth, height: 0 };
    var candidateLeft = r.left - 28;
    var candidateRight = r.right + 18;
    var x = candidateLeft >= 16 ? candidateLeft : (candidateRight <= (window.innerWidth - 16) ? candidateRight : 16);
    var y = r.top + Math.min(64, (r.height || 0) / 2 || 32);
    x = Math.min(Math.max(16, x), window.innerWidth - 16);
    y = Math.min(Math.max(16, y), window.innerHeight - 16);
    return { x: x, y: y };
  }

  var mouseX = 0;
  var mouseY = 0;

  var sleeping = false;
  var idleAnim = "sleeping";
  var idleFrame = 0;
  var justAwake = false;

  var frameCount = 0;
  var alertTicks = 0;
  var speed = 10;

  var sprites = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
    scratchWallN: [[0, 0], [0, -1]],
    scratchWallS: [[-7, -1], [-6, -2]],
    scratchWallE: [[-2, -2], [-2, -3]],
    scratchWallW: [[-4, 0], [-4, -1]],
    tired: [[-3, -2]],
    sleeping: [[-2, 0], [-2, -1]],
    N: [[-1, -2], [-1, -3]],
    NE: [[0, -2], [0, -3]],
    E: [[-3, 0], [-3, -1]],
    SE: [[-5, -1], [-5, -2]],
    S: [[-6, -3], [-7, -2]],
    SW: [[-5, -3], [-6, -1]],
    W: [[-4, -2], [-4, -3]],
    NW: [[-1, 0], [-1, -1]]
  };

  function setSprite(name, frame) {
    var s = sprites[name][frame % sprites[name].length];
    el.style.backgroundPosition = (s[0] * 32) + "px " + (s[1] * 32) + "px";
  }

  function resetIdle() {
    idleAnim = null;
    idleFrame = 0;
  }

  function idle() {
    alertTicks += 1;
    if (alertTicks > 10 && Math.floor(Math.random() * 200) === 0 && idleAnim == null) {
      var choices = ["sleeping", "scratchSelf"];
      if (posX < 32) choices.push("scratchWallW");
      if (posY < 32) choices.push("scratchWallN");
      if (posX > window.innerWidth - 32) choices.push("scratchWallE");
      if (posY > window.innerHeight - 32) choices.push("scratchWallS");
      idleAnim = choices[Math.floor(Math.random() * choices.length)];
    }

    switch (idleAnim) {
      case "sleeping":
        if (idleFrame < 8 && !sleeping) { setSprite("tired", 0); break; }
        setSprite("sleeping", Math.floor(idleFrame / 4));
        if (idleFrame > 192 && !sleeping) resetIdle();
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnim, idleFrame);
        if (idleFrame > 9) resetIdle();
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleFrame += 1;
  }

  function frame() {
    frameCount += 1;
    var dx = posX - mouseX;
    var dy = posY - mouseY;
    var dist = Math.hypot(dx, dy);

    if (!justAwake && (dist < speed || dist < 48 || sleeping)) {
      idle();
      return;
    }

    idleAnim = null;
    idleFrame = 0;

    if (alertTicks > 1) {
      setSprite("alert", 0);
      alertTicks = Math.min(alertTicks, 7) - 1;
      return;
    }

    justAwake = false;

    var dir = "";
    dir += dy / dist > 0.5 ? "N" : "";
    dir += dy / dist < -0.5 ? "S" : "";
    dir += dx / dist > 0.5 ? "W" : "";
    dir += dx / dist < -0.5 ? "E" : "";
    setSprite(dir || "idle", frameCount);

    posX -= (dx / dist) * speed;
    posY -= (dy / dist) * speed;

    posX = Math.min(Math.max(16, posX), window.innerWidth - 16);
    posY = Math.min(Math.max(16, posY), window.innerHeight - 16);

    el.style.left = (posX - 16) + "px";
    el.style.top = (posY - 16) + "px";
  }

  function init() {
    el.id = "oneko";
    el.ariaHidden = "true";
    el.style.width = "32px";
    el.style.height = "32px";
    el.style.position = "fixed";
    // Resolve sprite relative to this script's URL
    var scriptEl = document.currentScript || (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    var base = new URL("./", scriptEl.src).toString();
    el.style.backgroundImage = "url('" + base + "oneko.gif')";
    el.style.imageRendering = "pixelated";
    // Decide initial position: left of the top main header by default; on blog posts, to the side of content
    var isPost = isBlogPostPage();
    if (isPost) sleeping = true;
    var r = isPost ? getPostAnchor() : getGenericAnchor();
    posX = r.x;
    posY = r.y;
    el.style.left = (posX - 16) + "px";
    el.style.top = (posY - 16) + "px";
    el.style.zIndex = String(Number.MAX_VALUE);
    el.style.cursor = "pointer";
    el.style.pointerEvents = "none";

    el.onclick = function () {
      sleeping = false;
      justAwake = true;
      idleAnim = null;
      alertTicks = 999;
      el.style.left = (posX - 16) + "px";
      el.style.top = (posY - 16) + "px";
      el.style.pointerEvents = "none";
      el.style.cursor = "pointer";
    };

    document.body.appendChild(el);

    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    document.addEventListener("scroll", function () {
      scrollY = window.scrollY || 0;
    });

    window.addEventListener("resize", function () {
      if (sleeping) {
        var isPost = isBlogPostPage();
        var r = isPost ? getPostAnchor() : getGenericAnchor();
        posX = r.x;
        posY = r.y;
        el.style.left = (posX - 16) + "px";
        el.style.top = (posY - 16) + "px";
      }
    });

    var last = 0;
    function tick(ts) {
      if (!last) last = ts;
      if (ts - last > 100) { last = ts; frame(); }
      window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  } catch (e) { try { document.body.removeChild(el); } catch (_) {} }
})();
