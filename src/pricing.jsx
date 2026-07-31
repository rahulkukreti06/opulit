import '../css/pricing.css'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getPricingForRegion, getRegionalPricing } from './regionalPricing'

gsap.registerPlugin(ScrollTrigger)

export default function Pricing(){
    const heading = 'Pricing'
    const subHeading = 'The last business tool you\'ll ever need.'
    const subText = 'Start today. Scale forever.'
    const words = heading.split(' ')
    const wordRefs = useRef([])
    const heroRef = useRef(null)
    const contentRef = useRef(null)
    const pricingSection = useRef(null)
    const [activeFaqCategory, setActiveFaqCategory] = useState('Getting started')
    const [openFaq, setOpenFaq] = useState(0)
    const [localPricing, setLocalPricing] = useState(getRegionalPricing)

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    useEffect(() => {
        let isCurrent = true

        fetch('https://ipwho.is/')
            .then((response) => response.ok ? response.json() : null)
            .then((location) => {
                if (!isCurrent || !location || location.success === false || !location.country_code) return
                setLocalPricing(getPricingForRegion(location.country_code, navigator.language))
            })
            .catch(() => {
                // Keep the browser-locale price when location lookup is unavailable.
            })

        return () => { isCurrent = false }
    }, [])
    const comparisonGroups = [
        {
            title: 'Run your business',
            rows: [
                ['Inventory management', 'Up to 2,000 products', 'Unlimited products'],
                ['Customer management', 'Up to 5,000 customers', 'Unlimited customers'],
                ['WhatsApp billing', 'Included', 'Included'],
                ['Membership tracking', 'Included', 'Included'],
                ['Smart alerts', 'Included', 'Custom alerts'],
            ],
        },
        {
            title: 'Team & growth',
            rows: [
                ['Staff accounts', 'Up to 3 users', 'Unlimited users'],
                ['Reports & analytics', 'Essential reports', 'Advanced analytics'],
                ['Multi-location access', '—', 'Included'],
                ['Custom workflows', '—', 'Included'],
            ],
        },
        {
            title: 'Support',
            rows: [
                ['Getting started help', 'Included', 'Included'],
                ['Support', 'Standard support', 'Priority support'],
                ['Product guidance', '—', 'Dedicated guidance'],
            ],
        },
    ]
    const faqCategories = {
        'Getting started': [
            ['What is Opulit?', 'Opulit is an all-in-one workspace for running a growing business. It brings inventory, customers, billing, memberships, staff and alerts into one simple place.'],
            ['How quickly can I get started?', 'You can create your account and begin setting up your business straight away. Add your products, customers and team details at your own pace.'],
            ['Can I use Opulit on my phone?', 'Yes. Opulit is designed to work smoothly on mobile, tablet and desktop so you can keep up with your business wherever you are.'],
        ],
        'Plans & billing': [
            ['Which plan is right for my business?', 'Professional is a strong fit for businesses getting organised. Enterprise is ideal when you need unlimited records, more staff access, advanced analytics or custom workflows.'],
            ['Can I change my plan later?', 'Yes. You can move to Enterprise whenever your business needs more capacity and advanced tools.'],
            ['Is billing monthly?', 'Yes. Both Opulit plans are billed monthly, making it easy to choose the plan that fits your current stage.'],
        ],
        'Features': [
            ['Can I manage inventory and customers together?', 'Yes. Your stock, customer records and billing workflow live together, so your team always has the context it needs.'],
            ['Does Opulit support WhatsApp billing?', 'Yes. WhatsApp billing is included, helping you share bills and keep customer conversations moving quickly.'],
            ['What are smart alerts?', 'Smart alerts help you stay ahead of important activity, such as inventory updates and the day-to-day details that need attention.'],
        ],
        'Support': [
            ['What support is included?', 'Professional includes standard support. Enterprise includes priority support and dedicated product guidance for your team.'],
            ['Can I get help moving my business data?', 'Our team can guide you through the best way to set up your products, customers and records when you are getting started.'],
        ],
    }

    const selectFaqCategory = (category) => {
        setActiveFaqCategory(category)
        setOpenFaq(0)
    }

    useEffect(()=>{
        const hero = heroRef.current
        const section = pricingSection.current
        if (!hero && !section) return

        const ctx = gsap.context(()=>{
            const els = wordRefs.current.filter(Boolean)
            els.forEach(el=>{el.style.transform='translateY(110%)';el.style.opacity='0'})

            if (els.length) {
                gsap.to(els, {
                    y:'0%',
                    opacity:1,
                    duration:0.9,
                    stagger:0.06,
                    ease:'power3.out',
                    scrollTrigger:{
                        trigger: hero,
                        scroller: document.documentElement,
                        start:'top 80%'
                    }
                })
            }

            if (section) {
                gsap.fromTo(
                    section.querySelector(".price"),
                    { y: 50, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: section,
                            scroller: document.documentElement,
                            start: "top 80%",
                        },
                    }
                );

                gsap.fromTo(
                    section.querySelectorAll(".price-card1, .price-card2"),
                    { y: 60, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 1.10,
                        stagger: 0.15,
                        ease: "power3.out",
                        clearProps: "transform",
                        scrollTrigger: {
                            trigger: section,
                            scroller: document.documentElement,
                            start: "top 75%",
                        },
                    }
                );
            }
        }, pricingSection)

        return ()=>ctx.revert()
    },[])

    return(
        <main className="pricing-page" ref={pricingSection}>
            <section className="pricing-hero" ref={heroRef}>
               <h1>Incredible value at a fraction of the price</h1>
                <p className="pricing-subheading">{subHeading}</p>
                <p className="pricing-subtext">{subText}</p>
            </section>

            <section className = "price">
                <div className = "price-card1">
                    <div className="price-head">
                        <h1>Profesional</h1>
                        <p>Most Popular</p>
                    </div>
                    <div className="rup-price"><span>{localPricing.format(localPricing.professional)}</span><sub>/month</sub></div>
                    <div className = "price-description">
                        Core features to kickstart and accelerate your early momentum.
                    </div>
                    <button className="price-btn">Sign Up with Professional</button>
                    <div className="features-divider">
                        <span className="line"></span>
                        <span className="text">FEATURES</span>
                        <span className="line"></span>
                    </div>
                    <ul className="features-list">
                        <li><span className="checkmark">✓</span>Inventory management</li>
                        <li><span className="checkmark">✓</span>Customer management</li>
                        <li><span className="checkmark">✓</span>WhatsApp billing</li>
                        <li><span className="checkmark">✓</span>Membership tracking</li>
                        <li><span className="checkmark">✓</span>Employee management</li>
                        <li><span className="checkmark">✓</span>Smart alerts</li>
                    </ul>
                </div>
                <div className = "price-card2">
                    <div className="price-head">
                        <h1>Enterprise</h1>
                    </div>
                    <div className="rup-price"><span>{localPricing.format(localPricing.enterprise)}</span><sub>/month</sub></div>
                    <div className = "price-description">
                        Maximum power and advanced capabilities to fuel your expansion.
                    </div>
                    <button className="price-btn2">Sign Up with Enterprise</button>
                    <div className="features-divider">
                        <span className="line"></span>
                        <span className="text">FEATURES</span>
                        <span className="line"></span>
                    </div>
                    <ul className="features-list">
                        <li><span className="checkmark">✓</span>Everything in Growth</li>
                        <li><span className="checkmark">✓</span>Advanced reports & analytics</li>
                        <li><span className="checkmark">✓</span>Priority support</li>
                        <li><span className="checkmark">✓</span>Unlimited customer records</li>
                        <li><span className="checkmark">✓</span>Multi-staff access</li>
                        <li><span className="checkmark">✓</span>Future AI automations</li>
                    </ul>
                </div>
            </section>

            <section className="plan-comparison" aria-labelledby="comparison-title">
                <div className="comparison-intro">
                    <p>COMPARE PLANS</p>
                    <h2 id="comparison-title">Everything you need, at every stage.</h2>
                    <span>See exactly what is included with each Opulit plan.</span>
                </div>
                <div className="comparison-scroll">
                    <div className="comparison-table">
                        <div className="comparison-row comparison-plans">
                            <div className="comparison-feature">Features</div>
                            <div className="comparison-plan">
                                <strong>Professional</strong>
                                <span>For growing businesses</span>
                                <a href="/signup">Get started</a>
                            </div>
                            <div className="comparison-plan is-featured">
                                <strong>Enterprise</strong>
                                <span>For ambitious teams</span>
                                <a href="/signup">Get started</a>
                            </div>
                        </div>
                        {comparisonGroups.map((group) => (
                            <div className="comparison-group" key={group.title}>
                                <div className="comparison-group-title">{group.title}</div>
                                {group.rows.map(([feature, professional, enterprise]) => (
                                    <div className="comparison-row" key={feature}>
                                        <div className="comparison-feature">{feature}</div>
                                        <div className="comparison-value">{professional}</div>
                                        <div className="comparison-value">{enterprise}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pricing-faq" aria-labelledby="faq-title">
                <div className="faq-intro">
                    <p>FAQS</p>
                    <h2 id="faq-title">Questions &amp; answers</h2>
                    <span>Helpful answers about Opulit, its plans and the tools your business uses every day.</span>
                </div>
                <div className="faq-tabs" role="tablist" aria-label="FAQ categories">
                    {Object.keys(faqCategories).map((category) => (
                        <button
                            className={activeFaqCategory === category ? 'active' : ''}
                            key={category}
                            type="button"
                            role="tab"
                            aria-selected={activeFaqCategory === category}
                            onClick={() => selectFaqCategory(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>
                <div className="faq-list">
                    {faqCategories[activeFaqCategory].map(([question, answer], index) => {
                        const isOpen = openFaq === index
                        return (
                            <div className={`faq-item${isOpen ? ' open' : ''}`} key={question}>
                                <button
                                    className="faq-question"
                                    type="button"
                                    aria-expanded={isOpen}
                                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                                >
                                    <span>{question}</span><span className="faq-icon" aria-hidden="true">+</span>
                                </button>
                                <div className="faq-answer"><p>{answer}</p></div>
                            </div>
                        )
                    })}
                </div>
            </section>

            <section className="pricing-final-cta" aria-labelledby="final-cta-title">
                <div className="cta-orb cta-orb-one" aria-hidden="true"></div>
                <div className="cta-orb cta-orb-two" aria-hidden="true"></div>
                <div className="final-cta-content">
                    <p className="final-cta-eyebrow">READY WHEN YOU ARE</p>
                    <h2 id="final-cta-title">Spend less time managing.<br />More time growing.</h2>
                    <p>Bring your inventory, customers, billing and team into one place built for the way your business actually works.</p>
                    <div className="final-cta-actions">
                        <a className="final-cta-primary" href="/signup">Create your account <span>→</span></a>
                        <a className="final-cta-secondary" href="/contact">Talk to our team</a>
                    </div>
                    <div className="final-cta-notes" aria-label="Benefits">
                        <span>✓ Set up in minutes</span>
                        <span>✓ Plans from {localPricing.format(localPricing.professional)}/month</span>
                        <span>✓ Support when you need it</span>
                    </div>
                </div>
                <div className="cta-dashboard" aria-hidden="true">
                    <div className="cta-dashboard-bar"><i></i><i></i><i></i><b>Today at a glance</b></div>
                    <div className="cta-dashboard-grid">
                        <div><small>Customers</small><strong>1,248</strong><em>↑ 12% this month</em></div>
                        <div><small>Inventory alerts</small><strong>08</strong><em>Everything in control</em></div>
                        <div><small>Sales today</small><strong>₹24,680</strong><em>↑ 8% from yesterday</em></div>
                    </div>
                </div>
            </section>

            <footer className="pricing-footer">
                <div className="footer-main">
                    <div className="footer-brand">
                        <a className="footer-logo" href="/">Opulit</a>
                        <p>The everyday operating system for businesses that want to grow without the chaos.</p>
                        <a className="footer-contact" href="/contact">Talk to our team <span>→</span></a>
                    </div>
                    <div className="footer-links">
                        <div>
                            <h3>Product</h3>
                            <a href="/pricing">Pricing</a>
                            <a href="/#features">Features</a>
                            <a href="/signup">Create account</a>
                        </div>
                        <div>
                            <h3>Company</h3>
                            <a href="/about">About Opulit</a>
                            <a href="/contact">Contact</a>
                            <a href="/login">Sign in</a>
                        </div>
                        <div>
                            <h3>Built for</h3>
                            <span>Retail teams</span>
                            <span>Service businesses</span>
                            <span>Growing operators</span>
                        </div>
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

