import { useHilo } from "../context/HiloContext.jsx";
import TallerClase from "../components/TallerClase.jsx";

const Taller = () => {
  const { hiloActual } = useHilo();

  return (
    <TallerClase
      clase={hiloActual}
    />
  );
};

export default Taller;