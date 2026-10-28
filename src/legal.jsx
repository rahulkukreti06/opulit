import '../css/legal.css'

const lastUpdated = 'October 28, 2026'

function LegalLayout({ title, intro, children }) {
  return (
    <main className="legal-page">
      <header className="legal-hero">
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <p className="legal-updated">Last updated: {lastUpdated}</p>
      </header>
      <article className="legal-content">{children}</article>
      <footer className="site-footer legal-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">Opulit</div>
          <nav className="site-footer-links" aria-label="Footer">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </nav>
          <div className="site-footer-copy">© {new Date().getFullYear()} Opulit</div>
        </div>
      </footer>
    </main>
  )
}

export function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro="These terms explain the rules for using Opulit and the responsibilities we each have when you use our services."
    >
      <section>
        <h2>1. Using Opulit</h2>
        <p>
          Opulit is a business management platform that helps businesses organise customers,
          inventory, memberships, employees, billing, and related operations. By creating an
          account or using Opulit, you agree to these Terms of Service and to use the service
          lawfully and responsibly.
        </p>
      </section>
      <section>
        <h2>2. Your account</h2>
        <p>
          You are responsible for providing accurate account information, keeping your login
          credentials confidential, and all activity that occurs under your account. Notify us
          promptly at <a href="mailto:mail@opulit.com">mail@opulit.com</a> if you believe your
          account has been accessed without permission.
        </p>
      </section>
      <section>
        <h2>3. Your content and responsibilities</h2>
        <p>
          You retain ownership of the information you enter into Opulit. You grant us permission
          to host and process that information only as needed to provide, secure, maintain, and
          improve the service. You must have the rights and permissions necessary to upload and
          use your content, and you must not use Opulit to break the law, infringe another
          person&apos;s rights, distribute malicious code, or interfere with the service.
        </p>
      </section>
      <section>
        <h2>4. Plans, trials, and payment</h2>
        <p>
          Features, pricing, trial periods, and payment terms are shown when you select a plan.
          Unless otherwise stated, subscriptions renew for the same period until cancelled.
          You may cancel through the available account or support channels; cancellation takes
          effect at the end of the current paid period. Fees already paid are not refundable
          unless required by law or expressly stated otherwise.
        </p>
      </section>
      <section>
        <h2>5. Availability and changes</h2>
        <p>
          We work to keep Opulit available and reliable, but the service may occasionally be
          unavailable for maintenance, upgrades, or circumstances beyond our control. We may
          modify features or these terms when necessary. If a change materially affects your
          rights, we will provide reasonable notice.
        </p>
      </section>
      <section>
        <h2>6. Termination</h2>
        <p>
          You may stop using Opulit at any time. We may suspend or terminate access if you
          materially breach these terms, create a security risk, or use the service unlawfully.
          Provisions that should reasonably continue after termination, including ownership,
          disclaimers, limitations of liability, and dispute terms, will remain in effect.
        </p>
      </section>
      <section>
        <h2>7. Disclaimers and limitation of liability</h2>
        <p>
          Opulit is provided on an &quot;as available&quot; basis. We do not guarantee that the
          service will be uninterrupted or error-free. To the maximum extent permitted by law,
          Opulit and its providers will not be liable for indirect, incidental, special, or
          consequential losses arising from your use of the service. Nothing in these terms
          excludes liability that cannot legally be excluded.
        </p>
      </section>
      <section>
        <h2>8. Contact</h2>
        <p>
          Questions about these terms can be sent to <a href="mailto:mail@opulit.com">mail@opulit.com</a>.
        </p>
      </section>
    </LegalLayout>
  )
}

export function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="This policy describes what information Opulit collects, why we use it, and the choices available to you."
    >
      <section>
        <h2>1. Information we collect</h2>
        <p>
          We collect information you provide when you create an account or contact us, such as
          your name, email address, phone number, business details, and login credentials. When
          you use Opulit, we also process the business data you choose to store, including
          customer, inventory, membership, employee, and billing information.
        </p>
      </section>
      <section>
        <h2>2. How we use information</h2>
        <p>
          We use information to provide and secure Opulit, authenticate users, process
          subscriptions, respond to support requests, improve features, prevent abuse, and
          communicate service-related updates. We use aggregated or de-identified information
          for analytics and product improvement where it cannot reasonably identify you.
        </p>
      </section>
      <section>
        <h2>3. Sharing information</h2>
        <p>
          We do not sell your personal information. We may share information with service
          providers that help us host, secure, analyse, support, or process payments for Opulit.
          Those providers may access information only to perform services for us and must protect
          it. We may also disclose information when required by law, to protect rights and
          safety, or as part of a merger, acquisition, or sale of assets.
        </p>
      </section>
      <section>
        <h2>4. Storage and security</h2>
        <p>
          We use reasonable technical and organisational safeguards designed to protect
          information against unauthorised access, alteration, or loss. No internet service is
          completely secure. We retain information for as long as needed to provide the service,
          meet legal or accounting requirements, resolve disputes, and enforce our agreements.
        </p>
      </section>
      <section>
        <h2>5. Your choices</h2>
        <p>
          You can review or update account information through the service or by contacting us.
          You may unsubscribe from non-essential marketing messages using the link in the
          message. Service and security communications may still be sent when necessary to
          operate your account. You may request access to, correction of, or deletion of your
          personal information, subject to applicable law and legitimate retention needs.
        </p>
      </section>
      <section>
        <h2>6. Cookies and analytics</h2>
        <p>
          Opulit may use cookies or similar technologies to keep you signed in, remember
          preferences, understand usage, and improve the service. You can control cookies through
          your browser, though disabling essential cookies may affect functionality.
        </p>
      </section>
      <section>
        <h2>7. Children&apos;s privacy</h2>
        <p>
          Opulit is intended for businesses and is not directed to children under 13. We do not
          knowingly collect personal information from children under 13.
        </p>
      </section>
      <section>
        <h2>8. Contact</h2>
        <p>
          For privacy questions or requests, contact us at{' '}
          <a href="mailto:mail@opulit.com">mail@opulit.com</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
