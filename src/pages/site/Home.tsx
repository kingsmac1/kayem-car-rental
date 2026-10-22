import { Hero } from '@/components/site/hero/Hero'
import { FleetSlider } from '@/components/site/home/FleetSlider'
import { Manifesto } from '@/components/site/home/Manifesto'
import { HowItWorks } from '@/components/site/home/HowItWorks'
import { Services } from '@/components/site/home/Services'
import { PeakDates } from '@/components/site/home/PeakDates'
import { Marquee } from '@/components/site/home/Marquee'
import { CtaBlocks, FaqSection, Testimonials } from '@/components/site/home/Closing'

export default function Home() {
  return (
    <>
      <Hero />
      <FleetSlider />
      <Manifesto />
      <HowItWorks />
      <Services />
      <PeakDates />
      <Marquee />
      <Testimonials />
      <CtaBlocks />
      <FaqSection />
    </>
  )
}
