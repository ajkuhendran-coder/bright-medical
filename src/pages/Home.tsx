import Hero from '../components/sections/Hero'
import TrustBar from '../components/sections/TrustBar'
import PainPoints from '../components/sections/PainPoints'
import Approach from '../components/sections/Approach'
import Programs from '../components/sections/Programs'
import Comparison from '../components/sections/Comparison'
import Timeline from '../components/sections/Timeline'
import Metrics from '../components/sections/Metrics'
import ProcessSteps from '../components/sections/ProcessSteps'
import AboutMe from '../components/sections/AboutMe'
import Testimonials from '../components/sections/Testimonials'
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
      <Programs />
      <Comparison />
      <Timeline />
      <Metrics />
      <ProcessSteps />
      <AboutMe />
      <Testimonials />
      <NotForYou />
      <FAQ />
      <Contact />
    </>
  )
}
