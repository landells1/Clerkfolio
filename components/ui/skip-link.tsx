'use client'

// "Skip to main content" must land AFTER the navigation. The root layout's
// #main-content wrapper contains the sidebar/nav too, so jump to the page's
// <main> element when there is one (falling back to the wrapper without JS).
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={event => {
        const main = document.querySelector('main')
        if (!main) return
        event.preventDefault()
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
        main.focus()
        main.scrollIntoView()
      }}
    >
      Skip to main content
    </a>
  )
}
