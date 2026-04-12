import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Global scroll animation observer
const initScrollAnimations = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
  )

  // Re-observe periodically for dynamically added elements
  const observe = () => {
    document.querySelectorAll('.animate-on-scroll:not(.is-visible)').forEach((el) => {
      observer.observe(el)
    })
  }

  // Initial + delayed observe
  observe()
  setTimeout(observe, 500)
  setTimeout(observe, 1500)
}

// Run after React renders
setTimeout(initScrollAnimations, 200)
