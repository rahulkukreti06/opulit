import '../css/features.css'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FiBarChart2, FiBell, FiBox, FiMessageCircle, FiShield, FiUsers } from 'react-icons/fi'

gsap.registerPlugin(ScrollTrigger)

export default function Features() {
    const heroRef = useRef(null)
    const featuresRef = useRef(null)
    const [activeSlide, setActiveSlide] = useState(0)
    const [carouselPaused, setCarouselPaused] = useState(false)
    const animationRefs = useRef({})

    const heroSlides = [
        { image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1100&q=85', alt: 'Business owner reviewing work at a desk', metric: '98%', label: 'Customer satisfaction', brand: 'Customer care', detail: 'Every customer detail, ready when you need it.' },
        { image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=85', alt: 'Team collaborating around a table', metric: '3×', label: 'Faster daily operations', brand: 'Team workflow', detail: 'Keep your team moving from one shared workspace.' },
        { image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1100&q=85', alt: 'Business team planning together', metric: '24/7', label: 'Business visibility', brand: 'Opulit insights', detail: 'A clearer view of the work that matters most.' }
    ]

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    useEffect(() => {
        const hero = heroRef.current
        const section = featuresRef.current
        if (!hero || !section) return

        const ctx = gsap.context(() => {
            gsap.from(hero.querySelectorAll('.hero-copy > *'), {
                y: 28,
                opacity: 0,
                duration: 0.85,
                stagger: 0.1,
                ease: 'power3.out'
            })

            gsap.fromTo(section.querySelectorAll('.feature-card'),
                { y: 45, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.75,
                    stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: section.querySelector('.features-grid'), start: 'top 82%' }
                }
            )
        }, section)

        return () => ctx.revert()
    }, [])

    useEffect(() => {
        if (carouselPaused) return undefined
        const rotation = window.setInterval(() => setActiveSlide(current => (current + 1) % heroSlides.length), 3800)
        return () => window.clearInterval(rotation)
    }, [carouselPaused, heroSlides.length])

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Analytics Animation
            const chartBars = animationRefs.current['chart-bars']
            if (chartBars) {
                gsap.to(chartBars.children, {
                    scaleY: 0.7,
                    duration: 0.75,
                    repeat: -1,
                    yoyo: true,
                    ease: 'power1.inOut',
                    stagger: 0.1,
                    transformOrigin: 'bottom'
                })
            }
        }, featuresRef)

        return () => ctx.revert()
    }, [])

    const features = [
        { icon: FiBox, title: 'Inventory Management', description: 'Keep every product, location, and reorder point perfectly in sync.' },
        { icon: FiUsers, title: 'Customer Management', description: 'Turn every purchase into a stronger customer relationship.' },
        { icon: FiMessageCircle, title: 'WhatsApp Billing', description: 'Share bills where customers already are and get paid faster.' },
        { icon: FiBarChart2, title: 'Advanced Analytics', description: 'See the signals behind your sales, stock, and customer behaviour.', type: 'analytics' },
        { icon: FiBell, title: 'Smart Alerts', description: 'Get a useful nudge before stock, payments, or tasks need attention.' },
        { icon: FiShield, title: 'Staff Management', description: 'Give every teammate the right access with confidence and clarity.' }
    ]

    return (
        <main className="features-page" ref={featuresRef}>
            <section className="features-hero" ref={heroRef}>
                <div className="hero-copy">
                <span className="hero-eyebrow"><i></i> Built for growing businesses</span>
                <h1>Made for the work that <em>matters most.</em></h1>
                <p>Powerful, connected tools for inventory, customers, billing, and your team—designed to make every day feel more under control.</p>
                <div className="hero-actions">
                    <a href="/signup">Start free trial <span>→</span></a>
                    <a className="hero-text-link" href="#feature-detail">Explore the platform</a>
                </div>
                <div className="hero-proof" aria-label="Product highlights">
                    <span><b>01</b> One connected workspace</span>
                    <span><b>02</b> Built for teams in motion</span>
                    <span><b>03</b> Clearer decisions, daily</span>
                </div>
                </div>
                <div className="hero-carousel" aria-roledescription="carousel" aria-label="Opulit customer outcomes" onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)} onFocusCapture={() => setCarouselPaused(true)} onBlurCapture={() => setCarouselPaused(false)}>
                    <div className="carousel-stage">
                        {heroSlides.map((slide, index) => {
                            const distance = (index - activeSlide + heroSlides.length) % heroSlides.length
                            const position = distance === 0 ? 'active' : distance === 1 ? 'right' : 'left'
                            const isActive = index === activeSlide
                            return (
                                <article className={`hero-slide hero-slide-${position}`} key={slide.brand} aria-hidden={!isActive}>
                                    <img src={slide.image} alt={slide.alt} />
                                    <div className="slide-shade"></div>
                                    <div className="slide-stat"><span>{slide.label}</span><strong>{slide.metric}</strong></div>
                                    <div className="slide-overlay"><span className="slide-brand-mark"><img src="/favicon-32.png" alt="Opulit logo" /></span><div><strong>{slide.brand}</strong><p>{slide.detail}</p></div></div>
                                </article>
                            )
                        })}
                    </div>
                    <div className="carousel-pagination" role="tablist" aria-label="Choose a customer outcome">
                        {heroSlides.map((slide, index) => <button type="button" key={slide.brand} className={activeSlide === index ? 'is-active' : ''} role="tab" aria-selected={activeSlide === index} aria-label={`Show ${slide.brand}`} onClick={() => setActiveSlide(index)}><span></span></button>)}
                    </div>
                </div>
            </section>

            <section className="features-grid" aria-label="Opulit features">
                {features.map((feature, index) => (
                    <article className={`feature-card feature-card-${index + 1} ${feature.type === 'analytics' ? 'analytics-card' : ''}`} key={feature.title}>
                        <span className="feature-number">0{index + 1}</span>
                        <h3>{feature.title}</h3>
                        <p>{feature.description}</p>
                        {feature.type === 'analytics' && (
                            <div className="card-animation analytics-animation">
                                <div className="analytics-dashboard" aria-label="Analytics dashboard preview">
                                    <div className="dashboard-topbar">
                                        <span className="mini-pill live">Live</span>
                                        <span className="mini-pill">Sales</span>
                                        <span className="dashboard-value">₹1.8M</span>
                                    </div>
                                    <div className="dashboard-grid">
                                        <div className="dashboard-metric">
                                            <small>Conversion</small>
                                            <strong>4.8%</strong>
                                        </div>
                                        <div className="dashboard-metric">
                                            <small>Orders</small>
                                            <strong>2.4k</strong>
                                        </div>
                                    </div>
                                    <div className="dashboard-chart">
                                        <div className="chart-area">
                                            <span className="chart-line"></span>
                                        </div>
                                        <div className="chart-bars" ref={el => animationRefs.current['chart-bars'] = el}>
                                            <div className="chart-bar" style={{ height: '40%' }}></div>
                                            <div className="chart-bar" style={{ height: '62%' }}></div>
                                            <div className="chart-bar" style={{ height: '48%' }}></div>
                                            <div className="chart-bar" style={{ height: '86%' }}></div>
                                            <div className="chart-bar" style={{ height: '72%' }}></div>
                                            <div className="chart-bar" style={{ height: '94%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </article>
                ))}
            </section>

            <section className="feature-detail" id="feature-detail">
                <div className="detail-content">
                    <div className="detail-text">
                        <span className="detail-label">Why Opulit</span>
                        <h2>Built for growing businesses</h2>
                        <p>Opulit brings together everything you need to run your business efficiently—without switching between tools or losing sight of what matters.</p>
                        <ul className="detail-list">
                            <li><span>✓</span> All-in-one platform</li>
                            <li><span>✓</span> Real-time synchronization</li>
                            <li><span>✓</span> Mobile-friendly design</li>
                            <li><span>✓</span> Secure and reliable</li>
                        </ul>
                        <a className="detail-cta" href="/signup">Get started <span>→</span></a>
                    </div>
                    <div className="detail-visual" aria-label="Opulit dashboard preview">
                        <div className="visual-glow"></div>
                        <div className="visual-card">
                            <div className="visual-header">
                                <span><i></i> Overview</span>
                                <div className="visual-dots"><span></span><span></span><span></span></div>
                            </div>
                            <div className="visual-body">
                                <div className="visual-stat visual-stat-featured">
                                    <small>Total sales</small>
                                    <strong>₹124,580</strong>
                                    <em>↑ 23% this month</em>
                                    <div className="sparkline"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                                </div>
                                <div className="visual-stats-row">
                                    <div className="visual-stat"><small>Active customers</small><strong>1,248</strong><em>↑ 12% this month</em></div>
                                    <div className="visual-stat"><small>Low-stock items</small><strong>08</strong><em className="attention">Needs attention</em></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features-cta">
                <div className="cta-content">
                    <span className="cta-kicker">Start simplifying</span>
                    <h2>Ready to transform your business?</h2>
                    <p>Join thousands of businesses using Opulit to streamline operations and build momentum.</p>
                    <div className="cta-buttons">
                        <a className="cta-primary" href="/signup">Start free trial <span>→</span></a>
                        <a className="cta-secondary" href="/contact">Talk to sales</a>
                    </div>
                </div>
            </section>

            <footer className="features-footer">
                <div className="footer-main">
                    <div className="footer-brand">
                        <a className="footer-logo" href="/">Opulit</a>
                        <p>The everyday operating system for businesses that want to grow without the chaos.</p>
                        <a className="footer-contact" href="/contact">Talk to our team →</a>
                    </div>
                    <div className="footer-links">
                        <div><h3>Product</h3><a href="/pricing">Pricing</a><a href="/features">Features</a><a href="/signup">Create account</a></div>
                        <div><h3>Company</h3><a href="/about">About Opulit</a><a href="/contact">Contact</a><a href="/login">Sign in</a></div>
                        <div><h3>Built for</h3><span>Retail teams</span><span>Service businesses</span><span>Growing operators</span></div>
                    </div>
                </div>
                <div className="footer-bottom"><span>© {new Date().getFullYear()} Opulit. Built for growing businesses.</span><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></div>
            </footer>
        </main>
    )
}
