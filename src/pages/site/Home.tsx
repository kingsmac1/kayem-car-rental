import { Hero } from '@/components/site/hero/Hero'
import { FleetSlider } from '@/components/site/home/FleetSlider'
import { Manifesto } from '@/components/site/home/Manifesto'
import { HowItWorks } from '@/components/site/home/HowItWorks'
import { Services } from '@/components/site/home/Services'
import { PeakDates } from '@/components/site/home/PeakDates'
import { Marquee } from '@/components/site/home/Marquee'
import { CtaBlocks, FaqSection, Testimonials } from '@/components/site/home/Closing'
import { Deferred } from '@/components/site/Deferred'

export default function Home() {
  return (
    <>
      <Hero />
      <Deferred minHeight={700}>
        <FleetSlider />
      </Deferred>
      <Deferred minHeight={1200}>
        <Manifesto />
      </Deferred>
      <Deferred minHeight={900} id="how-it-works">
        <HowItWorks />
      </Deferred>
      <Deferred minHeight={1000} id="services">
        <Services />
      </Deferred>
      <Deferred minHeight={800}>
        <PeakDates />
      </Deferred>
      <Deferred minHeight={300}>
        <Marquee />
      </Deferred>
      <Deferred minHeight={600}>
        <Testimonials />
      </Deferred>
      <Deferred minHeight={500}>
        <CtaBlocks />
      </Deferred>
      <Deferred minHeight={700}>
        <FaqSection />
      </Deferred>
    </>
  )
}
