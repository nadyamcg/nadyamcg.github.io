// animated cursor with integrated motion blur

class AnimatedCursor {
  constructor() {
    this.root = document.body
    this.cursorSvg = null
    this.cursor1 = null
    this.cursor2Group = null
    this.cursor2Frames = []
    this.currentFrame = 0
    this.animationInterval = null
    this.trueCursorMarker = null
    this.filter = null
    this.isHovering = false
    this.hasMotionBlur = true

    this.position = {
      distanceX: 0,
      distanceY: 0,
      pointerX: 0,
      pointerY: 0,
    }
    this.previousPointerX = 0
    this.previousPointerY = 0
    this.angle = 0
    this.previousAngle = 0
    this.degrees = 57.296
    this.moving = false

    this.createCursor()
    this.init()
  }

  createCursor() {
    // create svg container with motion blur filter
    // note: future cursor svgs should use consistent pixel grids to avoid scaling misalignment
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('custom-cursor')
    svg.setAttribute('width', '30')
    svg.setAttribute('height', '30')
    svg.setAttribute('viewBox', '0 0 30 30')
    svg.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 30px;
      height: 30px;
      z-index: 2147483647;
      pointer-events: none;
      user-select: none;
      opacity: 0;
      transition: opacity 200ms;
      overflow: visible;
    `

    // motion blur filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    filter.setAttribute('id', 'cursor-motionblur')
    filter.setAttribute('x', '-200%')
    filter.setAttribute('y', '-200%')
    filter.setAttribute('width', '500%')
    filter.setAttribute('height', '500%')

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
    blur.classList.add('motion-blur-filter')
    blur.setAttribute('stdDeviation', '0, 0')
    filter.appendChild(blur)

    defs.appendChild(filter)
    svg.appendChild(defs)

    // true cursor marker
    const trueCursorMarker = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    trueCursorMarker.setAttribute('x', '0')
    trueCursorMarker.setAttribute('y', '0')
    trueCursorMarker.setAttribute('width', '2')
    trueCursorMarker.setAttribute('height', '2')
    trueCursorMarker.setAttribute('fill', '#00d1fb')
    trueCursorMarker.setAttribute('opacity', '1')
    trueCursorMarker.classList.add('true-cursor-marker')
    svg.appendChild(trueCursorMarker)

    // cursor graphics group with motion blur
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('filter', 'url(#cursor-motionblur)')

    // cursor1 - arrow pointer (default state)
    // scaled from 150x150 to 30x30 coordinate system (0.2 scale = perfect 2x2 pixel alignment)
    const cursor1 = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    cursor1.classList.add('cursor-state', 'cursor1')
    cursor1.setAttribute('transform', 'scale(0.2)')
    cursor1.setAttribute('shape-rendering', 'crispEdges')
    cursor1.innerHTML = `
      <path d="M0 10V0h10v10z" fill="#8899ff"/>
      <path fill-rule="evenodd" d="M60 150v-30H50V90H40V70H30V60H20V40H10V10h30v10h20v10h10v10h20v10h30v10h30v30h-10v10h-10v10h-10v10h-10v10h-10v10H90v10zM30 40h10V30H30zm30 10H50v10h10zm20 10V50H70v10zM70 70V60H60v10zm20 0V60H80v10zm20 0V60h-10v10zm-50 0H50v10h10zm20 10V70H70v10zm20 0V70H90v10zm20 0V70h-10v10zm20 0V70h-10v10zm-70 0H60v10h10zm20 10V80H80v10zm20 0V80h-10v10zm20 0V80h-10v10zm-50 10V90H70v10zm20 0V90H90v10zm20 0V90h-10v10zm-50 0H60v10h10zm20 10v-10H80v10zm20 0v-10h-10v10zm-30 0H70v10h10zm20 10v-10H90v10zm-10 10v-10H80v10zm-20 0v10h10v-10z" fill="#8899ff"/>
      <path d="M80 120v-10h10v10z" fill="#8899ff"/>
      <path d="M90 110v-10h10v10z" fill="#8899ff"/>
      <path d="M70 110v-10h10v10z" fill="#8899ff"/>
      <path d="M100 100V90h10v10z" fill="#8899ff"/>
      <path d="M80 100V90h10v10z" fill="#8899ff"/>
      <path d="M110 90V80h10v10z" fill="#8899ff"/>
      <path d="M90 90V80h10v10z" fill="#8899ff"/>
      <path d="M70 90V80h10v10z" fill="#8899ff"/>
      <path d="M100 80V70h10v10z" fill="#8899ff"/>
      <path d="M80 80V70h10v10z" fill="#8899ff"/>
      <path d="M60 80V70h10v10z" fill="#8899ff"/>
      <path d="M70 70V60h10v10z" fill="#8899ff"/>
    `

    // cursor2 frames - shrinking square animation (hover state)
    // scaled from 512x512 to 30x30 coordinate system
    const cursor2Group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    cursor2Group.classList.add('cursor-state', 'cursor2-group')
    cursor2Group.style.display = 'none'
    cursor2Group.setAttribute('transform', 'scale(0.05859375)')
    cursor2Group.setAttribute('shape-rendering', 'crispEdges')

    const cursor2_1 = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    cursor2_1.classList.add('cursor2-frame')
    cursor2_1.setAttribute('data-frame', '1')
    cursor2_1.innerHTML = `
      <path d="M171 43V0h170v43zM85 85V43h86v42zm342 0h-86V43h86zM43 171V85h42v86zm426 0h-42V85h42zM43 341H0V171h43zm426 0V171h43v170zM85 427H43v-86h42zm342 0v-86h42v86zm-256 42H85v-42h86zm170 0v-42h86v42zm0 0v43H171v-43z" fill="#8899ff"/>
    `

    const cursor2_2 = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    cursor2_2.classList.add('cursor2-frame')
    cursor2_2.setAttribute('data-frame', '2')
    cursor2_2.style.display = 'none'
    cursor2_2.innerHTML = `
      <path d="M299 85v43h-86V85zM85 299v-86h43v86zm342 0h-43v-86h43zM213 427v-43h86v43zm-85-299h43v43h-43zm213 0h43v43h-43zM128 341h43v43h-43zm213 0h43v43h-43z" fill="#8899ff"/>
    `

    const cursor2_3 = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    cursor2_3.classList.add('cursor2-frame')
    cursor2_3.setAttribute('data-frame', '3')
    cursor2_3.style.display = 'none'
    cursor2_3.innerHTML = `
      <path d="M213 213v-42h86v42zm0 86h-42v-86h42zm86 0v-86h42v86zm0 0v42h-86v-42z" fill="#8899ff"/>
    `

    const cursor2_4 = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    cursor2_4.classList.add('cursor2-frame')
    cursor2_4.setAttribute('data-frame', '4')
    cursor2_4.style.display = 'none'
    cursor2_4.innerHTML = `
      <path d="M213 299v-86h86v86z" fill="#8899ff"/>
    `

    cursor2Group.appendChild(cursor2_1)
    cursor2Group.appendChild(cursor2_2)
    cursor2Group.appendChild(cursor2_3)
    cursor2Group.appendChild(cursor2_4)

    g.appendChild(cursor1)
    g.appendChild(cursor2Group)
    svg.appendChild(g)

    document.body.appendChild(svg)

    this.cursorSvg = svg
    this.cursor1 = cursor1
    this.cursor2Group = cursor2Group
    this.cursor2Frames = [cursor2_1, cursor2_2, cursor2_3, cursor2_4]
    this.currentFrame = 0
    this.trueCursorMarker = trueCursorMarker
    this.filter = blur
  }

  init() {
    document.body.style.cursor = 'none'
    const style = document.createElement('style')
    style.textContent = '* { cursor: none !important; }'
    document.head.appendChild(style)

    document.addEventListener('mousemove', (e) => this.move(e))
    document.addEventListener('mouseenter', () => this.show())
    document.addEventListener('mouseleave', () => this.hide())

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, label, select, .file-label, summary')) {
        this.isHovering = true
        this.switchToHoverState()
      }
    })
    document.addEventListener('mouseout', (e) => {
      const leaving = e.target.closest('a, button, label, select, .file-label, summary')
      if (leaving && !leaving.contains(e.relatedTarget)) {
        this.isHovering = false
        this.switchToDefaultState()
      }
    })

    setTimeout(() => {
      this.cursorSvg.style.opacity = '1'
    }, 100)
  }

  switchToHoverState() {
    // hide cursor1, show cursor2 animation
    this.cursor1.style.display = 'none'
    this.cursor2Group.style.display = 'block'
    this.trueCursorMarker.setAttribute('fill', '#00a0c0')

    // start animation
    this.startCursor2Animation()
  }

  switchToDefaultState() {
    // show cursor1, hide cursor2
    this.cursor1.style.display = 'block'
    this.cursor2Group.style.display = 'none'
    this.trueCursorMarker.setAttribute('fill', '#00d1fb')

    // stop animation
    this.stopCursor2Animation()
  }

  startCursor2Animation() {
    if (this.animationInterval) return

    this.currentFrame = 0
    this.animationInterval = setInterval(() => {
      // hide all frames
      this.cursor2Frames.forEach(frame => frame.style.display = 'none')

      // show current frame
      this.cursor2Frames[this.currentFrame].style.display = 'block'

      // advance to next frame
      this.currentFrame = (this.currentFrame + 1) % this.cursor2Frames.length
    }, 62.5) // 250ms / 4 frames = 62.5ms per frame
  }

  stopCursor2Animation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval)
      this.animationInterval = null
    }

    // reset to first frame
    this.cursor2Frames.forEach(frame => frame.style.display = 'none')
    this.cursor2Frames[0].style.display = 'block'
    this.currentFrame = 0
  }

  move(event) {
    this.previousPointerX = this.position.pointerX
    this.previousPointerY = this.position.pointerY
    this.position.pointerX = event.clientX
    this.position.pointerY = event.clientY
    this.position.distanceX = Math.min(Math.max(this.previousPointerX - this.position.pointerX, -20), 20)
    this.position.distanceY = Math.min(Math.max(this.previousPointerY - this.position.pointerY, -20), 20)

    this.cursorSvg.style.transform = `translate3d(${this.position.pointerX}px, ${this.position.pointerY}px, 0)`

    if (this.hasMotionBlur) {
      this.rotate(this.position)
      this.stopBlur()
    }

    if (!this.moving) {
      this.moving = true
    }
  }

  rotate(position) {
    if (!this.filter) return

    let unsortedAngle = Math.atan(Math.abs(position.distanceY) / Math.abs(position.distanceX)) * this.degrees

    if (isNaN(unsortedAngle)) {
      this.angle = this.previousAngle
    } else {
      if (unsortedAngle <= 45) {
        if (position.distanceX * position.distanceY >= 0) {
          this.angle = +unsortedAngle
        } else {
          this.angle = -unsortedAngle
        }
        this.filter.setAttribute('stdDeviation', `${Math.abs(this.position.distanceX / 2)}, 0`)
      } else {
        if (position.distanceX * position.distanceY <= 0) {
          this.angle = 180 - unsortedAngle
        } else {
          this.angle = unsortedAngle
        }
        this.filter.setAttribute('stdDeviation', `0, ${Math.abs(this.position.distanceY / 2)}`)
      }
    }
    this.previousAngle = this.angle
  }

  stopBlur() {
    if (!this.filter) return
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout)
    }
    this.blurTimeout = setTimeout(() => {
      this.filter.setAttribute('stdDeviation', '0, 0')
      this.moving = false
    }, 50)
  }

  show() {
    this.cursorSvg.style.opacity = '1'
  }

  hide() {
    this.cursorSvg.style.opacity = '0'
  }
}

// init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AnimatedCursor()
  })
} else {
  new AnimatedCursor()
}
