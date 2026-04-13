import './App.css'
import Grain from './Grain'
import PlanetDisk from './PlanetDisk'
import HaloController from './HaloController'

function App() {
  return (
    <>
      {/* ── Animated grain overlay ── */}
      <Grain />

      {/* ── Atmospheric background ── */}
      <div className="bg">
        <div className="bg__blob--1" />
        <div className="bg__blob--2" />
        <div className="bg__blob--3" />
        {/* ── Offset accent lines ── */}
        <div className="bg__line bg__line--1" />
        <div className="bg__line bg__line--2" />
        <div className="bg__line bg__line--3" />
        <div className="bg__line bg__line--4" />
      </div>

      <div className="page">
        <div className="content">
          {/* ── Portal ── */}
          <div className="portal">
            <HaloController />
            <div className="portal__layer portal__glow" />
            <div className="portal__layer portal__wisps" />
            <div className="portal__layer portal__swirl-outer" />
            <div className="portal__layer portal__swirl-mid" />
            <div className="portal__layer portal__swirl-inner" />
            <div className="portal__layer portal__corona" />
            <div className="portal__layer portal__corona-flare" />
            <div className="portal__layer portal__horizon" />
            <PlanetDisk />
            <h1 className="title">HYPERION</h1>
          </div>
        </div>

        {/* ── Contact pinned to bottom ── */}
        <div className="contact">
          <a href="mailto:contact@hyperion.com">contact@hyperion.com</a>
          <span className="sep">&#9679;</span>
          <a
            href="https://linkedin.com/company/hyperion"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </>
  )
}

export default App
