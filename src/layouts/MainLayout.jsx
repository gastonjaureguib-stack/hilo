import Header from "../components/Header.jsx";

const MainLayout = ({ children }) => {
  return (
    <div>
      <Header />

      <main>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;