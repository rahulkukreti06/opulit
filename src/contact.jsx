import { useState } from 'react'
import { FaArrowUpRightFromSquare, FaClock, FaEnvelope, FaHeadset, FaPhone } from 'react-icons/fa6'
import '../css/contact.css'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <div className="contact-intro">
          <span className="contact-eyebrow">LET'S TALK</span>
          <h1>Contact us</h1>
          <p>
            Tell us a little about your business and we’ll help you find the
            simplest way to get organized.
          </p>
        </div>

        <div className="contact-workspace" aria-hidden="true">
          <div className="workspace-topbar"><span /><span /><span /></div>
          <div className="workspace-sidebar">
            <b>O</b>
            <div className="workspace-nav active"><i />Overview</div>
            <div className="workspace-nav"><i />Customers</div>
            <div className="workspace-nav"><i />Inventory</div>
            <div className="workspace-nav"><i />Reports</div>
          </div>
          <div className="workspace-content">
            <div className="workspace-title"><div><small>GOOD MORNING, RAHUL</small><b>Business overview</b></div><em>Today⌄</em></div>
            <div className="workspace-cards"><span><small>Today's sales</small><b>₹12,480</b><i>+12.5%</i></span><span><small>New customers</small><b>24</b><i>+8.2%</i></span><span><small>Low stock</small><b>3 items</b><i className="warning">Review</i></span></div>
            <div className="workspace-chart"><div className="chart-heading"><b>Sales overview</b><small>Last 7 days</small></div><div className="chart-bars"><i><em>Mon</em></i><i><em>Tue</em></i><i><em>Wed</em></i><i><em>Thu</em></i><i><em>Fri</em></i><i><em>Sat</em></i><i><em>Sun</em></i></div></div>
            <div className="workspace-activity"><div><b>Recent activity</b><small>View all</small></div><p><i />Payment received <span>₹2,400</span></p><p><i />New customer added <span>Just now</span></p></div>
          </div>
        </div>
      </section>

      <section className="contact-main">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <span>GET IN TOUCH</span>
            <h2>How can we help?</h2>
            <p>We usually reply within one business day.</p>
          </div>

          <div className="form-grid">
            <label>Full name<input name="name" placeholder="Your full name" required /></label>
            <label>Work email<input type="email" name="email" placeholder="you@company.com" required /></label>
            <label>Phone number<input type="tel" name="phone" placeholder="Your phone number" /></label>
            <label>Business type<select name="businessType" defaultValue=""><option value="" disabled>Select your business</option><option>Retail store</option><option>Gym or studio</option><option>Salon or spa</option><option>Service business</option><option>Other</option></select></label>
          </div>
          <label className="message-label">Message<textarea name="message" rows="5" placeholder="Tell us what you’d like to manage better..." required /></label>
          <button className="contact-submit" type="submit">
            {submitted ? 'Message sent — thank you!' : 'Send message'}
            {!submitted && <FaArrowUpRightFromSquare aria-hidden="true" />}
          </button>
        </form>

        <aside className="contact-aside">
          <div className="aside-label">OPULIT SUPPORT</div>
          <h2>A better way to run your day.</h2>
          <p>Whether you are just getting started or ready to simplify a busy operation, our team is here to help.</p>
          <div className="aside-stat"><strong>6</strong><span>essential business tools<br />in one place</span></div>
          <div className="aside-stat"><strong>1:1</strong><span>help when you need<br />a hand getting started</span></div>
          <div className="aside-stat"><strong>24/7</strong><span>smart alerts that keep<br />important work on track</span></div>
          <div className="aside-stat"><strong>0</strong><span>extra apps needed to run<br />your daily operations</span></div>
        </aside>
      </section>

      <section className="contact-details" aria-label="Contact details">
        <a href="tel:+919999999999" className="detail-card"><span className="detail-icon"><FaPhone /></span><div><h3>Call us</h3><p>+91 99999 99999</p></div></a>
        <div className="detail-card"><span className="detail-icon"><FaClock /></span><div><h3>Working hours</h3><p>Mon–Fri, 9am–6pm IST</p></div></div>
        <a href="mailto:hello@opulit.com" className="detail-card"><span className="detail-icon"><FaEnvelope /></span><div><h3>Write to us</h3><p>hello@opulit.com</p></div></a>
        <a href="/signup" className="detail-card"><span className="detail-icon"><FaHeadset /></span><div><h3>Ready to start?</h3><p>Create your account</p></div></a>
      </section>

      <section className="contact-cta">
        <div><span>BUILT FOR GROWING BUSINESSES</span><h2>Less busywork.<br />More business.</h2></div>
        <a href="/signup">Start free trial <FaArrowUpRightFromSquare /></a>
      </section>
    </main>
  )
}
