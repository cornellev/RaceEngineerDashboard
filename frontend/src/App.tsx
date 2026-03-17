import Header from "./components/Header";
import Home from "./pages/Home";
import Data from "./pages/Data";
import RaceGPT from "./pages/RaceGPT";
import SideBar from "./components/SideBar";

import socket from "./utils/Socket";
import type { SocketData } from "./utils/Socket";

import { useState, useEffect } from "react";

function App() {
  const [page, setPage] = useState("data");
  const [sideBar, setSideBar] = useState(false);
  const [data, setData] = useState<SocketData[]>(() => socket.getData());

  const getPageComponent = () => {
    switch (page) {
      case "home":
        return <Home />;
      case "data":
        return <Data data={data} />;
      case "racegpt":
        return <Data data={data} />;
      default:
        return <Data data={data} />;
    }
  };

  useEffect(() => {
    socket.connect();

    const unsubscribe = socket.subscribe(() => {
      setData([...socket.getData()]);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Header setPage={setPage} setSideBar={setSideBar} sideBar={sideBar} />
      <div className="w-screen h-[9vh] mx-auto px-4 sm:px-6 lg:px-8" />
      <SideBar open={sideBar} />
      <main
        className={`${sideBar ? "w-[80%]" : "w-screen"} h-full transition-all duration-300 ease-in-out m-0 p-0`}
      >
        {getPageComponent()}
      </main>
    </>
  );
}

export default App;
