import { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Header from "../components/header";
import Pricing from "./pricing";
import Features from "./features";
import Signup from "./signup";
import Login from "./login";
import Contact from "./contact"
import "./App.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaFire } from 'react-icons/fa';
import ScrollingMarquee from "../components/scrollanimation";
import { getPricingForRegion, getRegionalPricing } from "./regionalPricing";

gsap.registerPlugin(ScrollTrigger);

function Home() {
  const heading = "Ready to run your business without the chaos";
  const words = heading.split(" ");
  const wordRefs = useRef([]);
  const sub =
    "A smarter way to manage clients, memberships, employees, products, and critical renewals.";
  const subWords = sub.split(" ");
  const subRefs = useRef([]);
  const actionsRef = useRef(null);
  const photoStatsRef = useRef(null);
  const photoStatsBgRef = useRef(null);
  const howItWorksRef = useRef(null);
  const featuresRef = useRef(null);
  const featuresHeadingsRef = useRef(null);
  const featuresCardRef = useRef(null);
  const textSectionRef = useRef(null);
  const sleepSectionRef = useRef(null);
  const pricingSectionRef = useRef(null);
  const finalCtaRef = useRef(null);
  const [localPricing, setLocalPricing] = useState(getRegionalPricing);
  const [workflowMode, setWorkflowMode] = useState("guided");

  const workflowModes = {
    handsOn: {
      label: "Hands-on",
      copy: "You stay in control of every update. Opulit keeps your client, stock, team, and billing information organised so each decision is easy to make.",
    },
    guided: {
      label: "Guided",
      copy: "Let Opulit do the remembering. Smart alerts flag low stock, expiring memberships, and pending payments while you keep the final say.",
    },
    automated: {
      label: "Automated",
      copy: "Set your rules once and let routine follow-ups run in the background. You get a clear view of what needs attention without chasing every task.",
    },
  };

  useEffect(() => {
    let isCurrent = true;

    fetch("https://ipwho.is/")
      .then((response) => (response.ok ? response.json() : null))
      .then((location) => {
        if (!isCurrent || !location || location.success === false || !location.country_code) return;
        setLocalPricing(getPricingForRegion(location.country_code, navigator.language));
      })
      .catch(() => {
        // Keep the browser-locale price when location lookup is unavailable.
      });

    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    const els = wordRefs.current.filter(Boolean);
    // Set initial state via inline styles for reliable SSR/rehydration
    els.forEach((el) => {
      el.style.transform = "translateY(110%)";
      el.style.opacity = "0";
    });
    gsap.to(els, {
      y: "0%",
      opacity: 1,
      duration: 1.1,
      stagger: 0.06,
      ease: "power3.out",
      delay: 0.2,
      onComplete: () => {
        els.forEach((e) => {
          e.style.transform = "translateY(0%)";
          e.style.opacity = "1";
        });
      },
    });
    // Subtitle words
    const subs = subRefs.current.filter(Boolean);
    subs.forEach((s) => {
      s.style.transform = "translateY(80%)";
      s.style.opacity = "0";
    });
    gsap.to(subs, {
      y: "0%",
      opacity: 1,
      duration: 0.9,
      stagger: 0.03,
      ease: "power3.out",
      delay: 0.5,
    });

    // Actions fade in
    if (actionsRef.current) {
      gsap.fromTo(
        actionsRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.9 },
      );
    }
  }, []);

  useEffect(() => {
    const section = photoStatsRef.current;
    const bgWrap = photoStatsBgRef.current;
    if (!section || !bgWrap) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bgWrap,
        { scale: 1, force3D: true },
        {
          scale: 1.25,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
            invalidateOnRefresh: true,
          },
        },
      );
    }, section);

    const refresh = () => ScrollTrigger.refresh();
    const img = bgWrap.querySelector("img");

    if (img) {
      img.addEventListener("load", refresh);
      if (img.complete) refresh();
    }

    requestAnimationFrame(refresh);
    window.addEventListener("resize", refresh);

    return () => {
      if (img) img.removeEventListener("load", refresh);
      window.removeEventListener("resize", refresh);
      ctx.revert();
    };
  }, []);

  // Scroll reveal for how-it-works section
  useEffect(() => {
    const section = howItWorksRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const img1 = section.querySelector(".how-img-1");
      const img2 = section.querySelector(".how-img-2");

      gsap.fromTo(
        section.querySelector(".how-text"),
        { y: 60, opacity: 0 },
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
        },
      );
      gsap.fromTo(
        section.querySelector(".how-image"),
        { y: 60, opacity: 0 },
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
        },
      );

      // Image transition effect
      if (img1 && img2) {
        const isMobile = window.innerWidth <= 960;
        const startPoint = isMobile ? "top 90%" : "top 70%";
        const endPoint = isMobile ? "bottom 20%" : "center center";

        gsap.to(img1, {
          opacity: 0,
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: startPoint,
            end: endPoint,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        gsap.to(img2, {
          opacity: 1,
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: startPoint,
            end: endPoint,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      }
    }, section);

    return () => ctx.revert();
  }, []);

  // Scroll reveal for features section
  useEffect(() => {
    const section = featuresRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const img1 = section.querySelector(".features-img-1");
      const img2 = section.querySelector(".features-img-2");

      gsap.fromTo(
        section.querySelector(".features-img"),
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 80%",
          },
        },
      );
      gsap.fromTo(
        section.querySelector(".features-text"),
        { x: 60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 80%",
          },
        },
      );

      // Image transition effect
      if (img1 && img2) {
        const isMobile = window.innerWidth <= 960;
        const startPoint = isMobile ? "top 90%" : "top 70%";
        const endPoint = isMobile ? "bottom 20%" : "center center";

        gsap.to(img1, {
          opacity: 0,
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: startPoint,
            end: endPoint,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        gsap.to(img2, {
          opacity: 1,
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: startPoint,
            end: endPoint,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      }
    }, section);

    return () => ctx.revert();
  }, []);

  // Scroll reveal for features-headings section
  useEffect(() => {
    const section = featuresHeadingsRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelector(".features-heading"),
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
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  // Scroll reveal for features-card section with stagger
  useEffect(() => {
    const section = featuresCardRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelectorAll(".cards"),
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 80%",
          },
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  // Scroll reveal for photo-stats content
  useEffect(() => {
    const section = photoStatsRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelector(".stats-hero"),
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 70%",
          },
        },
      );
      gsap.fromTo(
        section.querySelectorAll(".stats-item"),
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 60%",
          },
        },
      );

      // Count up animation for stats values
      const statsValues = section.querySelectorAll(".stats-value");
      statsValues.forEach((valueEl) => {
        const text = valueEl.textContent;
        
        // Check if it's a simple number (6)
        if (/^\d+$/.test(text)) {
          const target = parseInt(text);
          gsap.fromTo(
            valueEl,
            { textContent: 0 },
            {
              textContent: target,
              duration: 2,
              ease: "power2.out",
              snap: { textContent: 1 },
              scrollTrigger: {
                trigger: section,
                scroller: document.documentElement,
                start: "top 60%",
              },
              onUpdate: function() {
                valueEl.textContent = Math.round(this.targets()[0].textContent);
              },
            },
          );
        }
        // Check if it's a percentage (100%)
        else if (text.includes("%")) {
          const target = parseInt(text.replace("%", ""));
          gsap.fromTo(
            valueEl,
            { textContent: 0 },
            {
              textContent: target,
              duration: 2,
              ease: "power2.out",
              snap: { textContent: 1 },
              scrollTrigger: {
                trigger: section,
                scroller: document.documentElement,
                start: "top 60%",
              },
              onUpdate: function() {
                valueEl.textContent = Math.round(this.targets()[0].textContent) + "%";
              },
            },
          );
        }
        // Check if it's 24/7 format
        else if (text.includes("/")) {
          const parts = text.split("/");
          const firstNum = parseInt(parts[0]);
          const secondNum = parseInt(parts[1]);
          
          gsap.fromTo(
            valueEl,
            { textContent: "0/0" },
            {
              textContent: text,
              duration: 2,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                scroller: document.documentElement,
                start: "top 60%",
              },
              onUpdate: function() {
                const progress = this.progress();
                const currentFirst = Math.round(progress * firstNum);
                const currentSecond = Math.round(progress * secondNum);
                valueEl.textContent = `${currentFirst}/${currentSecond}`;
              },
            },
          );
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // Scroll reveal for text-section
  useEffect(() => {
    const section = textSectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const p = section.querySelector('p');
      const spans = section.querySelectorAll('span');

      // Set initial state with blur
      if (p) {
        p.style.transform = "translateY(110%)";
        p.style.opacity = "0";
      }
      spans.forEach((span) => {
        span.style.transform = "translateY(110%)";
        span.style.opacity = "0";
        span.style.filter = "blur(10px)";
      });

      // Animate p with 1s delay and blur
      if (p) {
        gsap.to(p, {
          y: "0%",
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 80%",
          },
          onComplete: () => {
            p.style.transform = "translateY(0%)";
            p.style.opacity = "1";
            p.style.filter = "blur(0px)";
          },
        });
      }

      // Animate spans with stagger, 1s delay, and blur
      gsap.to(spans, {
        y: "0%",
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.9,
        stagger: 0.2,
        ease: "power3.out",
        delay: 0.7,
        scrollTrigger: {
          trigger: section,
          scroller: document.documentElement,
          start: "top 75%",
        },
        onComplete: () => {
          spans.forEach((span) => {
            span.style.transform = "translateY(0%)";
            span.style.opacity = "1";
            span.style.filter = "blur(0px)";
          });
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // Scroll reveal for sleep-section
  useEffect(() => {
    const section = sleepSectionRef.current;
    if (!section) return;

    const bgWrap = section.querySelector('.sleep-bg-wrap');

    const ctx = gsap.context(() => {
      const heading = section.querySelector('.sleep-heading');
      const subtext = section.querySelector('.sleep-subtext');

      if (heading) {
        heading.style.transform = "translateY(60px)";
        heading.style.opacity = "0";
      }
      if (subtext) {
        subtext.style.transform = "translateY(60px)";
        subtext.style.opacity = "0";
      }

      if (heading) {
        gsap.to(heading, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 75%",
          },
          onComplete: () => {
            heading.style.transform = "translateY(0)";
            heading.style.opacity = "1";
          },
        });
      }

      if (subtext) {
        gsap.to(subtext, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          delay: 0.3,
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 75%",
          },
          onComplete: () => {
            subtext.style.transform = "translateY(0)";
            subtext.style.opacity = "1";
          },
        });
      }

      // Zoom effect on background image while scrolling
      if (bgWrap) {
        gsap.fromTo(bgWrap,
          { scale: 1 },
          {
            scale: 1.25,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              scroller: document.documentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  // Scroll reveal for pricing section
  useEffect(() => {
    const section = pricingSectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelector(".pricing-header"),
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
        },
      );

      gsap.fromTo(
        section.querySelectorAll(".pricing-card1, .pricing-card2"),
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
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  // Scroll reveal for final CTA section
  useEffect(() => {
    const section = finalCtaRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelectorAll(".lable-text, .middle-headline, .final-headline, .final-btn"),
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.18,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            scroller: document.documentElement,
            start: "top 82%",
          },
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <main>
      <section className="hero-video-container">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="https://res.cloudinary.com/iblxyfjj/video/upload/v1785425907/Website_video_vidxp7.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>
              {words.map((w, i) => (
                <span className="hero-word" key={i}>
                  <span ref={(el) => (wordRefs.current[i] = el)}>{w}</span>
                  {i !== words.length - 1 ? " " : ""}
                </span>
              ))}
            </h1>
            <p className="hero-sub">
              {subWords.map((w, i) => (
                <span className="hero-sub-word" key={i}>
                  <span ref={(el) => (subRefs.current[i] = el)}>{w}</span>
                  {i !== subWords.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
            <div className="hero-actions" ref={actionsRef}>
              <a className="btn-primary" href="/signup">Get early access</a>
              <a className="hero-link" href="/pricing">
                See pricing →
              </a>
            </div>
          </div>
        </div>
        <div className="rotate-svg">
          <svg viewBox="0 0 200 200" className="rotate-animation">
            <defs>
              <path
                id="circlePath"
                d="M 100, 100 m -75, 0 a 75, 75 0 1, 0 150, 0 a 75, 75 0 1, 0 -150, 0"
              />
            </defs>
            <text>
              <textPath href="#circlePath">
                • MANAGE EVERYTHING • BUILT FOR MODERN BUSINESSES
              </textPath>
            </text>
          </svg>
        </div>
      </section>

      <section className="how-it-works" ref={howItWorksRef}>
        <div className="how-text">
          <div className="how-title">
            <h3>How it works</h3>
            <h1>Manage your business without the busywork.</h1>
            <p>
              Opulit helps you organize clients, memberships, employees, products,
              and renewals — all in one simple system designed for modern
              businesses.
            </p>
            <hr></hr>
            <p> <strong>5 business tools. </strong>One simple system. Built to save time.</p>
          </div>
        </div>
        <div className="how-image">
          <div className="how-image-wrapper">
            <img
              className="how-img-1"
              loading="lazy"
              src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
              alt="Office workspace"
            />
            <img
              className="how-img-2"
              loading="lazy"
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
              alt="Office workspace"
            />
          </div>
        </div>
      </section>

      <section className="features" ref={featuresRef}>
              <div className="features-img">
                <div className="features-image-wrapper">
                  <img
                    className="features-img-1"
                    loading="lazy"
                    src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
                    alt="Office workspace"
                  />
                  <img
                    className="features-img-2"
                    loading="lazy"
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
                    alt="Office workspace"
                  />
                </div>
              </div>
              <div className="features-text">
                <div className="features-title">
                <h3>Features</h3>
                <h1>Built to simplify business management.</h1>
                <p>Keep customer details, memberships, and important information organized in one place — without spreadsheets or scattered notes.</p>
                <hr></hr>
                <p>Works for any business. Ready in <strong>4 minutes.</strong> </p>
              </div>
              </div>
      </section>

      <section className="features-headings" ref={featuresHeadingsRef}>
        <div className="features-heading">
          <h3><span style={{ color: '#424242' }}>
        <FaFire />
      </span> Features</h3>
          <h1>Everything you need to manage your business</h1>
          <p>Powerful tools to help you stay organized, reduce busywork, and manage daily operations from one place.</p>
        </div>
      </section>

      <section className="features-card" ref={featuresCardRef}>
        <div className="cards-container">
          <div className="cards">
            <div className="cards-img">
              <img
                loading="lazy"
                src="/Inventory-management-img.png"
                alt="Inventory Management"
              />
            </div>
            <div className="cards-text">
              <h3>1. Inventory Management</h3>
              <p>Never run out of stock. Get instant alerts when products go below minimum quantity.</p>
            </div>
          </div>

           <div className="cards">
            <div className="cards-img">
              <img
                loading="lazy"
                src="/Customer-management-img.png"
                alt="Customer Management"
              />
            </div>
            <div className="cards-text">
              <h3>2. Customer Management</h3>
              <p>Know your best customers. Track purchases, give automatic discounts, build loyalty.</p>
            </div>
          </div>

           <div className="cards">
            <div className="cards-img">
              <img
                loading="lazy"
                src="/Whatsapp-billing-img.png"
                alt="WhatsApp Billing"
              />
            </div>
            <div className="cards-text">
              <h3>3. WhatsApp Billing</h3>
              <p>Generate and send invoices or payment requests directly to your customers' WhatsApp with a single click.</p>
            </div>
          </div>
          
          <div className="cards">
            <div className="cards-img">
              <img
                loading="lazy"
                src="/Membership-management-img.png"
                alt="Membership Tracking"
              />
            </div>
            <div className="cards-text">
              <h3>4. Membership Tracking</h3>
              <p>Automatically notify members before their plans end to guarantee uninterrupted service.</p>
            </div>
          </div>
          <div className="cards">
            <div className="cards-img">
              <img
                loading="lazy"
                src="/Employee-management-img.png"
                alt="Employee Management"
              />
            </div>
            
            <div className="cards-text">
              <h3>5. Employee Management</h3>
              <p>Track salaries, payment dates and staff details all in one clean dashboard.</p>
            </div>
          </div>

          <div className="cards">
            <div className="cards-img">
              <img
                loading="lazy"
                src="/smarts-alerts-img.png"
                alt="Smart Alerts"
              />
            </div>
            <div className="cards-text">
              <h3>6. Smart Alerts</h3>
              <p>Low stock, expiring memberships, pending payments — all alerts in one place.</p>
            </div>
          </div>
        </div>
      </section>


      <section className="photo-stats" ref={photoStatsRef}>
        <div className="photo-stats-bg-wrap" ref={photoStatsBgRef}>
          <img
            className="photo-stats-bg"
            src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className="photo-stats-overlay" />
        <div className="stats-container">
         
          <div className="stats-hero">
            <h1>Spend less time managing. More time growing.</h1>
            <p>
              From inventory and customer management to memberships and WhatsApp
              billing — Opulit helps you run daily operations without the chaos of
              multiple tools.
            </p>
          </div>
          <div className="stats-divider" />
          <div className="stats">
            <div className="stats-item">
              <span className="stats-value">6</span>
              <span className="stats-label">Business tools</span>
            </div>
            <div className="stats-item">
              <span className="stats-value">24/7</span>
              <span className="stats-label">Smart tracking &amp; alerts</span>
            </div>
            <div className="stats-item">
              <span className="stats-value">1 Click</span>
              <span className="stats-label">WhatsApp billing</span>
            </div>
            <div className="stats-item">
              <span className="stats-value">100%</span>
              <span className="stats-label">Business organized in one place</span>
            </div>
          </div>
        </div>
      </section>
      <section className="whos-for">

              <ScrollingMarquee />
      </section>

      <section className="business-control" aria-labelledby="business-control-title">
        <div className="business-control-image" aria-hidden="true" />
        <div className="business-control-shade" aria-hidden="true" />
        <div className="business-control-content">
          <p className="business-control-eyebrow">WORK YOUR WAY</p>
          <h2 id="business-control-title">Your business. Your rules. Choose how hands-on you want to be.</h2>
          <p className="business-control-intro">Start with the control you need today, then lean on Opulit more as your business gets busier.</p>

          <div className="business-control-tabs" role="tablist" aria-label="Choose your workflow">
            {Object.entries(workflowModes).map(([key, mode]) => (
              <button
                type="button"
                key={key}
                className={workflowMode === key ? "is-active" : ""}
                role="tab"
                aria-selected={workflowMode === key}
                onClick={() => setWorkflowMode(key)}
              >
                {mode.label}{key === "automated" && <small> SOON</small>}
              </button>
            ))}
          </div>

          <p className="business-control-copy" aria-live="polite">{workflowModes[workflowMode].copy}</p>

          <div className="business-control-steps" aria-label="How Opulit keeps your work moving">
            <div><span>01</span><strong>Capture</strong><p>Keep every detail together</p></div>
            <div><span>02</span><strong>Organise</strong><p>See what needs attention</p></div>
            <div><span>03</span><strong>Act</strong><p>Handle work in less time</p></div>
            <div><span>04</span><strong>Grow</strong><p>Focus on what is next</p></div>
          </div>
        </div>
      </section>

      <section className="text-section" ref={textSectionRef}>
        <p>MADE FOR GROWING BUSINESSES</p>
        <span>Every business runs on moving parts.</span>
        <span>Opulit brings them together.</span>
        </section>

      <section className="sleep-section" ref={sleepSectionRef}>
        <div className="sleep-bg-wrap">
          <img
            className="sleep-bg"
            src="https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className="sleep-overlay" />
        <div className="sleep-content">
          <h1 className="sleep-heading">Things get handled. Even when you’re not working.</h1>
          <p className="sleep-subtext">Stay updated with smart reminders, organized records, and operations that keep moving while you focus elsewhere.</p>
        </div>
      </section>

      
      <section className="pricing" ref={pricingSectionRef}>
        <div className="pricing-header">
        <div className="pricing-heading-left">
          <h3>Pricing</h3>
          <h2>Simple pricing for growing businesses.</h2>
        </div>
        <div className="pricing-heading-right">
          <h4>Manage inventory, customers, billing, memberships, and daily operations — without expensive software or hidden fees.</h4>
        </div>
        </div>
        <div className="pricing-cards">
          <div className="pricing-card1">
              <h2>Starter</h2>
              <h3>Growth</h3>
              <h4>For growing businesses</h4>
              <div className="pricing-card1-price">
                <h1>{localPricing.format(localPricing.professional)}<span>/mo</span></h1> 
              </div>
              <h4>Perfect for small businesses getting organized.</h4>
              <hr></hr>
              <div className="pricing-text1">
                <p>✓ Inventory management</p>
                <p>✓ Customer management</p>
                <p>✓ WhatsApp billing</p>
                <p>✓ Membership tracking</p>
                <p>✓ Employee management</p>
                <p>✓ Smart alerts</p>
              </div>
              <div className="pricing-btn1">
                <a href="/signup"><button>Start free trial</button></a>
              </div>
          </div>
          <div className="pricing-card2">
              <h2>MOST POPULAR</h2>
              <h3>Scale</h3>
              <h4>For businesses ready to grow</h4>
              <div className="pricing-card2-price">
                <h1>{localPricing.format(localPricing.enterprise)}<span>/mo</span></h1> 
              </div>
              <h4>Everything in Growth, plus advanced automation.</h4>
              <hr></hr>
              <div className="pricing-text2">
                <p>✓ Everything in Growth</p>
                <p>✓ Advanced reports & analytics</p>
                <p>✓ Priority support</p>
                <p>✓ Unlimited customer records</p>
                <p>✓ Multi-staff access</p>
                <p>✓ Future AI automations</p>
              </div>
              <div className="pricing-btn2">
                <a href="/signup"><button>Start free trial</button></a>
              </div>
          </div>
        </div>
      </section>
      <section className="final-cta" ref={finalCtaRef}>
        <div className="final-overlay">
          <div className="lable-text">GET STARTED TODAY</div>
          <div className="middle-headline">Your business deserves better than paper</div>
          <div className="final-headline">Every business has a smarter way to grow. Start building yours.</div>
          <a href="/signup"><button className="final-btn">Start free trial</button></a>
          </div> 
      </section>                    

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">Opulit</div>

          <nav className="site-footer-links" aria-label="Footer">
            <a href="#terms">Terms</a>
            <a href="#privacy">Privacy</a>
          </nav>

          <div className="site-footer-copy">© 2026 Opulit</div>
        </div>
      </footer>
    </main>
  );
}

function App() {
  const location = useLocation();
  const showHeader = location.pathname !== '/signup' && location.pathname !== '/login';

  useEffect(() => {
    const pageTitles = {
      '/': 'Opulit | Smart Business Management Platform',
      '/features': 'Features | Opulit',
      '/pricing': 'Pricing Plans | Opulit',
      '/contact': 'Contact Us | Opulit',
      '/login': 'Sign In | Opulit',
      '/signup': 'Create Account | Opulit',
    };

    document.title = pageTitles[location.pathname] || 'Opulit | Business Software for Growing Teams';
    // Ensure we start at the top when navigating client-side.
    try {
      if (window.lenis && typeof window.lenis.scrollTo === 'function') {
        // Lenis is used for smooth scrolling; use its API to jump to top immediately.
        window.lenis.scrollTo(0, { immediate: true })
      } else if (typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
      // Refresh GSAP ScrollTrigger to account for the new scroll position
      if (gsap && gsap.core && gsap.core.globals && gsap.core.globals().ScrollTrigger) {
        // If ScrollTrigger is present, refresh it.
        // Prefer calling the registered ScrollTrigger directly from import.
      }
      if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.refresh) {
        ScrollTrigger.refresh()
      }
    } catch (e) {
      // ignore errors
    }
  }, [location.pathname]);

  return (
    <div>
      {showHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/contact" element={<Contact/>} />

        {/* 🚨 THE SAFETY NET: Matches absolutely any URL that isn't defined above */}
        <Route
          path="*"
          element={
            <div style={{ padding: "40px", textAlign: "center" }}>
              <h2>🚧 Page Under Construction</h2>
              <p>
                We haven't built this page yet! Use the header to go back home.
              </p>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
