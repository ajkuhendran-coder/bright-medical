import Hero from '../components/sections/Hero'
import TrustBar from '../components/sections/TrustBar'
import PainPoints from '../components/sections/PainPoints'
import Approach from '../components/sections/Approach'
import Testimonials from '../components/sections/Testimonials'
import Programs from '../components/sections/Programs'
import Comparison from '../components/sections/Comparison'
import Urgency from '../components/sections/Urgency'
import Timeline from '../components/sections/Timeline'
import Metrics from '../components/sections/Metrics'
import AboutMe from '../components/sections/AboutMe'
import NotForYou from '../components/sections/NotForYou'
import FAQ from '../components/sections/FAQ'
import Contact from '../components/sections/Contact'

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <PainPoints />
      <Approach />
      <Testimonials />
      <Programs />
      <Comparison />
      <Urgency />
      <Timeline />
      <Metrics />
      <AboutMe />
      <NotForYou />
      <FAQ />
      <Contact />
    </>
  )
}
