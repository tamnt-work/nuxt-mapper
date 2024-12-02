import * as d3 from 'd3'
import type { Ref } from 'vue'
import { ref } from 'vue'

export interface HandleState {
  isDragging: Ref<boolean>
  currentZoom: Ref<number>
  initializeDragBehavior: (mermaidDiv: HTMLElement) => void
  initializeZoomBehavior: (mermaidDiv: HTMLElement) => void
  zoomIn: (mermaidDiv: HTMLElement) => void
  zoomOut: (mermaidDiv: HTMLElement) => void
  onReset: (mermaidDiv: HTMLElement) => void
  updateZoom: (mermaidDiv: HTMLElement, newScale: number, focusX: number, focusY: number, useTransition?: boolean) => void
  downloadDiagram: (mermaidDiv: HTMLElement) => void
}

export function useSchemaVisual(): HandleState {
  const isDragging = ref(false)
  const currentZoom = ref(1)
  const minZoom = 0.1
  const maxZoom = 5

  function initializeDragBehavior(mermaidDiv: HTMLElement) {
    const svg = d3.select(mermaidDiv).select('svg')
    if (!svg.node()) return

    // Store initial transform values
    let translateX = 0
    let translateY = 0
    let scale = currentZoom.value

    const drag = d3.drag()
      .on('start', () => {
        isDragging.value = true
        mermaidDiv.style.cursor = 'grabbing'
        // Get current transform values when starting drag
        const transform = svg.style('transform')
        const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
        if (match) {
          translateX = Number.parseFloat(match[1]) || 0
          translateY = Number.parseFloat(match[2]) || 0
        }
        scale = currentZoom.value
      })
      .on('drag', (event) => {
        translateX += event.dx
        translateY += event.dy
        svg.style('transform', `translate(${translateX}px, ${translateY}px) scale(${scale})`)
      })
      .on('end', () => {
        isDragging.value = false
        mermaidDiv.style.cursor = 'grab'
      })

    svg.call(drag as any)
    mermaidDiv.style.cursor = 'grab'
  }

  function initializeZoomBehavior(mermaidDiv: HTMLElement) {
    if (!mermaidDiv) return

    let lastWheelTime = 0
    const wheelThrottle = 16 // ~60fps

    mermaidDiv.addEventListener('wheel', (event) => {
      event.preventDefault()

      const now = Date.now()
      if (now - lastWheelTime < wheelThrottle) return
      lastWheelTime = now

      const svg = d3.select(mermaidDiv).select('svg')
      svg.style('transition', 'none')

      // Handle zoom with Cmd/Ctrl + scroll
      if (event.ctrlKey || event.metaKey) {
        const rect = mermaidDiv.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        const wheelDelta = event.deltaY
        const zoomSpeed = 0.004 * Math.max(1, currentZoom.value)
        const zoomDelta = -wheelDelta * zoomSpeed

        const newScale = Math.min(
          Math.max(
            currentZoom.value * Math.exp(zoomDelta),
            minZoom,
          ),
          maxZoom,
        )

        updateZoom(mermaidDiv, newScale, mouseX, mouseY, false)
      }
      // Handle panning
      else {
        const transform = svg.style('transform')
        const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
        const translateX = match ? Number.parseFloat(match[1]) : 0
        const translateY = match ? Number.parseFloat(match[2]) : 0

        const scrollSpeed = 1.5

        if (event.shiftKey) {
          // Shift + wheel: scroll left/right using deltaX instead of deltaY
          svg.style('transform', `translate(${translateX - event.deltaX * scrollSpeed}px, ${translateY}px) scale(${currentZoom.value})`)
        }
        else {
          // Regular wheel: scroll both vertically and horizontally
          svg.style('transform', `translate(${translateX - event.deltaX * scrollSpeed}px, ${translateY - event.deltaY * scrollSpeed}px) scale(${currentZoom.value})`)
        }
      }

      setTimeout(() => {
        svg.style('transition', null)
      }, 100)
    }, { passive: false })
  }

  function updateZoom(mermaidDiv: HTMLElement, newScale: number, focusX: number, focusY: number, useTransition = true) {
    const svg = d3.select(mermaidDiv).select('svg')

    // Set transition based on the useTransition parameter
    if (!useTransition) {
      svg.style('transition', 'none')
    }

    const transform = svg.style('transform')
    const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
    const translateX = match ? Number.parseFloat(match[1]) : 0
    const translateY = match ? Number.parseFloat(match[2]) : 0

    const zoomPointX = (focusX - translateX) / currentZoom.value
    const zoomPointY = (focusY - translateY) / currentZoom.value

    const newTranslateX = focusX - (zoomPointX * newScale)
    const newTranslateY = focusY - (zoomPointY * newScale)

    svg.style('transform', `translate(${newTranslateX}px, ${newTranslateY}px) scale(${newScale})`)
    currentZoom.value = newScale

    // Reset transition after transform is applied
    if (!useTransition) {
      setTimeout(() => {
        svg.style('transition', null)
      }, 100)
    }
  }

  function zoomIn(mermaidDiv: HTMLElement) {
    const rect = mermaidDiv.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const newScale = Math.min(currentZoom.value * 1.2, maxZoom)
    updateZoom(mermaidDiv, newScale, centerX, centerY, true)
  }

  function zoomOut(mermaidDiv: HTMLElement) {
    const rect = mermaidDiv.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const newScale = Math.max(currentZoom.value / 1.2, minZoom)
    updateZoom(mermaidDiv, newScale, centerX, centerY, true)
  }

  function onReset(mermaidDiv: HTMLElement) {
    const svg = d3.select(mermaidDiv).select('svg')
    svg.style('transform', 'translate(0px, 0px) scale(1)')
    currentZoom.value = 1
  }

  function downloadDiagram(mermaidDiv: HTMLElement) {
    if (!mermaidDiv) return

    const svg = mermaidDiv.querySelector('svg')
    if (!svg) return

    try {
      // Create a copy of the SVG to modify
      const svgCopy = svg.cloneNode(true) as SVGElement

      const bbox = svg.getBBox()
      const width = Math.max(bbox.width + 50, 800) // Min width 800px
      const height = Math.max(bbox.height + 50, 600) // Min height 600px

      // Set dimensions and style attributes
      svgCopy.setAttribute('width', width.toString())
      svgCopy.setAttribute('height', height.toString())
      svgCopy.setAttribute('viewBox', `${bbox.x - 25} ${bbox.y - 25} ${width} ${height}`)

      // Reset any transforms
      svgCopy.style.transform = 'none'

      // Convert SVG to string
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svgCopy)

      // Create Blob and download
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'schema-diagram.svg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    catch (error) {
      console.error('Error downloading diagram:', error)
      throw new Error('Failed to download diagram')
    }
  }

  return {
    isDragging,
    currentZoom,
    initializeDragBehavior,
    initializeZoomBehavior,
    zoomIn,
    zoomOut,
    onReset,
    updateZoom,
    downloadDiagram,
  }
}
