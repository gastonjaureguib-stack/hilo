import { Link } from "react-router-dom";

import "../styles/home.css";

const Home = () => {
  return (
    <section className="home">
      <div className="home-intro">
        <span className="home-eyebrow">
          Tu espacio de estudio
        </span>

        <h1>¿Qué vas a hacer hoy?</h1>

        <p>
          Seguí una clase en vivo o retomá lo que aprendiste
          para seguir trabajando a tu ritmo.
        </p>
      </div>

      <div className="home-actions">

        {/* CLASE EN VIVO */}

        <Link
          to="/clase"
          className="home-card home-card-live"
        >
          <div className="home-card-icon">
            <span className="live-dot"></span>
          </div>

          <div>
            <span className="home-card-label">
              EN VIVO
            </span>

            <h2>Entrar a una clase</h2>

            <p>
              Transcribí la clase, marcá momentos importantes
              y recuperá el hilo cuando algo no quede claro.
            </p>

            <span className="home-card-link">
              Empezar clase →
            </span>
          </div>
        </Link>


        {/* TALLER */}

        <Link
          to="/taller"
          className="home-card"
        >
          <div className="home-card-icon">
            📖
          </div>

          <div>
            <span className="home-card-label">
              TALLER
            </span>

            <h2>Seguir estudiando</h2>

            <p>
              Volvé a tus clases, revisá transcripciones,
              preguntas, apuntes y momentos importantes.
            </p>

            <span className="home-card-link">
              Abrir Taller →
            </span>
          </div>
        </Link>

      </div>
    </section>
  );
};

export default Home;