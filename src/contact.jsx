import { useState } from 'react'
import { FiArrowUpRight, FiClock, FiHeadphones, FiMail, FiPhone } from 'react-icons/fi'
import '../css/contact.css'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="contact-page">
      <div className="contact-content">
        <aside className="contact-visual" aria-label="Opulit contact information">
          <img
            src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=85"
            alt="Lush green leaves"
          />
          <div className="contact-visual-shade" />
          <div className="contact-image-copy">
            <span className="contact-image-brand">OPULIT</span>
            <div className="contact-image-message">
              <p>Smarter business management, built to keep every moving part in one place.</p>
              <a href="mailto:mail@opulit.com">mail@opulit.com</a>
            </div>
          </div>
        </aside>

        <section className="contact-form-panel">
          <div className="contact-header">
            <span className="contact-eyebrow">Get in touch</span>
            <h1>How can we help?</h1>
            <p>We usually reply within one business day.</p>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-form-grid">
              <label className="contact-form-group">
                <span>Full name</span>
                <span className="contact-field"><input name="name" placeholder="Your full name" required /></span>
              </label>
              <label className="contact-form-group">
                <span>Work email</span>
                <span className="contact-field"><input type="email" name="email" placeholder="you@company.com" required /></span>
              </label>
            </div>
            <div className="contact-form-grid">
              <label className="contact-form-group">
                <span>Phone number</span>
                <span className="contact-field"><input type="tel" name="phone" placeholder="Your phone number" /></span>
              </label>
              <label className="contact-form-group">
                <span>Business type</span>
                <select name="businessType" defaultValue="">
                  <option value="" disabled>Select your business</option>
                  <option>Retail store</option>
                  <option>Gym or studio</option>
                  <option>Salon or spa</option>
                  <option>Service business</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            <label className="contact-form-group">
              <span>Message</span>
              <textarea name="message" rows="5" placeholder="Tell us what you&apos;d like to manage better..." required />
            </label>
            <button className="contact-submit" type="submit">
              {submitted ? 'Message sent — thank you!' : <><span>Send message</span><FiArrowUpRight aria-hidden="true" /></>}
            </button>
            <p className="contact-help">Prefer email? <a href="mailto:mail@opulit.com">mail@opulit.com</a></p>
          </form>

          <section className="contact-options" aria-label="Other ways to contact Opulit">
            <a className="contact-option" href="tel:+919105252662">
              <span className="contact-option-icon"><FiPhone /></span>
              <span><strong>Call us</strong><small>+91 9105252662</small></span>
              <FiArrowUpRight className="contact-option-arrow" aria-hidden="true" />
            </a>
            <a className="contact-option" href="mailto:mail@opulit.com?subject=Working%20hours">
              <span className="contact-option-icon"><FiClock /></span>
              <span><strong>Working hours</strong><small>Mon–Fri, 9am–6pm IST</small></span>
              <FiArrowUpRight className="contact-option-arrow" aria-hidden="true" />
            </a>
            <a className="contact-option" href="mailto:mail@opulit.com">
              <span className="contact-option-icon"><FiMail /></span>
              <span><strong>Write to us</strong><small>mail@opulit.com</small></span>
              <FiArrowUpRight className="contact-option-arrow" aria-hidden="true" />
            </a>
            <a className="contact-option" href="/signup">
              <span className="contact-option-icon"><FiHeadphones /></span>
              <span><strong>Ready to start?</strong><small>Create your account</small></span>
              <FiArrowUpRight className="contact-option-arrow" aria-hidden="true" />
            </a>
          </section>
        </section>
      </div>

      <footer className="pricing-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a className="footer-logo" href="/">Opulit</a>
            <p>The everyday operating system for businesses that want to grow without the chaos.</p>
            <a className="footer-contact" href="/contact">Talk to our team <span>→</span></a>
          </div>
          <div className="footer-links">
            <div><h3>Product</h3><a href="/pricing">Pricing</a><a href="/#features">Features</a><a href="/signup">Create account</a></div>
            <div><h3>Company</h3><a href="/about">About Opulit</a><a href="/contact">Contact</a><a href="/login">Sign in</a></div>
            <div><h3>Built for</h3><span>Retail teams</span><span>Service businesses</span><span>Growing operators</span></div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Opulit. Built for growing businesses.</span>
          <div><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>
        </div>
      </footer>
    </main>
  )
}
