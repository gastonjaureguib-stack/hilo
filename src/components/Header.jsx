import { Link } from "react-router-dom";

import "../styles/header.css";

const Header = () => {
  return (
    <header>
      <div>
        <Link to="/">
          <img
            src="/logohilo.png"
            alt="Hilo - Seguí tus clases"
          />
        </Link>
      </div>

      <nav>
        <Link to="/">Inicio</Link>
        <Link to="/clase">En clase</Link>
        <Link to="/taller">Taller</Link>
        <Link to="/apuntes">Apuntes</Link>
      </nav>
    </header>
  );
};

export default Header;