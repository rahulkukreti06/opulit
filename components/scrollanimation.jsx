import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../src/App.css";
import "../css/IndustrySlider.css";

gsap.registerPlugin(ScrollTrigger);

const row1 = [
  {
    title: "GYMS",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800",
  },
  {
    title: "SALONS",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800",
  },
  {
    title: "RETAIL",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
  },
  {
    title: "CLINICS",
    image:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
  },
  {
    title: "HOTELS",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
  },
  {
    title: "CAFES",
    image:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
  },
  {
    title: "PHARMACIES",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800",
  },
  {
    title: "STUDIOS",
    image:
      "https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=800",
  },
  {
    title: "BAKERIES",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
  },
  {
    title: "WORKSHOPS",
    image:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800",
  },
  {
    title: "AGENCIES",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
  },
  {
    title: "CONSULTANTS",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800",
  },
  {
    title: "VETERINARY",
    image:
      "https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=800",
  },
  {
    title: "DENTAL",
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800",
  },
  {
    title: "OPTOMETRY",
    image:
      "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800",
  },
  {
    title: "WELLNESS",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800",
  },
];

const row2 = [
  {
    title: "RESTAURANTS",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
  },
  {
    title: "SPA",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800",
  },
  {
    title: "FITNESS",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800",
  },
  {
    title: "STORES",
    image:
      "https://images.unsplash.com/photo-1521335629791-ce4aec67dd53?w=800",
  },
  {
    title: "EDUCATION",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
  },
  {
    title: "EVENTS",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
  },
  {
    title: "REALTY",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
  },
  {
    title: "AUTOMOTIVE",
    image:
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800",
  },
  {
    title: "BEAUTY",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
  },
  {
    title: "LEGAL",
    image:
      "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800",
  },
  {
    title: "ACCOUNTING",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
  },
  {
    title: "MARKETING",
    image:
      "https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=800",
  },
  {
    title: "LOGISTICS",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
  },
  {
    title: "CONSTRUCTION",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
  },
  {
    title: "TECH",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800",
  },
  {
    title: "NONPROFIT",
    image:
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800",
  },
];

const IndustrySlider = () => {
  const sectionRef = useRef(null);
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        row1Ref.current,
        {
          xPercent: -18,
        },
        {
          xPercent: 18,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            end: "bottom top",
            scrub: 2.5,
          },
        }
      );

      gsap.fromTo(
        row2Ref.current,
        {
          xPercent: 18,
        },
        {
          xPercent: -18,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            end: "bottom top",
            scrub: 2.5,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Add draggable functionality
  useEffect(() => {
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    if (!row1 || !row2) return;

    const makeDraggable = (element) => {
      let isDragging = false;
      let startX = 0;
      let currentTransform = 0;

      const handleMouseDown = (e) => {
        isDragging = true;
        startX = e.pageX;
        const style = window.getComputedStyle(element);
        const matrix = new WebKitCSSMatrix(style.transform);
        currentTransform = matrix.m41;
        element.style.cursor = 'grabbing';
      };

      const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX;
        const walk = (x - startX) * 2;
        gsap.to(element, {
          x: currentTransform + walk,
          duration: 0.1,
          ease: "none",
        });
      };

      const handleMouseUp = () => {
        isDragging = false;
        element.style.cursor = 'grab';
      };

      const handleTouchStart = (e) => {
        isDragging = true;
        startX = e.touches[0].pageX;
        const style = window.getComputedStyle(element);
        const matrix = new WebKitCSSMatrix(style.transform);
        currentTransform = matrix.m41;
      };

      const handleTouchMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.touches[0].pageX;
        const walk = (x - startX) * 2;
        gsap.to(element, {
          x: currentTransform + walk,
          duration: 0.1,
          ease: "none",
        });
      };

      const handleTouchEnd = () => {
        isDragging = false;
      };

      element.style.cursor = 'grab';
      element.addEventListener('mousedown', handleMouseDown);
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseup', handleMouseUp);
      element.addEventListener('mouseleave', handleMouseUp);
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchmove', handleTouchMove);
      element.addEventListener('touchend', handleTouchEnd);

      return () => {
        element.removeEventListener('mousedown', handleMouseDown);
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseup', handleMouseUp);
        element.removeEventListener('mouseleave', handleMouseUp);
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    };

    const cleanup1 = makeDraggable(row1);
    const cleanup2 = makeDraggable(row2);

    return () => {
      if (cleanup1) cleanup1();
      if (cleanup2) cleanup2();
    };
  }, []);

  return (
    <section className="industry-section" ref={sectionRef}>
      <div className="whos-for">
        <h1>Built for the businesses that keep moving.</h1>
        <p>Everything works together in the background, so your day runs smoother.</p>
      </div>

      <div className="slider-wrapper">
        <div className="industry-row row-1" ref={row1Ref}>
          {row1.map((item, index) => (
            <div className="industry-card" key={index}>
              <img src={item.image} alt={item.title} />
              <div className="overlay" />
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>

        <div className="industry-row row-2" ref={row2Ref}>
          {row2.map((item, index) => (
            <div className="industry-card" key={index}>
              <img src={item.image} alt={item.title} />
              <div className="overlay" />
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustrySlider;