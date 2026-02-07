import Header from "./components/Header";
import Home from "./pages/Home";
import Data from "./pages/Data";
import RaceGPT from "./pages/RaceGPT";
import SideBar from "./components/SideBar";

import { useState } from "react";

function App() {
  const [page, setPage] = useState("home");
  const [sideBar, setSideBar] = useState(false);

  const getPageComponent = () => {
    switch (page) {
      case "home":
        return <Home />;
      case "data":
        return <Data />;
      case "racegpt":
        return <RaceGPT />;
      default:
        return <Home />;
    }
  };

  return (
    <>
      <Header setPage={setPage} setSideBar={setSideBar} sideBar={sideBar} />
      <SideBar open={sideBar} />
      {getPageComponent()}
    </>
  );
}

export default App;
